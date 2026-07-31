/**
 * Color conversion and matching.
 *
 * sRGB → XYZ → CIE Lab conversion adapted from quilt-core's kmeans.ts.
 * Lab distances better match human perception of color difference, so all
 * palette matching happens in Lab space.
 */

import type { Lab, PaletteColor } from './types';

/**
 * Convert sRGB (0-255) to CIE Lab color space.
 */
export function rgbToLab(r: number, g: number, b: number): Lab {
  // sRGB → linear RGB
  let rl = r / 255;
  let gl = g / 255;
  let bl = b / 255;
  rl = rl > 0.04045 ? ((rl + 0.055) / 1.055) ** 2.4 : rl / 12.92;
  gl = gl > 0.04045 ? ((gl + 0.055) / 1.055) ** 2.4 : gl / 12.92;
  bl = bl > 0.04045 ? ((bl + 0.055) / 1.055) ** 2.4 : bl / 12.92;

  // Linear RGB → XYZ (D65 illuminant)
  let x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / 0.95047;
  let y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.072175;
  let z = (rl * 0.0193339 + gl * 0.119192 + bl * 0.9503041) / 1.08883;

  // XYZ → Lab
  const epsilon = 0.008856;
  const kappa = 903.3;
  x = x > epsilon ? x ** (1 / 3) : (kappa * x + 16) / 116;
  y = y > epsilon ? y ** (1 / 3) : (kappa * y + 16) / 116;
  z = z > epsilon ? z ** (1 / 3) : (kappa * z + 16) / 116;

  return { l: 116 * y - 16, a: 500 * (x - y), b: 200 * (y - z) };
}

/** Squared Euclidean distance in CIE Lab space. */
export function labDistanceSq(a: Lab, b: Lab): number {
  return (a.l - b.l) ** 2 + (a.a - b.a) ** 2 + (a.b - b.b) ** 2;
}

/** Parse a #RRGGBB hex string to RGB components. */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

/** Format RGB components (0-255) as a #RRGGBB hex string. */
export function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

/**
 * Find the nearest palette color to a given RGB value by Lab distance.
 * Deliberately simple: recomputes palette Lab values per call. Callers in
 * hot loops (the encoder) precompute Lab values themselves.
 */
export function nearestPaletteColor(
  r: number,
  g: number,
  b: number,
  palette: PaletteColor[],
): PaletteColor {
  const target = rgbToLab(r, g, b);
  let minDist = Infinity;
  let best = palette[0];
  for (const c of palette) {
    const rgb = hexToRgb(c.hex);
    const d = labDistanceSq(target, rgbToLab(rgb.r, rgb.g, rgb.b));
    if (d < minDist) {
      minDist = d;
      best = c;
    }
  }
  return best;
}
