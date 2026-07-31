/**
 * Pre-encode image adjustments, pure PixelData → PixelData.
 *
 * Applied to the resampled sub-pixel grid inside the encoder (not the
 * full-resolution source), so they are cheap and show up exactly as the
 * matcher sees them. Both take -100..100 with 0 = no change.
 */

import type { PixelData } from './types';

// Rec. 601 luma.
function luma(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Saturation: interpolate each channel toward/away from its luma.
 * -100 = grayscale, 0 = unchanged, >0 = more vivid.
 * Contrast: pivot channels around the 128 midpoint.
 * -100 = flat gray, 0 = unchanged, >0 = punchier.
 * Saturation is applied first, then contrast.
 */
export function adjustPixelData(
  pixels: PixelData,
  opts: { contrast?: number; saturation?: number },
): PixelData {
  const sat = 1 + (opts.saturation ?? 0) / 100;
  const con = 1 + (opts.contrast ?? 0) / 100;
  if (sat === 1 && con === 1) return pixels;

  const out = new Uint8ClampedArray(pixels.data.length);
  const { data } = pixels;
  for (let i = 0; i < data.length; i += 4) {
    const l = luma(data[i], data[i + 1], data[i + 2]);
    for (let c = 0; c < 3; c++) {
      const saturated = l + (data[i + c] - l) * sat;
      out[i + c] = 128 + (saturated - 128) * con;
    }
    out[i + 3] = data[i + 3];
  }
  return { width: pixels.width, height: pixels.height, data: out };
}
