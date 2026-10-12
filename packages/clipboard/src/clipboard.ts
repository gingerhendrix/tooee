import { platform, release, tmpdir } from "node:os";
import path from "node:path";

import { $ } from "bun";

export interface ClipboardContent {
  data: string;
  mime: string;
}

const readLinuxClipboardText = async function readLinuxClipboardText(): Promise<
  string | undefined
> {
  if ((process.env.WAYLAND_DISPLAY?.length ?? 0) > 0 && (Bun.which("wl-paste")?.length ?? 0) > 0) {
    const result = await $`wl-paste`.nothrow().quiet().text();

    return result || undefined;
  }

  if ((Bun.which("xclip")?.length ?? 0) > 0) {
    const result = await $`xclip -selection clipboard -o`.nothrow().quiet().text();

    return result || undefined;
  }

  if ((Bun.which("xsel")?.length ?? 0) > 0) {
    const result = await $`xsel --clipboard --output`.nothrow().quiet().text();

    return result || undefined;
  }

  return undefined;
};

export const readClipboardText = async function readClipboardText(): Promise<string | undefined> {
  const os = platform();

  if (os === "darwin") {
    const result = await $`pbpaste`.nothrow().quiet().text();

    return result || undefined;
  }

  if (os === "linux") {
    return await readLinuxClipboardText();
  }

  if (os === "win32") {
    const result = await $`powershell -command "Get-Clipboard"`.nothrow().quiet().text();

    return result || undefined;
  }

  return undefined;
};

const readMacClipboardImage = async function readMacClipboardImage(): Promise<
  ClipboardContent | undefined
> {
  const tmpfile = path.join(tmpdir(), "tooee-clipboard.png");

  try {
    await $`osascript -e 'set imageData to the clipboard as "PNGf"' -e 'set fileRef to open for access POSIX file "${tmpfile}" with write permission' -e 'set eof fileRef to 0' -e 'write imageData to fileRef' -e 'close access fileRef'`
      .nothrow()
      .quiet();
    const buffer = await Bun.file(tmpfile).arrayBuffer();

    if (buffer.byteLength > 0) {
      return { data: Buffer.from(buffer).toString("base64"), mime: "image/png" };
    }
  } catch {
    // Image read failed, try text below
  } finally {
    await $`rm -f "${tmpfile}"`.nothrow().quiet();
  }

  return undefined;
};

const readWindowsClipboardImage = async function readWindowsClipboardImage(): Promise<
  ClipboardContent | undefined
> {
  const script =
    "Add-Type -AssemblyName System.Windows.Forms; $img = [System.Windows.Forms.Clipboard]::GetImage(); if ($img) { $ms = New-Object System.IO.MemoryStream; $img.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png); [System.Convert]::ToBase64String($ms.ToArray()) }";

  const base64 = await $`powershell.exe -command "${script}"`.nothrow().text();

  if (base64) {
    const imageBuffer = Buffer.from(base64.trim(), "base64");

    if (imageBuffer.length > 0) {
      return { data: imageBuffer.toString("base64"), mime: "image/png" };
    }
  }

  return undefined;
};

const readLinuxClipboardImage = async function readLinuxClipboardImage(): Promise<
  ClipboardContent | undefined
> {
  if ((process.env.WAYLAND_DISPLAY?.length ?? 0) > 0 && (Bun.which("wl-paste")?.length ?? 0) > 0) {
    const wayland = await $`wl-paste -t image/png`.nothrow().arrayBuffer();

    if (wayland.byteLength > 0) {
      return { data: Buffer.from(wayland).toString("base64"), mime: "image/png" };
    }
  }

  if ((Bun.which("xclip")?.length ?? 0) > 0) {
    const x11 = await $`xclip -selection clipboard -t image/png -o`.nothrow().arrayBuffer();

    if (x11.byteLength > 0) {
      return { data: Buffer.from(x11).toString("base64"), mime: "image/png" };
    }
  }

  return undefined;
};

export const readClipboard = async function readClipboard(): Promise<ClipboardContent | undefined> {
  const os = platform();

  if (os === "darwin") {
    const image = await readMacClipboardImage();

    if (image) {
      return image;
    }
  }

  if (os === "win32" || release().includes("WSL")) {
    const image = await readWindowsClipboardImage();

    if (image) {
      return image;
    }
  }

  if (os === "linux") {
    const image = await readLinuxClipboardImage();

    if (image) {
      return image;
    }
  }

  const text = await readClipboardText();

  if (text !== undefined && text !== "") {
    return { data: text, mime: "text/plain" };
  }

  return undefined;
};

export const readPrimaryText = async function readPrimaryText(): Promise<string | undefined> {
  const os = platform();

  if (os === "linux") {
    if (
      (process.env.WAYLAND_DISPLAY?.length ?? 0) > 0 &&
      (Bun.which("wl-paste")?.length ?? 0) > 0
    ) {
      const result = await $`wl-paste --primary`.nothrow().quiet().text();

      return result || undefined;
    }

    if ((Bun.which("xclip")?.length ?? 0) > 0) {
      const result = await $`xclip -selection primary -o`.nothrow().quiet().text();

      return result || undefined;
    }

    if ((Bun.which("xsel")?.length ?? 0) > 0) {
      const result = await $`xsel --primary --output`.nothrow().quiet().text();

      return result || undefined;
    }
  }

  // macOS/Windows don't have PRIMARY selection — fall back to clipboard
  return await readClipboardText();
};

