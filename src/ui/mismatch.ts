/**
 * Mismatch highlighting.
 *
 * A cell's `error` is the sum of squared CIE Lab distances over its 3
 * sub-pixels, so the threshold is in Lab² units summed over 3 samples:
 * √(400/3) ≈ ΔE 11.5 per sub-pixel — roughly "clearly the wrong color".
 */

import type { Mosaic } from '../core/types';

export const MISMATCH_THRESHOLD = 400;

export function countMismatches(mosaic: Mosaic): number {
  let n = 0;
  for (const cell of mosaic.cells) {
    if (cell.error > MISMATCH_THRESHOLD) n++;
  }
  return n;
}
