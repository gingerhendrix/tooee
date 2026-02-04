import { useState, useEffect } from "react"
import { Jimp } from "jimp"
import { useTerminalDimensions } from "@opentui/react"
import { useTheme } from "../theme.tsx"

interface ImageViewProps {
  /** File path to the image */
  src: string
  /** Maximum width in characters (defaults to terminal width) */
  maxWidth?: number
  /** Maximum height in characters (defaults to terminal height) */
  maxHeight?: number
}

interface PixelRow {
  key: number
  cells: PixelCell[]
}

interface PixelCell {
  char: string
  fg: string
  bg: string
}

/**
 * Renders an image in the terminal using half-block characters.
 * Each character cell displays two vertical pixels using foreground (top) and background (bottom) colors.
 */
export function ImageView({ src, maxWidth, maxHeight }: ImageViewProps) {
  const { theme } = useTheme()
  const { width: termWidth, height: termHeight } = useTerminalDimensions()
  const [rows, setRows] = useState<PixelRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [imageInfo, setImageInfo] = useState<{ width: number; height: number } | null>(null)

  const effectiveMaxWidth = maxWidth ?? termWidth - 2
  const effectiveMaxHeight = maxHeight ?? (termHeight - 4) * 2 // *2 because each char = 2 pixels

  useEffect(() => {
    let cancelled = false

    async function loadImage() {
      try {
        const image = await Jimp.read(src)
        if (cancelled) return

        const originalWidth = image.width
        const originalHeight = image.height

        // Calculate scale to fit within bounds while preserving aspect ratio
        // Terminal characters are roughly 2:1 (height:width), so we need to account for this
        const _charAspectRatio = 2 // Each character is roughly 2x as tall as it is wide
        const adjustedMaxHeight = effectiveMaxHeight

        const scaleX = effectiveMaxWidth / originalWidth
        const scaleY = adjustedMaxHeight / originalHeight
        const scale = Math.min(scaleX, scaleY, 1) // Don't upscale

        const newWidth = Math.floor(originalWidth * scale)
        const newHeight = Math.floor(originalHeight * scale)

        // Resize image
        if (newWidth !== originalWidth || newHeight !== originalHeight) {
          image.resize({ w: newWidth, h: newHeight })
        }

        // Convert to half-block characters
        const pixelRows = convertToHalfBlocks(image)

        if (!cancelled) {
          setImageInfo({ width: newWidth, height: Math.ceil(newHeight / 2) })
          setRows(pixelRows)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load image")
          setRows(null)
        }
      }
    }

    loadImage()
    return () => {
      cancelled = true
    }
  }, [src, effectiveMaxWidth, effectiveMaxHeight])

  if (error) {
    return (
      <box style={{ flexDirection: "column", padding: 1 }}>
        <text content={`Error loading image: ${error}`} fg={theme.error} />
      </box>
    )
  }

  if (!rows) {
    return (
      <box style={{ padding: 1 }}>
        <text content="Loading image..." fg={theme.textMuted} />
      </box>
    )
  }

  return (
    <box style={{ flexDirection: "column" }}>
      {rows.map((row) => (
        <text key={row.key}>
          {row.cells.map((cell, i) => (
            <span key={i} fg={cell.fg} bg={cell.bg}>
              {cell.char}
            </span>
          ))}
        </text>
      ))}
      {imageInfo && (
        <text
          content={`${imageInfo.width}×${imageInfo.height * 2} pixels`}
          fg={theme.textMuted}
          style={{ marginTop: 1 }}
        />
      )}
    </box>
  )
}

/**
 * Convert an image to half-block characters.
 * Uses ▀ (upper half block) where top pixel is fg, bottom pixel is bg.
 */
function convertToHalfBlocks(image: Awaited<ReturnType<typeof Jimp.read>>): PixelRow[] {
  const width = image.width
  const height = image.height
  const rows: PixelRow[] = []

  // Process two rows at a time (top and bottom of each character cell)
  for (let y = 0; y < height; y += 2) {
    const cells: PixelCell[] = []

    for (let x = 0; x < width; x++) {
      const topColor = getPixelColor(image, x, y)
      const bottomColor = y + 1 < height ? getPixelColor(image, x, y + 1) : topColor

      cells.push({
        char: "▀",
        fg: topColor,
        bg: bottomColor,
      })
    }

    rows.push({ key: y, cells })
  }

  return rows
}

function getPixelColor(image: Awaited<ReturnType<typeof Jimp.read>>, x: number, y: number): string {
  const pixel = image.getPixelColor(x, y)
  // Jimp returns RGBA as a single integer: 0xRRGGBBAA
  const r = (pixel >> 24) & 0xff
  const g = (pixel >> 16) & 0xff
  const b = (pixel >> 8) & 0xff
  const a = pixel & 0xff

  // Handle transparency by blending with a dark background
  if (a < 255) {
    const alpha = a / 255
    const bgR = 0x1a
    const bgG = 0x1b
    const bgB = 0x26
    const blendedR = Math.round(r * alpha + bgR * (1 - alpha))
    const blendedG = Math.round(g * alpha + bgG * (1 - alpha))
    const blendedB = Math.round(b * alpha + bgB * (1 - alpha))
    return rgbToHex(blendedR, blendedG, blendedB)
  }

  return rgbToHex(r, g, b)
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
}