type CopyMethod = (text: string) => Promise<boolean>;

let copyMethod: CopyMethod | null = null;

const pipeToCommand = async function pipeToCommand(
  command: string[],
  text: string
): Promise<boolean> {
  const proc = Bun.spawn(command, {
    stderr: "ignore",
    stdin: "pipe",
    stdout: "ignore",
  });

  await proc.stdin.write(text);
  await proc.stdin.end();
  const exitCode = await proc.exited.catch(() => null);

  return exitCode === 0;
};

const findLinuxCopyCommand = function findLinuxCopyCommand(): string[] | undefined {
  if ((process.env.WAYLAND_DISPLAY?.length ?? 0) > 0 && (Bun.which("wl-copy")?.length ?? 0) > 0) {
    return ["wl-copy"];
  }

  if ((Bun.which("xclip")?.length ?? 0) > 0) {
    return ["xclip", "-selection", "clipboard"];
  }

  if ((Bun.which("xsel")?.length ?? 0) > 0) {
    return ["xsel", "--clipboard", "--input"];
  }

  return undefined;
};

const getCopyMethod = function getCopyMethod(): CopyMethod {
  if (copyMethod) {
    return copyMethod;
  }

  const os = platform();

  if (os === "darwin" && (Bun.which("osascript")?.length ?? 0) > 0) {
    copyMethod = async (text: string) => {
      const escaped = text.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
      const result = await $`osascript -e 'set the clipboard to "${escaped}"'`.nothrow().quiet();

      return result.exitCode === 0;
    };

    return copyMethod;
  }

  const linuxCommand = os === "linux" ? findLinuxCopyCommand() : undefined;

  if (linuxCommand) {
    copyMethod = async (text: string) => await pipeToCommand(linuxCommand, text);

    return copyMethod;
  }

  if (os === "win32") {
    copyMethod = async (text: string) => {
      const escaped = text.replaceAll('"', '""');

      const result = await $`powershell -command "Set-Clipboard -Value \"${escaped}\""`
        .nothrow()
        .quiet();

      return result.exitCode === 0;
    };

    return copyMethod;
  }

  // No clipboard tool: report the failure so callers can tell the user.
  copyMethod = async () => await Promise.resolve(false);

  return copyMethod;
};

/**
 * Copy text to the system clipboard. Resolves `true` when a clipboard tool
 * took the text, and `false` when no tool is installed or the tool failed.
 */
export const copyToClipboard = async function copyToClipboard(text: string): Promise<boolean> {
  return await getCopyMethod()(text);
};

let primaryCopyMethod: ((text: string) => Promise<void>) | null = null;

const getPrimaryCopyMethod = function getPrimaryCopyMethod(): (text: string) => Promise<void> {
  if (primaryCopyMethod) {
    return primaryCopyMethod;
  }

  const os = platform();

  if (os === "linux") {
    if ((process.env.WAYLAND_DISPLAY?.length ?? 0) > 0 && (Bun.which("wl-copy")?.length ?? 0) > 0) {
      primaryCopyMethod = async (text: string) => {
        const proc = Bun.spawn(["wl-copy", "--primary"], {
          stderr: "ignore",
          stdin: "pipe",
          stdout: "ignore",
        });

        await proc.stdin.write(text);
        await proc.stdin.end();
        await proc.exited.catch(() => null);
      };

      return primaryCopyMethod;
    }

    if ((Bun.which("xclip")?.length ?? 0) > 0) {
      primaryCopyMethod = async (text: string) => {
        const proc = Bun.spawn(["xclip", "-selection", "primary"], {
          stderr: "ignore",
          stdin: "pipe",
          stdout: "ignore",
        });

        await proc.stdin.write(text);
        await proc.stdin.end();
        await proc.exited.catch(() => null);
      };

      return primaryCopyMethod;
    }

    if ((Bun.which("xsel")?.length ?? 0) > 0) {
      primaryCopyMethod = async (text: string) => {
        const proc = Bun.spawn(["xsel", "--primary", "--input"], {
          stderr: "ignore",
          stdin: "pipe",
          stdout: "ignore",
        });

        await proc.stdin.write(text);
        await proc.stdin.end();
        await proc.exited.catch(() => null);
      };

      return primaryCopyMethod;
    }
  }

  // macOS/Windows don't have PRIMARY selection — fall back to clipboard
  const copyToSystemClipboard = getCopyMethod();
  primaryCopyMethod = async (text: string) => {
    await copyToSystemClipboard(text);
  };

  return primaryCopyMethod;
};

export const copyToPrimary = async function copyToPrimary(text: string): Promise<void> {
  await getPrimaryCopyMethod()(text);
};
