/**
 * Plain-text build guide generation.
 *
 * The mosaic is built as one standing wall (studs up), cellWidth studs wide
 * × 3*rows courses tall, bottom to top — and the standing wall face IS the
 * finished display; there is no tipping step. Course 1 is the bottom
 * course. Each course lists only the pieces that START on it (their lowest
 * course), left to right by stud; pieces spanning several courses appear
 * once. What you see while building is what you get.
 */

import type { Mosaic } from './types';
import { displayHeightMm, displayWidthMm, mosaicCourseHeight } from './types';
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
  frameLines: string[];
}

export function buildGuideData(
  mosaic: Mosaic,
  opts: { set: PieceSetId; mode: TilingMode },
): GuideData {
  const tiling = tileMosaic(mosaic, opts.set, opts.mode);
  const { cellWidth, rows } = mosaic;
  const courseHeight = mosaicCourseHeight(mosaic);
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

  // Group placements by their starting (lowest) course, 1-based from the
  // bottom: a piece covering grid rows y..y+h-1 from the top rests on the
  // courses below, so it is placed when the build reaches that course.
  const startCourse = (p: Placement) => courseHeight - p.y - p.piece.h + 1;
  const byCourse = new Map<number, Placement[]>();
  for (const p of tiling) {
    const c = startCourse(p);
    const list = byCourse.get(c);
    if (list) {
      list.push(p);
    } else {
      byCourse.set(c, [p]);
    }
  }
  const courses: GuideData['courses'] = [];
  for (const c of [...byCourse.keys()].sort((a, b) => a - b)) {
    const entries = byCourse.get(c)!;
    entries.sort((a, b) => a.x - b.x);
    courses.push({
      course: c,
      pieces: entries.map((p) => {
        const studs =
          p.piece.w === 1
            ? `stud ${p.x + 1}`
            : `studs ${p.x + 1}-${p.x + p.piece.w}`;
        return { text: `${p.color.name} ${p.piece.name} (${studs})`, hex: p.color.hex };
      }),
    });
  }

  return {
    gridLine: `Grid: ${cellWidth} cells × ${rows} rows (${courseHeight} courses tall) — display ≈ ${widthIn.toFixed(1)}" × ${heightIn.toFixed(1)}" (${widthMm} × ${heightMm} mm)`,
    pieceSetLine: `Piece set: ${PIECE_SETS[opts.set].label} · Mode: ${opts.mode}`,
    partsLine,
    buildLines: [
      `BUILD a standing wall ${cellWidth} studs wide × ${courseHeight} courses tall, bottom to top.`,
      'The standing wall face IS the finished display — what you see while building is what',
      'you get. Course 1 is the bottom course. Each course below lists the pieces that START',
      `on that course (their lowest course), left to right by stud (studs 1..${cellWidth}).`,
      'Pieces spanning multiple courses are listed only on their first.',
    ],
    courses,
    frameLines: [
      'FRAME: a suggested construction — adjust to your bins; nothing here is counted in the parts list.',
      '1. Bottom border first: 3 layers of long thin plates (1×8/1×10), each layer offset about half a',
      '   plate length so the seams never line up (running bond) — that is what gives the border its',
      '   strength — with SNOT corner pieces so the sides can wrap.',
      '2. Build the mosaic up from the bottom border; side borders (a column of SNOT bricks,',
      '   36841 1×1-1×1, studs facing inward) rise alongside, capturing the mosaic\'s left/right edges.',
      '3. Top border caps it last; corner brackets (e.g. 2357 or a 1×2-1×2 bracket) tie the ring.',
    ],
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
  lines.push('', ...data.frameLines);
  return lines.join('\n');
}
