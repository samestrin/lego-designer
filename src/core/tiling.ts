/**
 * Mosaic tiling: cover the sub-pixel grid with monochrome LEGO pieces.
 *
 * Physical model: the mosaic is one ordinary standing wall (studs up,
 * stacked courses) and its face IS the display. The sub-pixel grid is
 * cellWidth studs (x, 8mm) × 3*rows courses (y, 3.2mm); cell (cx, cy)
 * covers x = cx, y = 3cy..3cy+2. A piece w studs × h courses covers a w×h
 * block of that grid and must be a single color. A plate is 1 course tall,
 * a brick 3 courses (9.6mm), tall bricks 2/3/5 bricks (6/9/15 courses) —
 * hence the shapes below.
 */

import type { Mosaic, PaletteColor } from './types';
import { cellPlates, mosaicCourseHeight } from './types';

export interface PieceDef {
  partNum: string;
  name: string;
  /** Studs spanned (sub-pixels along a display row). */
  w: number;
  /** Courses spanned (sub-pixels down a stud column). */
  h: number;
}

export const PIECES: Record<string, PieceDef> = {
  '3024': { partNum: '3024', name: 'Plate 1×1', w: 1, h: 1 },
  '3023': { partNum: '3023', name: 'Plate 1×2', w: 2, h: 1 },
  '3623': { partNum: '3623', name: 'Plate 1×3', w: 3, h: 1 },
  '3710': { partNum: '3710', name: 'Plate 1×4', w: 4, h: 1 },
  '3666': { partNum: '3666', name: 'Plate 1×6', w: 6, h: 1 },
  '3005': { partNum: '3005', name: 'Brick 1×1', w: 1, h: 3 },
  '3004': { partNum: '3004', name: 'Brick 1×2', w: 2, h: 3 },
  '3622': { partNum: '3622', name: 'Brick 1×3', w: 3, h: 3 },
  '3010': { partNum: '3010', name: 'Brick 1×4', w: 4, h: 3 },
  '3245': { partNum: '3245', name: 'Brick 1×2×2', w: 2, h: 6 },
  '14716': { partNum: '14716', name: 'Brick 1×1×3', w: 1, h: 9 },
  '22886': { partNum: '22886', name: 'Brick 1×2×3', w: 2, h: 9 },
  '49311': { partNum: '49311', name: 'Brick 1×4×3', w: 4, h: 9 },
  '2453': { partNum: '2453', name: 'Brick 1×1×5', w: 1, h: 15 },
  '2454': { partNum: '2454', name: 'Brick 1×2×5', w: 2, h: 15 },
};

export type PieceSetId = 'plates-1x1' | 'plates' | 'family' | 'extended';

export const PIECE_SETS: Record<
  PieceSetId,
  { label: string; pieces: PieceDef[] }
> = {
  'plates-1x1': {
    label: 'Plates 1×1 only (3024)',
    pieces: [PIECES['3024']],
  },
  plates: {
    label: 'Plates 1×1 + 1×2',
    pieces: [PIECES['3024'], PIECES['3023']],
  },
  family: {
    label: 'Family: 1×1 + 1×2 plates & bricks',
    pieces: [PIECES['3024'], PIECES['3023'], PIECES['3005'], PIECES['3004']],
  },
  extended: {
    label: 'Extended: all plates, bricks & tall bricks',
    pieces: [
      PIECES['3024'],
      PIECES['3023'],
      PIECES['3623'],
      PIECES['3710'],
      PIECES['3666'],
      PIECES['3005'],
      PIECES['3004'],
      PIECES['3622'],
      PIECES['3010'],
      PIECES['3245'],
      PIECES['14716'],
      PIECES['22886'],
      PIECES['49311'],
      PIECES['2453'],
      PIECES['2454'],
    ],
  },
};

export type TilingMode = 'block' | 'ansi';

export interface Placement {
  piece: PieceDef;
  color: PaletteColor;
  /** Leftmost stud covered (0..W-w). */
  x: number;
  /** Topmost course covered (0..H-h). */
  y: number;
}

/** Sub-pixel color grid of the mosaic: grid[y][x], cellWidth wide × 3*rows tall. */
export function colorGrid(mosaic: Mosaic): PaletteColor[][] {
  const grid: PaletteColor[][] = Array.from(
    { length: mosaicCourseHeight(mosaic) },
    () => new Array<PaletteColor>(mosaic.cellWidth),
  );
  for (let cy = 0; cy < mosaic.rows; cy++) {
    for (let cx = 0; cx < mosaic.cellWidth; cx++) {
      const plates = cellPlates(mosaic.cells[cy * mosaic.cellWidth + cx]);
      for (let o = 0; o < 3; o++) {
        grid[3 * cy + o][cx] = plates[o];
      }
    }
  }
  return grid;
}

/**
 * Greedy tiling: scan courses top-to-bottom, studs left-to-right; at the
 * first uncovered sub-pixel, place the first piece (descending area in
 * `block` mode, ascending in `ansi` mode) whose w×h block is entirely
 * uncovered and monochrome. Ascending order lands on 1×1 plates everywhere
 * — that IS the intent of ansi mode: maximum seam texture. Every set
 * contains the 1×1 plate, so the scan always completes. Deterministic.
 */
export function tileMosaic(
  mosaic: Mosaic,
  setId: PieceSetId,
  mode: TilingMode,
): Placement[] {
  const width = mosaic.cellWidth;
  const height = mosaicCourseHeight(mosaic);
  const grid = colorGrid(mosaic);
  const covered: boolean[][] = Array.from({ length: height }, () =>
    new Array<boolean>(width).fill(false),
  );

  const byArea = (a: PieceDef, b: PieceDef) => a.w * a.h - (b.w * b.h);
  const pieces = [...PIECE_SETS[setId].pieces].sort(
    mode === 'block' ? (a, b) => byArea(b, a) : byArea,
  );

  const placements: Placement[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (covered[y][x]) continue;
      const color = grid[y][x];
      for (const piece of pieces) {
        if (x + piece.w > width || y + piece.h > height) continue;
        let fits = true;
        for (let dy = 0; dy < piece.h && fits; dy++) {
          for (let dx = 0; dx < piece.w && fits; dx++) {
            if (covered[y + dy][x + dx] || grid[y + dy][x + dx].id !== color.id) {
              fits = false;
            }
          }
        }
        if (!fits) continue;
        for (let dy = 0; dy < piece.h; dy++) {
          for (let dx = 0; dx < piece.w; dx++) {
            covered[y + dy][x + dx] = true;
          }
        }
        placements.push({ piece, color, x, y });
        break;
      }
    }
  }
  return placements;
}

/**
 * Count how many placements cover each sub-pixel; a valid tiling has exactly
 * 1 everywhere. Test/debug helper.
 */
export function coverageCounts(
  tiling: Placement[],
  width: number,
  height: number,
): number[][] {
  const counts = Array.from({ length: height }, () =>
    new Array<number>(width).fill(0),
  );
  for (const p of tiling) {
    for (let dy = 0; dy < p.piece.h; dy++) {
      for (let dx = 0; dx < p.piece.w; dx++) {
        counts[p.y + dy][p.x + dx]++;
      }
    }
  }
  return counts;
}
