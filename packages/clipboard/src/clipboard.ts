import { $ } from "bun";
import { platform, release, tmpdir } from "node:os";
import path from "node:path";

export interface ClipboardContent {
  data: string;
  mime: string;
}

export const readClipboardText = async function readClipboardText(): Promise<string | undefined> {
  const os = platform();

  if (os === "darwin") {
    const result = await $`pbpaste`.nothrow().quiet().text();
    return result || undefined;
  }

  if (os === "linux") {
    if (
      (process.env.WAYLAND_DISPLAY?.length ?? 0) > 0 &&
      (Bun.which("wl-paste")?.length ?? 0) > 0
    ) {
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
  }

  if (os === "win32") {
    const result = await $`powershell -command "Get-Clipboard"`.nothrow().quiet().text();
    return result || undefined;
  }

  return undefined;
};

export const readClipboard = async function readClipboard(): Promise<ClipboardContent | undefined> {
  const os = platform();

  if (os === "darwin") {
    const tmpfile = path.join(tmpdir(), "tooee-clipboard.png");
    try {
      await $`osascript -e 'set imageData to the clipboard as "PNGf"' -e 'set fileRef to open for access POSIX file "${tmpfile}" with write permission' -e 'set eof fileRef to 0' -e 'write imageData to fileRef' -e 'close access fileRef'`
        .nothrow()
        .quiet();
      const file = Bun.file(tmpfile);
      const buffer = await file.arrayBuffer();
      if (buffer.byteLength > 0) {
        return {
          data: Buffer.from(buffer).toString("base64"),
          mime: "image/png",
        };
      }
    } catch {
      // Image read failed, try text below
    } finally {
      await $`rm -f "${tmpfile}"`.nothrow().quiet();
    }
  }

  if (os === "win32" || release().includes("WSL")) {
    const script =
      "Add-Type -AssemblyName System.Windows.Forms; $img = [System.Windows.Forms.Clipboard]::GetImage(); if ($img) { $ms = New-Object System.IO.MemoryStream; $img.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png); [System.Convert]::ToBase64String($ms.ToArray()) }";
    const base64 = await $`powershell.exe -command "${script}"`.nothrow().text();
    if (base64) {
      const imageBuffer = Buffer.from(base64.trim(), "base64");
      if (imageBuffer.length > 0) {
        return { data: imageBuffer.toString("base64"), mime: "image/png" };
      }
    }
  }

  if (os === "linux") {
    if (
      (process.env.WAYLAND_DISPLAY?.length ?? 0) > 0 &&
      (Bun.which("wl-paste")?.length ?? 0) > 0
    ) {
      const wayland = await $`wl-paste -t image/png`.nothrow().arrayBuffer();
      if (wayland.byteLength > 0) {
        return {
          data: Buffer.from(wayland).toString("base64"),
          mime: "image/png",
        };
      }
    }
    if ((Bun.which("xclip")?.length ?? 0) > 0) {
      const x11 = await $`xclip -selection clipboard -t image/png -o`.nothrow().arrayBuffer();
      if (x11.byteLength > 0) {
        return {
          data: Buffer.from(x11).toString("base64"),
          mime: "image/png",
        };
      }
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

let copyMethod: ((text: string) => Promise<void>) | null = null;

const getCopyMethod = function getCopyMethod(): (text: string) => Promise<void> {
  if (copyMethod) {
    return copyMethod;
  }

  const os = platform();

  if (os === "darwin" && (Bun.which("osascript")?.length ?? 0) > 0) {
    copyMethod = async (text: string) => {
      const escaped = text.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
      await $`osascript -e 'set the clipboard to "${escaped}"'`.nothrow().quiet();
    };
    return copyMethod;
  }

  if (os === "linux") {
    if ((process.env.WAYLAND_DISPLAY?.length ?? 0) > 0 && (Bun.which("wl-copy")?.length ?? 0) > 0) {
      copyMethod = async (text: string) => {
        const proc = Bun.spawn(["wl-copy"], {
          stderr: "ignore",
          stdin: "pipe",
          stdout: "ignore",
        });
        await proc.stdin.write(text);
        await proc.stdin.end();
        await proc.exited.catch(() => null);
      };
      return copyMethod;
    }
    if ((Bun.which("xclip")?.length ?? 0) > 0) {
      copyMethod = async (text: string) => {
        const proc = Bun.spawn(["xclip", "-selection", "clipboard"], {
          stderr: "ignore",
          stdin: "pipe",
          stdout: "ignore",
        });
        await proc.stdin.write(text);
        await proc.stdin.end();
        await proc.exited.catch(() => null);
      };
      return copyMethod;
    }
    if ((Bun.which("xsel")?.length ?? 0) > 0) {
      copyMethod = async (text: string) => {
        const proc = Bun.spawn(["xsel", "--clipboard", "--input"], {
          stderr: "ignore",
          stdin: "pipe",
          stdout: "ignore",
        });
        await proc.stdin.write(text);
        await proc.stdin.end();
        await proc.exited.catch(() => null);
      };
      return copyMethod;
    }
  }

  if (os === "win32") {
    copyMethod = async (text: string) => {
      const escaped = text.replaceAll('"', '""');
      await $`powershell -command "Set-Clipboard -Value \"${escaped}\""`.nothrow().quiet();
    };
    return copyMethod;
  }

  copyMethod = async () => {
    // Silent no-op — no clipboard support available
  };
  return copyMethod;
};

export const copyToClipboard = async function copyToClipboard(text: string): Promise<void> {
  await getCopyMethod()(text);
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
  primaryCopyMethod = getCopyMethod();
  return primaryCopyMethod;
};

export const copyToPrimary = async function copyToPrimary(text: string): Promise<void> {
  await getPrimaryCopyMethod()(text);
};
