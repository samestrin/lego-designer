import { describe, expect, it } from 'vitest';
import { encodeMosaic } from '../../src/core/encoder';
import { defaultPalette } from '../../src/core/palette';
import type {
  PieceSetId,
  TilingMode,
} from '../../src/core/tiling';
import {
  colorGrid,
  coverageCounts,
  tileMosaic,
} from '../../src/core/tiling';
import type { Cell, Mosaic, PaletteColor, PixelData } from '../../src/core/types';
import { mosaicCourseHeight } from '../../src/core/types';

const black: PaletteColor = {
  id: 'black',
  name: 'Black',
  hex: '#1B2A34',
  brand: 'lego',
  enabled: true,
};
const white: PaletteColor = {
  id: 'white',
  name: 'White',
  hex: '#F4F4F4',
  brand: 'lego',
  enabled: true,
};

function solidCell(color: PaletteColor): Cell {
  return { fg: color, bg: color, split: 3, fgSide: 'top', error: 0 };
}

/** Mosaic of `rows` cell rows, each `cellWidth` solid cells of `color`. */
function solidMosaic(cellWidth: number, rows: number, color: PaletteColor): Mosaic {
  return {
    cellWidth,
    rows,
    cells: Array.from({ length: cellWidth * rows }, () => solidCell(color)),
  };
}

/** `cellWidth` cells × 1 row, topmost sub-pixel black, the other two white. */
function rowMosaic(cellWidth: number): Mosaic {
  const cell: Cell = { fg: black, bg: white, split: 1, fgSide: 'top', error: 0 };
  return { cellWidth, rows: 1, cells: Array.from({ length: cellWidth }, () => cell) };
}

/** Placements covering sub-pixel row y = 0, in scan order. */
function row0(tiling: { piece: { partNum: string }; x: number; y: number }[]) {
  return tiling.filter((p) => p.y === 0).map((p) => [p.piece.partNum, p.x]);
}

function halfBlackHalfWhite(): PixelData {
  // 24×12 source at cellWidth 4 → 2 rows of 4 cells (8:9.6 cell aspect).
  const width = 24;
  const height = 12;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const v = x < 12 ? 0 : 255;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  return { width, height, data };
}

function testMosaic() {
  return encodeMosaic(halfBlackHalfWhite(), 4, defaultPalette(), {
    dither: false,
  });
}

describe('tileMosaic shapes', () => {
  it('a 2×3 same-color block in family/block mode is one Brick 1×2 (3004)', () => {
    // 2 cells wide × 1 row = 2 studs × 3 courses, all one color.
    const tiling = tileMosaic(solidMosaic(2, 1, black), 'family', 'block');
    expect(tiling).toHaveLength(1);
    expect(tiling[0]).toMatchObject({
      piece: { partNum: '3004', w: 2, h: 3 },
      x: 0,
      y: 0,
    });
    expect(tiling[0].color.id).toBe('black');
  });

  it('the same block in ansi mode is six Plate 1×1 (3024)', () => {
    const tiling = tileMosaic(solidMosaic(2, 1, black), 'family', 'ansi');
    expect(tiling).toHaveLength(6);
    for (const p of tiling) {
      expect(p.piece.partNum).toBe('3024');
    }
  });

  it('a 3×1 horizontal run with the plates set is one 3023 over one 3024', () => {
    // Greedy places the 1×2 plate at studs 1–2, then the 1×1 plate at stud 3.
    const tiling = tileMosaic(rowMosaic(3), 'plates', 'block');
    expect(row0(tiling)).toEqual([
      ['3023', 0],
      ['3024', 2],
    ]);
  });

  it('a 6×1 horizontal run with the plates set is three 3023 plates', () => {
    const tiling = tileMosaic(rowMosaic(6), 'plates', 'block');
    expect(row0(tiling)).toEqual([
      ['3023', 0],
      ['3023', 2],
      ['3023', 4],
    ]);
  });

  it('tall bricks tile their exact footprints in extended/block mode', () => {
    const cases: [number, number, string][] = [
      // [cellWidth, cell rows, expected part] — solid mosaics of exactly one part
      [2, 2, '3245'], // 2 studs × 6 courses = Brick 1×2×2
      [1, 3, '14716'], // 1 stud × 9 courses = Brick 1×1×3
      [2, 3, '22886'], // 2 studs × 9 courses = Brick 1×2×3
      [4, 3, '49311'], // 4 studs × 9 courses = Brick 1×4×3
      [1, 5, '2453'], // 1 stud × 15 courses = Brick 1×1×5
      [2, 5, '2454'], // 2 studs × 15 courses = Brick 1×2×5
    ];
    for (const [w, rows, partNum] of cases) {
      const tiling = tileMosaic(solidMosaic(w, rows, black), 'extended', 'block');
      expect(tiling).toHaveLength(1);
      expect(tiling[0].piece.partNum).toBe(partNum);
    }
  });

  it('a tall column mixes tall bricks with the remainder', () => {
    // 1 stud × 21 courses: 2453 (15) + 3005 (3) + 3005 (3) biggest-first.
    const tiling = tileMosaic(solidMosaic(1, 7, black), 'extended', 'block');
    const parts = tiling.map((p) => p.piece.partNum);
    expect(parts).toEqual(['2453', '3005', '3005']);
  });

  it('tall bricks are ignored in ansi mode and outside the extended set', () => {
    const ansi = tileMosaic(solidMosaic(1, 5, black), 'extended', 'ansi');
    for (const p of ansi) {
      expect(p.piece.partNum).toBe('3024');
    }
    const family = tileMosaic(solidMosaic(1, 5, black), 'family', 'block');
    for (const p of family) {
      expect(['3024', '3023', '3005', '3004']).toContain(p.piece.partNum);
    }
  });
});

