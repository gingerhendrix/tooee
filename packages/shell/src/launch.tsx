import * as fs from "node:fs";
import * as tty from "node:tty";
import type { ReactNode } from "react";
import { createCliRenderer } from "@opentui/core";
import type { CliRenderer, CliRendererConfig } from "@opentui/core";
import { createRoot } from "@opentui/react";
import type { Root } from "@opentui/react";
import { TooeeProvider } from "./provider.js";
import type { TooeeProviderProps } from "./provider.js";

export type TooeeProviderOptions = Omit<TooeeProviderProps, "children">;

export interface MountTooeeOptions {
  /** Options for the Tooee provider tree mounted around `node`. */
  provider?: TooeeProviderOptions;
}

/** A React tree mounted into a renderer owned by the caller. */
export interface TooeeMount {
  readonly renderer: CliRenderer;
  readonly root: Root;
  readonly ownership: "external";
  readonly unmounted: boolean;
  /** Unmount the React tree. Never destroys the externally owned renderer. */
  unmount: () => void;
}

export type CliStdinPolicy = "process" | "tty-if-piped";
export type CliStdoutPolicy = "process" | "tty-if-redirected";

export interface LaunchCliOptions {
  exitOnCtrlC?: boolean;
  /** Preferred provider options. */
  provider?: TooeeProviderOptions;
  /** Additional OpenTUI renderer options. */
  renderer?: Omit<CliRendererConfig, "exitOnCtrlC">;
  /** Select keyboard input without consuming piped process stdin. */
  stdinPolicy?: CliStdinPolicy;
  /** Keep renderer output visible without mixing it into redirected process stdout. */
  stdoutPolicy?: CliStdoutPolicy;
  /** Install local terminal end/close listeners. Defaults to true. */
  terminalHealth?: boolean;
}

/** A locally owned renderer session returned by `launchCli`. */
export interface TooeeSessionHandle {
  readonly renderer: CliRenderer;
  readonly root: Root;
  readonly ownership: "local";
  readonly destroyed: boolean;
  /** Unmount the React tree without destroying the renderer. */
  unmount: () => void;
  /** Idempotently unmount and destroy every locally owned resource. */
  destroy: () => void;
}

export interface CliSessionController<T> {
  resolve: (value: T) => void;
  cancel: () => void;
}

export type CliSessionRender<T> = (session: CliSessionController<T>) => ReactNode;

interface SessionHandleRef {
  current: TooeeSessionHandle | undefined;
}

export interface TerminalHealthGuardOptions {
  /** Called once when renderer stdin ends or closes. */
  onTerminalEnd?: () => void;
  /** Destroy the renderer before calling `onTerminalEnd`. Defaults to true. */
  destroyRenderer?: boolean;
  /** Exit the process after cleanup. Defaults to true for compatibility. */
  exitProcess?: boolean;
}

/**
 * Guard a locally owned renderer from a dead terminal and return an idempotent
 * function that removes every listener installed by the guard.
 */
export const guardTerminalHealth = function guardTerminalHealth(
  renderer: CliRenderer,
  options: TerminalHealthGuardOptions = {},
): () => void {
  let handled = false;
  let disposed = false;
  const stdin = renderer.stdin ?? process.stdin;
  const lifecycle = {
    dispose: () => {
      // Replaced before terminal listeners are attached.
    },
  };

  const onTerminalEnd = () => {
    if (handled) {
      return;
    }
    handled = true;
    lifecycle.dispose();

    if (options.destroyRenderer ?? true) {
      try {
        renderer.destroy();
      } catch {
        // A dead PTY may make terminal restoration fail.
      }
    }
    options.onTerminalEnd?.();
    if (options.exitProcess ?? true) {
      process.exit(0);
    }
  };

  const dispose = () => {
    if (disposed) {
      return;
    }
    disposed = true;
    stdin.removeListener("end", onTerminalEnd);
    stdin.removeListener("close", onTerminalEnd);
    renderer.removeListener("destroy", dispose);
  };
  lifecycle.dispose = dispose;

  stdin.on("end", onTerminalEnd);
  stdin.on("close", onTerminalEnd);
  renderer.once("destroy", dispose);
  return dispose;
};

/** Mount Tooee into a renderer whose lifetime remains owned by the caller. */
export const mountTooee = function mountTooee(
  renderer: CliRenderer,
  node: ReactNode,
  options: MountTooeeOptions = {},
): TooeeMount {
  const root = createRoot(renderer);
  let unmounted = false;

  const markRendererDestroyed = () => {
    unmounted = true;
  };
  renderer.once("destroy", markRendererDestroyed);

  const unmount = () => {
    if (unmounted) {
      return;
    }
    unmounted = true;
    renderer.removeListener("destroy", markRendererDestroyed);
    root.unmount();
  };

  try {
    root.render(<TooeeProvider {...options.provider}>{node}</TooeeProvider>);
  } catch (error) {
    try {
      unmount();
    } catch {
      // Preserve the original render failure.
    }
    throw error;
  }

  return {
    ownership: "external",
    renderer,
    root,
    unmount,
    get unmounted() {
      return unmounted;
    },
  };
};

