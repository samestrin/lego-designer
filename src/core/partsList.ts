/**
 * Parts list aggregation.
 *
 * Counts 1×1 plates per palette color across the whole mosaic. Patterned
 * after quilt-core's aggregatePiecesByColor. With `consolidate` on, runs of
 * 3 same-color plates are counted as 1×1 bricks (3005) instead — a brick
 * counts as one physical piece, not three.
 */

import type { Mosaic, PaletteColor } from './types';
import type { PartKind } from './consolidate';
import { cellPlates } from './types';
import { consolidateRow, rowPlates } from './consolidate';

export type PartsCounts = Map<
  string,
  { part: PartKind; color: PaletteColor; count: number }
>;

/** Part label used in the guide header and CSV export. */
export function partLabel(part: PartKind): string {
  return part === 'brick' ? 'brick (3005)' : 'plate (3024)';
}

/** Count pieces per part+color, sorted by count descending. */
export function countParts(
  mosaic: Mosaic,
  opts?: { consolidate?: boolean },
): PartsCounts {
  const counts = new Map<
    string,
    { part: PartKind; color: PaletteColor; count: number }
  >();
  const add = (part: PartKind, color: PaletteColor, n: number) => {
    const key = `${part}:${color.id}`;
    const entry = counts.get(key);
    if (entry) {
      entry.count += n;
    } else {
      counts.set(key, { part, color, count: n });
    }
  };

  if (opts?.consolidate) {
    for (let y = 0; y < mosaic.rows; y++) {
      for (const seg of consolidateRow(rowPlates(mosaic, y))) {
        add(seg.part, seg.color, seg.pieces);
      }
    }
  } else {
    for (const cell of mosaic.cells) {
      for (const plate of cellPlates(cell)) {
        add('plate', plate, 1);
      }
    }
  }

  const sorted = [...counts.entries()].sort(
    (a, b) => b[1].count - a[1].count,
  );
  return new Map(sorted);
}

/** Serialize a parts count map to CSV. */
export function partsToCsv(counts: PartsCounts): string {
  const lines = ['part,id,name,hex,brand,count'];
  for (const { part, color, count } of counts.values()) {
    lines.push(
      [partLabel(part), color.id, color.name, color.hex, color.brand, count]
        .map(csvField)
        .join(','),
    );
  }
  return lines.join('\n');
}

function csvField(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
