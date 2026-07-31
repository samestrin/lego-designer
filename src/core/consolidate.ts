/**
 * Run consolidation: merge same-color plate runs into 1×1 bricks.
 *
 * Physical model: three stacked 1×1 plates (3024) are 3 × 3.2mm = 9.6mm —
 * exactly the height of one 1×1 brick (3005). So any run of 3 consecutive
 * same-color plates in a tipped row can be replaced by one brick showing a
 * smooth 9.6mm × 8mm face instead of three seamed plate edges. Only exact
 * multiples of 3 consolidate: a longer brick (1×2) would stick out the back
 * of the 1-plate-deep row, so leftovers stay plates.
 */

import type { Mosaic, PaletteColor } from './types';
import { cellPlates } from './types';

export type PartKind = 'plate' | 'brick'; // plate = 3024, brick = 3005

export interface Segment {
  color: PaletteColor;
  part: PartKind;
  /** How many physical pieces (a brick counts 1, not 3). */
  pieces: number;
  /** How many sub-pixels covered (pieces × 3 for brick, × 1 for plate). */
  plates: number;
}

/** Plate colors of one display row, left to right. */
export function rowPlates(mosaic: Mosaic, row: number): PaletteColor[] {
  const plates: PaletteColor[] = [];
  for (let x = 0; x < mosaic.cellWidth; x++) {
    plates.push(...cellPlates(mosaic.cells[row * mosaic.cellWidth + x]));
  }
  return plates;
}

/**
 * Greedy left-to-right: within each maximal same-color run, emit as many
 * brick segments as possible, then the 0–2 leftover plates. The sum of
 * `plates` over the returned segments always equals plates.length.
 */
export function consolidateRow(plates: PaletteColor[]): Segment[] {
  const segments: Segment[] = [];
  let i = 0;
  while (i < plates.length) {
    const color = plates[i];
    let j = i;
    while (j < plates.length && plates[j].id === color.id) j++;
    const run = j - i;
    const bricks = Math.floor(run / 3);
    if (bricks > 0) {
      segments.push({ color, part: 'brick', pieces: bricks, plates: bricks * 3 });
    }
    const leftover = run % 3;
    if (leftover > 0) {
      segments.push({ color, part: 'plate', pieces: leftover, plates: leftover });
    }
    i = j;
  }
  return segments;
}