describe('piece-set filtering', () => {
  it('plates-1x1 only ever places 3024, one per sub-pixel', () => {
    const mosaic = testMosaic();
    const tiling = tileMosaic(mosaic, 'plates-1x1', 'block');
    expect(tiling).toHaveLength(3 * mosaic.cellWidth * mosaic.rows);
    for (const p of tiling) {
      expect(p.piece.partNum).toBe('3024');
    }
  });

  it('plates never places bricks', () => {
    const tiling = tileMosaic(testMosaic(), 'plates', 'block');
    for (const p of tiling) {
      expect(['3024', '3023']).toContain(p.piece.partNum);
    }
  });
});

describe('tiling invariants on a real mosaic', () => {
  const mosaic = testMosaic();
  const width = mosaic.cellWidth;
  const height = mosaicCourseHeight(mosaic);
  const grid = colorGrid(mosaic);
  const combos: [PieceSetId, TilingMode][] = [
    ['plates-1x1', 'block'],
    ['plates', 'block'],
    ['family', 'block'],
    ['family', 'ansi'],
    ['extended', 'block'],
    ['extended', 'ansi'],
  ];

  it.each(combos)('%s/%s covers every sub-pixel exactly once', (setId, mode) => {
    const tiling = tileMosaic(mosaic, setId, mode);
    const counts = coverageCounts(tiling, width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        expect(counts[y][x]).toBe(1);
      }
    }
  });

  it.each(combos)('%s/%s places only monochrome pieces', (setId, mode) => {
    const tiling = tileMosaic(mosaic, setId, mode);
    for (const p of tiling) {
      for (let dy = 0; dy < p.piece.h; dy++) {
        for (let dx = 0; dx < p.piece.w; dx++) {
          expect(grid[p.y + dy][p.x + dx].id).toBe(p.color.id);
        }
      }
    }
  });

  it('is deterministic: same inputs give identical placements', () => {
    const a = tileMosaic(mosaic, 'extended', 'block');
    const b = tileMosaic(mosaic, 'extended', 'block');
    expect(b).toEqual(a);
  });

  it('half-black fixture in family/block is four Brick 1×2', () => {
    // 4×6 sub-pixels: 2 black + 2 white stud columns, each half two 2×3 bricks.
    const tiling = tileMosaic(mosaic, 'family', 'block');
    expect(tiling).toHaveLength(4);
    expect(tiling.map((p) => [p.piece.partNum, p.color.id, p.x, p.y])).toEqual([
      ['3004', 'black', 0, 0],
      ['3004', 'white', 2, 0],
      ['3004', 'black', 0, 3],
      ['3004', 'white', 2, 3],
    ]);
  });

  it('pieces never straddle a color change (checkerboard cells)', () => {
    // Alternating solid cells: 3-course color runs one stud wide, so only
    // 1×1 bricks fit.
    const cells: Cell[] = [];
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
        cells.push(solidCell((x + y) % 2 === 0 ? black : white));
      }
    }
    const tiling = tileMosaic({ cellWidth: 2, rows: 2, cells }, 'extended', 'block');
    expect(tiling).toHaveLength(4);
    for (const p of tiling) {
      expect(p.piece.partNum).toBe('3005');
    }
  });
});
