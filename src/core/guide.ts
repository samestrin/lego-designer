/**
 * Plain-text build guide generation.
 *
 * Rows are listed top-to-bottom as displayed. Within a row, plates are
 * listed left-to-right; the builder stacks each row as a tower in listed
 * order, then tips it so the first plate listed lands at the left edge.
 *
 * With `consolidate` on, runs of 3 same-color plates are listed as 1×1
 * bricks (3005): three stacked plates are 9.6mm, exactly one brick height.
 */

import type { Mosaic } from './types';
import {
  displayHeightMm,
  displayWidthMm,
  mosaicPlateWidth,
  totalPlates,
} from './types';
import { consolidateRow, rowPlates } from './consolidate';
import { countParts, partLabel } from './partsList';

export function generateGuide(
  mosaic: Mosaic,
  opts?: { consolidate?: boolean },
): string {
  const consolidate = opts?.consolidate ?? false;
  const { cellWidth, rows } = mosaic;
  const plateWidth = mosaicPlateWidth(mosaic);
  const widthMm = displayWidthMm(mosaic);
  const heightMm = displayHeightMm(mosaic);
  const widthIn = widthMm / 25.4;
  const heightIn = heightMm / 25.4;

  let partsLine: string;
  if (consolidate) {
    const totals = new Map<string, number>();
    for (const { part, count } of countParts(mosaic, { consolidate }).values()) {
      totals.set(part, (totals.get(part) ?? 0) + count);
    }
    const parts = ['plate', 'brick']
      .filter((p) => (totals.get(p) ?? 0) > 0)
      .map((p) => `${totals.get(p)}× 1×1 ${partLabel(p as 'plate' | 'brick')}`);
    partsLine = `Parts: ${parts.join(', ')}`;
  } else {
    partsLine = `Parts: ${totalPlates(mosaic)}× 1×1 plate (3024)`;
  }

  const lines: string[] = [
    'LEGO DESIGNER — build guide',
    `Grid: ${cellWidth} cells × ${rows} rows (${plateWidth} plates wide) — display ≈ ${widthIn.toFixed(1)}" × ${heightIn.toFixed(1)}" (${widthMm} × ${heightMm} mm)`,
    partsLine,
    '',
    'Build each row as a tower bottom-to-top in listed order, then tip and lay with the FIRST plate listed at the LEFT edge. Rows stack top-to-bottom.',
    ...(consolidate
      ? [
          'Runs of 3 same-color plates are merged into 1×1 bricks (3005); brick faces are smooth (no seam lines).',
        ]
      : []),
    '',
  ];

  for (let y = 0; y < rows; y++) {
    const plates = rowPlates(mosaic, y);
    const runs: string[] = [];
    if (consolidate) {
      for (const seg of consolidateRow(plates)) {
        runs.push(`${seg.pieces}×${seg.color.name} ${seg.part}`);
      }
    } else {
      let runName: string | null = null;
      let runCount = 0;
      for (const plate of plates) {
        if (plate.name === runName) {
          runCount++;
        } else {
          if (runName !== null) runs.push(`${runCount}×${runName}`);
          runName = plate.name;
          runCount = 1;
        }
      }
      if (runName !== null) runs.push(`${runCount}×${runName}`);
    }
    lines.push(`Row ${String(y + 1).padStart(2, '0')}: ${runs.join(', ')}`);
  }

  lines.push(
    '',
    'FRAME: build a staggered border of 1×8/1×10 plates in 3 offset layers along the top and bottom edges, with SNOT-brick side columns to capture the bar ends. Adjust plate lengths and layer count to your bins.',
  );

  return lines.join('\n');
}
