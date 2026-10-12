// Hex colour blending for derived theme tokens.

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

const SHORT_HEX = /^#(?<digits>[0-9a-f]{3,4})$/iu;

const LONG_HEX = /^#(?<digits>[0-9a-f]{6}|[0-9a-f]{8})$/iu;

const parseHex = function parseHex(hex: string): Rgba | null {
  const short = SHORT_HEX.exec(hex)?.groups?.digits;

  const digits =
    short === undefined
      ? LONG_HEX.exec(hex)?.groups?.digits
      : short.replaceAll(/(?<d>.)/gu, "$1$1");

  if (digits === undefined) {
    return null;
  }

  const channel = (index: number): number =>
    Number.parseInt(digits.slice(index * 2, index * 2 + 2), 16);

  return { a: digits.length === 8 ? channel(3) : 255, b: channel(2), g: channel(1), r: channel(0) };
};

const toHex = function toHex(value: number): string {
  return Math.round(value).toString(16).padStart(2, "0");
};

const toRgbHex = function toRgbHex(source: Rgba): string {
  return `#${toHex(source.r)}${toHex(source.g)}${toHex(source.b)}`;
};

/**
 * Blend `amount` (0 to 1) of `tint` over `base`.
 *
 * An opaque base gives an opaque colour. A fully transparent base, such as a
 * theme that leaves the terminal background visible, gives `tint` at `amount`
 * opacity, so the renderer blends it over whatever is behind. When either
 * colour cannot be parsed, the result is `tint`.
 */
export const mixColors = function mixColors(base: string, tint: string, amount: number): string {
  const from = parseHex(base);
  const to = parseHex(tint);

  if (from === null || to === null) {
    return tint;
  }

  if (from.a === 0) {
    return `${toRgbHex(to)}${toHex(to.a * amount)}`;
  }

  return toRgbHex({
    a: 255,
    b: from.b + (to.b - from.b) * amount,
    g: from.g + (to.g - from.g) * amount,
    r: from.r + (to.r - from.r) * amount,
  });
};