const openTtyInput = function openTtyInput(policy: CliStdinPolicy): tty.ReadStream | undefined {
  if (policy !== "tty-if-piped" || process.stdin.isTTY) {
    return undefined;
  }
  const fd = fs.openSync("/dev/tty", "r");
  try {
    return new tty.ReadStream(fd);
  } catch (error) {
    fs.closeSync(fd);
    throw error;
  }
};

const openTtyOutput = function openTtyOutput(policy: CliStdoutPolicy): tty.WriteStream | undefined {
  if (policy !== "tty-if-redirected" || process.stdout.isTTY) {
    return undefined;
  }
  const fd = fs.openSync("/dev/tty", "w");
  try {
    return new tty.WriteStream(fd);
  } catch (error) {
    fs.closeSync(fd);
    throw error;
  }
};

const noop: () => void = () => {
  // Default health-guard remover until a guard is installed.
};

/** Create, mount, and return a locally owned Tooee renderer session. */
export const launchCli = async function launchCli(
  node: ReactNode,
  options: LaunchCliOptions = {},
): Promise<TooeeSessionHandle> {
  let ttyInput: tty.ReadStream | undefined;
  let ttyOutput: tty.WriteStream | undefined;
  let renderer: CliRenderer | undefined;

  try {
    if (options.renderer?.stdin === undefined) {
      ttyInput = openTtyInput(options.stdinPolicy ?? "process");
    }
    if (options.renderer?.stdout === undefined) {
      ttyOutput = openTtyOutput(options.stdoutPolicy ?? "process");
    }
    const rendererOptions: CliRendererConfig = {
      ...options.renderer,
      exitOnCtrlC: options.exitOnCtrlC ?? true,
    };
    if (ttyInput !== undefined) {
      rendererOptions.stdin = ttyInput;
    }
    if (ttyOutput !== undefined) {
      rendererOptions.stdout = ttyOutput;
    }
    renderer = await createCliRenderer(rendererOptions);
  } catch (error) {
    ttyInput?.destroy();
    ttyOutput?.destroy();
    throw error;
  }

  let mount: TooeeMount;
  try {
    mount = mountTooee(renderer, node, { provider: options.provider });
  } catch (error) {
    try {
      renderer.destroy();
    } finally {
      ttyInput?.destroy();
      ttyOutput?.destroy();
    }
    throw error;
  }

  // Every renderer-originated shutdown path must release the React tree owned by this session.
  const destroyRenderer = renderer.destroy.bind(renderer);
  renderer.destroy = () => {
    try {
      mount.unmount();
    } finally {
      destroyRenderer();
    }
  };

  let destroyed = false;
  let removeHealthGuard = noop;

  const releaseOwnedResources = () => {
    if (destroyed) {
      return;
    }
    destroyed = true;
    removeHealthGuard();
    ttyInput?.destroy();
    ttyOutput?.destroy();
  };

  const onRendererDestroyed = () => {
    releaseOwnedResources();
  };
  renderer.once("destroy", onRendererDestroyed);

  const handle: TooeeSessionHandle = {
    destroy() {
      if (destroyed) {
        return;
      }
      try {
        mount.unmount();
      } finally {
        try {
          renderer.destroy();
        } finally {
          releaseOwnedResources();
        }
      }
    },
    get destroyed() {
      return destroyed;
    },
    ownership: "local",
    renderer,
    root: mount.root,
    unmount: mount.unmount,
  };

  if (options.terminalHealth ?? true) {
    removeHealthGuard = guardTerminalHealth(renderer, {
      onTerminalEnd: releaseOwnedResources,
    });
  }

  return handle;
};

/** Run one locally owned CLI session and settle its result at most once. */
export const runCliSession = async function runCliSession<T>(
  render: CliSessionRender<T>,
  options: LaunchCliOptions = {},
): Promise<T | null> {
  const { promise, resolve } = Promise.withResolvers<T | null>();
  let settled = false;
  const handle: SessionHandleRef = { current: undefined };

  const settle = (result: T | null) => {
    if (settled) {
      return;
    }
    settled = true;
    try {
      handle.current?.destroy();
    } finally {
      resolve(result);
    }
  };

  const node = render({
    cancel: () => {
      settle(null);
    },
    resolve: (value) => {
      settle(value);
    },
  });

  if (settled) {
    return await promise;
  }

  handle.current = await launchCli(node, options);
  handle.current.renderer.once("destroy", () => {
    settle(null);
  });
  if (settled) {
    handle.current.destroy();
  }

  return await promise;
};
