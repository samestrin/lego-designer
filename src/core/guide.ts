/**
 * Plain-text build guide generation.
 *
 * The mosaic is built as one standing wall (studs up), H studs wide × 3W
 * courses tall, bottom to top; course 1 is the bottom course and becomes the
 * LEFT edge of the display after tipping. Each course lists only the pieces
 * that START on it (their lowest course), left to right by stud; pieces
 * spanning several courses appear once. When the wall is complete it is
 * tipped 90° clockwise onto its right side, so the bottom course lands at
 * the left edge and the left stud-column becomes the top row.
 */

import type { Mosaic } from './types';
import { displayHeightMm, displayWidthMm, mosaicPlateWidth } from './types';
import type { PieceDef, PieceSetId, Placement, TilingMode } from './tiling';
import { PIECE_SETS, tileMosaic } from './tiling';
import { countParts } from './partsList';

/** Structured guide content: the plain-text guide and the print view are
 *  both renderings of this. */
export interface GuideData {
  gridLine: string;
  pieceSetLine: string;
  partsLine: string;
  buildLines: string[];
  courses: { course: number; pieces: { text: string; hex: string }[] }[];
  frameLine: string;
}

export function buildGuideData(
  mosaic: Mosaic,
  opts: { set: PieceSetId; mode: TilingMode },
): GuideData {
  const tiling = tileMosaic(mosaic, opts.set, opts.mode);
  const { cellWidth, rows } = mosaic;
  const plateWidth = mosaicPlateWidth(mosaic);
  const widthMm = displayWidthMm(mosaic);
  const heightMm = displayHeightMm(mosaic);
  const widthIn = widthMm / 25.4;
  const heightIn = heightMm / 25.4;

  // One entry per piece type used, aggregated across colors; totals match
  // countParts for the same tiling.
  const totals = new Map<string, { piece: PieceDef; count: number }>();
  for (const { piece, count } of countParts(tiling).values()) {
    const entry = totals.get(piece.partNum);
    if (entry) {
      entry.count += count;
    } else {
      totals.set(piece.partNum, { piece, count });
    }
  }
  const partsLine = `Parts: ${[...totals.values()]
    .map((t) => `${t.count}× ${t.piece.name} (${t.piece.partNum})`)
    .join(', ')}`;

  // Group placements by their first (lowest) course = x; a piece spanning
  // courses x..x+w-1 rests on the courses below, so it is placed when the
  // build reaches course x.
  const byCourse = new Map<number, Placement[]>();
  for (const p of tiling) {
    const list = byCourse.get(p.x);
    if (list) {
      list.push(p);
    } else {
      byCourse.set(p.x, [p]);
    }
  }
  const courses: GuideData['courses'] = [];
  for (const x of [...byCourse.keys()].sort((a, b) => a - b)) {
    const entries = byCourse.get(x)!;
    entries.sort((a, b) => a.y - b.y);
    courses.push({
      course: x + 1,
      pieces: entries.map((p) => {
        const studs =
          p.piece.h === 1
            ? `stud ${p.y + 1}`
            : `studs ${p.y + 1}-${p.y + p.piece.h}`;
        return { text: `${p.color.name} ${p.piece.name} (${studs})`, hex: p.color.hex };
      }),
    });
  }

  return {
    gridLine: `Grid: ${cellWidth} cells × ${rows} rows (${plateWidth} plates wide) — display ≈ ${widthIn.toFixed(1)}" × ${heightIn.toFixed(1)}" (${widthMm} × ${heightMm} mm)`,
    pieceSetLine: `Piece set: ${PIECE_SETS[opts.set].label} · Mode: ${opts.mode}`,
    partsLine,
    buildLines: [
      `BUILD a standing wall ${rows} studs wide × ${plateWidth} courses tall, bottom to top. Each`,
      'course below lists the pieces that START on that course, left to right by stud',
      `(studs 1..${rows}). Pieces spanning multiple courses are listed only on their first.`,
      'TIP: when the wall is complete, tip it 90° clockwise (onto its right side) — the',
      'bottom course becomes the LEFT edge of the display, the left column the TOP row.',
    ],
    courses,
    frameLine:
      'FRAME: build a staggered border of 1×8/1×10 plates in 3 offset layers along the top and bottom edges, with SNOT-brick side columns to capture the bar ends. Adjust plate lengths and layer count to your bins.',
  };
}

export function generateGuide(
  mosaic: Mosaic,
  opts: { set: PieceSetId; mode: TilingMode },
): string {
  const data = buildGuideData(mosaic, opts);
  const lines: string[] = [
    'LEGO DESIGNER — build guide',
    data.gridLine,
    data.pieceSetLine,
    data.partsLine,
    '',
    ...data.buildLines,
    '',
  ];
  for (const { course, pieces } of data.courses) {
    const runs = pieces.map((p) => p.text);
    lines.push(`Course ${String(course).padStart(3, '0')}: ${runs.join(', ')}`);
  }
  lines.push('', data.frameLine);
  return lines.join('\n');
}
