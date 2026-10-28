import { crc32, deflateSync } from "node:zlib";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const pngChunk = function pngChunk(type: string, data: Uint8Array): Buffer {
  const typeBytes = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));

  return Buffer.concat([length, typeBytes, data, crc]);
};

/**
 * Encode an opaque single-colour RGB PNG of `width` x `height` pixels, for
 * tests that need a real image file of a known pixel size.
 */
export const solidPng = function solidPng(
  width: number,
  height: number,
  rgb: readonly [number, number, number] = [200, 80, 40]
): Uint8Array {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  // Bit depth 8, colour type 2 (RGB), default compression, filter, no interlace.
  header.set([8, 2, 0, 0, 0], 8);

  const rowBytes = 1 + width * 3;
  const pixels = Buffer.alloc(rowBytes * height);

  for (let row = 0; row < height; row += 1) {
    // Each scanline starts with filter type 0.
    for (let col = 0; col < width; col += 1) {
      pixels.set(rgb, row * rowBytes + 1 + col * 3);
    }
  }

  return Buffer.concat([
    Buffer.from(PNG_SIGNATURE),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(pixels)),
    pngChunk("IEND", new Uint8Array()),
  ]);
};
