import { $ } from "bun"
import { platform, release, tmpdir } from "os"
import path from "path"

export interface ClipboardContent {
  data: string
  mime: string
}

export async function readClipboard(): Promise<ClipboardContent | undefined> {
  const os = platform()

  if (os === "darwin") {
    const tmpfile = path.join(tmpdir(), "tooee-clipboard.png")
    try {
      await $`osascript -e 'set imageData to the clipboard as "PNGf"' -e 'set fileRef to open for access POSIX file "${tmpfile}" with write permission' -e 'set eof fileRef to 0' -e 'write imageData to fileRef' -e 'close access fileRef'`
        .nothrow()
        .quiet()
      const file = Bun.file(tmpfile)
      const buffer = await file.arrayBuffer()
      if (buffer.byteLength > 0) {
        return {
          data: Buffer.from(buffer).toString("base64"),
          mime: "image/png",
        }
      }
    } catch {
      // Image read failed, try text below
    } finally {
      await $`rm -f "${tmpfile}"`.nothrow().quiet()
    }
  }

  if (os === "win32" || release().includes("WSL")) {
    const script =
      "Add-Type -AssemblyName System.Windows.Forms; $img = [System.Windows.Forms.Clipboard]::GetImage(); if ($img) { $ms = New-Object System.IO.MemoryStream; $img.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png); [System.Convert]::ToBase64String($ms.ToArray()) }"
    const base64 = await $`powershell.exe -command "${script}"`.nothrow().text()
    if (base64) {
      const imageBuffer = Buffer.from(base64.trim(), "base64")
      if (imageBuffer.length > 0) {
        return { data: imageBuffer.toString("base64"), mime: "image/png" }
      }
    }
  }

  if (os === "linux") {
    if (process.env["WAYLAND_DISPLAY"] && Bun.which("wl-paste")) {
      const wayland = await $`wl-paste -t image/png`.nothrow().arrayBuffer()
      if (wayland && wayland.byteLength > 0) {
        return {
          data: Buffer.from(wayland).toString("base64"),
          mime: "image/png",
        }
      }
    }
    if (Bun.which("xclip")) {
      const x11 = await $`xclip -selection clipboard -t image/png -o`.nothrow().arrayBuffer()
      if (x11 && x11.byteLength > 0) {
        return {
          data: Buffer.from(x11).toString("base64"),
          mime: "image/png",
        }
      }
    }
  }

  const text = await readClipboardText()
  if (text) {
    return { data: text, mime: "text/plain" }
  }

  return undefined
}

export async function readClipboardText(): Promise<string | undefined> {
  const os = platform()

  if (os === "darwin") {
    const result = await $`pbpaste`.nothrow().quiet().text()
    return result || undefined
  }

  if (os === "linux") {
    if (process.env["WAYLAND_DISPLAY"] && Bun.which("wl-paste")) {
      const result = await $`wl-paste`.nothrow().quiet().text()
      return result || undefined
    }
    if (Bun.which("xclip")) {
      const result = await $`xclip -selection clipboard -o`.nothrow().quiet().text()
      return result || undefined
    }
    if (Bun.which("xsel")) {
      const result = await $`xsel --clipboard --output`.nothrow().quiet().text()
      return result || undefined
    }
  }

  if (os === "win32") {
    const result = await $`powershell -command "Get-Clipboard"`.nothrow().quiet().text()
    return result || undefined
  }

  return undefined
}

let copyMethod: ((text: string) => Promise<void>) | null = null

function getCopyMethod(): (text: string) => Promise<void> {
  if (copyMethod) return copyMethod

  const os = platform()

  if (os === "darwin" && Bun.which("osascript")) {
    copyMethod = async (text: string) => {
      const escaped = text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
      await $`osascript -e 'set the clipboard to "${escaped}"'`.nothrow().quiet()
    }
    return copyMethod
  }

  if (os === "linux") {
    if (process.env["WAYLAND_DISPLAY"] && Bun.which("wl-copy")) {
      copyMethod = async (text: string) => {
        const proc = Bun.spawn(["wl-copy"], {
          stdin: "pipe",
          stdout: "ignore",
          stderr: "ignore",
        })
        proc.stdin.write(text)
        proc.stdin.end()
        await proc.exited.catch(() => undefined)
      }
      return copyMethod
    }
    if (Bun.which("xclip")) {
      copyMethod = async (text: string) => {
        const proc = Bun.spawn(["xclip", "-selection", "clipboard"], {
          stdin: "pipe",
          stdout: "ignore",
          stderr: "ignore",
        })
        proc.stdin.write(text)
        proc.stdin.end()
        await proc.exited.catch(() => undefined)
      }
      return copyMethod
    }
    if (Bun.which("xsel")) {
      copyMethod = async (text: string) => {
        const proc = Bun.spawn(["xsel", "--clipboard", "--input"], {
          stdin: "pipe",
          stdout: "ignore",
          stderr: "ignore",
        })
        proc.stdin.write(text)
        proc.stdin.end()
        await proc.exited.catch(() => undefined)
      }
      return copyMethod
    }
  }

  if (os === "win32") {
    copyMethod = async (text: string) => {
      const escaped = text.replace(/"/g, '""')
      await $`powershell -command "Set-Clipboard -Value \"${escaped}\""`.nothrow().quiet()
    }
    return copyMethod
  }

  copyMethod = async () => {
    // Silent no-op — no clipboard support available
  }
  return copyMethod
}

export async function copyToClipboard(text: string): Promise<void> {
  await getCopyMethod()(text)
}
