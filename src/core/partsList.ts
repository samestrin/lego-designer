/**
 * Parts list aggregation.
 *
 * Counts physical pieces per piece+color across a tiling. Patterned after
 * quilt-core's aggregatePiecesByColor. A piece counts as one physical part
 * regardless of how many sub-pixels it covers.
 */

import type { PaletteColor } from './types';
import type { PieceDef, Placement } from './tiling';

export type PartsCounts = Map<
  string,
  { piece: PieceDef; color: PaletteColor; count: number }
>;

/** Part label used in the parts table and CSV export. */
export function pieceLabel(piece: PieceDef): string {
  return `${piece.name} (${piece.partNum})`;
}

/** Count pieces per piece+color, sorted by count descending. */
export function countParts(tiling: Placement[]): PartsCounts {
  const counts = new Map<
    string,
    { piece: PieceDef; color: PaletteColor; count: number }
  >();
  for (const p of tiling) {
    const key = `${p.piece.partNum}:${p.color.id}`;
    const entry = counts.get(key);
    if (entry) {
      entry.count++;
    } else {
      counts.set(key, { piece: p.piece, color: p.color, count: 1 });
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
  for (const { piece, color, count } of counts.values()) {
    lines.push(
      [pieceLabel(piece), color.id, color.name, color.hex, color.brand, count]
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
