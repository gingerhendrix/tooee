/**
 * Mount one vendored demo: termcn's ThemeProvider with the bridged Tooee
 * theme, the key gate, and an error boundary. Each demo is keyed by name,
 * so switching demos unmounts the old one and stops its timers.
 */

import { useTheme } from "@tooee/themes";
import { createElement, useMemo } from "react";
import type { ComponentType, ReactNode } from "react";

import { useTermcn } from "../context.js";
import { ResourceMessage } from "../detail/resource-message.js";
import { useResource } from "../use-resource.js";
import { DemoErrorBoundary, DemoFailure } from "./demo-error-boundary.js";
import { GatedKeyboard } from "./gated-keyboard.js";
import { isInteractExitKey } from "./interact-mode.js";
import { toTermcnTheme } from "./theme-bridge.js";
import { loadDemo, loadThemeProvider } from "./vendor.js";
import type { TermcnThemeProvider } from "./vendor.js";

export interface DemoHostProps {
  demo: string;
  interacting: boolean;
}

interface LoadedDemo {
  Provider: TermcnThemeProvider;
  Demo: ComponentType;
}

export const DemoHost = function DemoHost({ demo, interacting }: DemoHostProps): ReactNode {
  const { theme, name } = useTheme();
  const { vendorDirectory } = useTermcn();
  const termcnTheme = useMemo(() => toTermcnTheme(name, theme), [name, theme]);

  const { resource } = useResource(demo, async (): Promise<LoadedDemo> => {
    const [Provider, Demo] = await Promise.all([
      loadThemeProvider(vendorDirectory),
      loadDemo(demo, vendorDirectory),
    ]);

    return { Demo, Provider };
  });

  if (resource.status === "error") {
    return <DemoFailure demo={demo} message={resource.error} />;
  }

  if (resource.status !== "ready") {
    return <ResourceMessage resource={resource} what={`demo ${demo}`} />;
  }

  const { Demo, Provider } = resource.value;

  return (
    <DemoErrorBoundary demo={demo}>
      <GatedKeyboard open={interacting} isReserved={isInteractExitKey}>
        {createElement(Provider, { theme: termcnTheme }, createElement(Demo))}
      </GatedKeyboard>
    </DemoErrorBoundary>
  );
};
