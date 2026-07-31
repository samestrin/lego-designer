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
import { mosaicPlateWidth } from '../../src/core/types';

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
  return { fg: color, bg: color, split: 3, fgSide: 'left', error: 0 };
}

/** Mosaic of `rows` display rows, each `cellWidth` solid cells of `color`. */
function solidMosaic(cellWidth: number, rows: number, color: PaletteColor): Mosaic {
  return {
    cellWidth,
    rows,
    cells: Array.from({ length: cellWidth * rows }, () => solidCell(color)),
  };
}

/** 1 cell wide × `rows`, leftmost sub-pixel black, the other two white. */
function columnMosaic(rows: number): Mosaic {
  const cell: Cell = { fg: black, bg: white, split: 1, fgSide: 'left', error: 0 };
  return { cellWidth: 1, rows, cells: Array.from({ length: rows }, () => cell) };
}

/** Placements covering sub-pixel column x = 0, in scan order. */
function column0(tiling: { piece: { partNum: string }; x: number; y: number }[]) {
  return tiling.filter((p) => p.x === 0).map((p) => [p.piece.partNum, p.y]);
}

function halfBlackHalfWhite(): PixelData {
  // 24×12 source at cellWidth 4 → 2 rows of 4 cells (3.2:8 sub-pixel aspect).
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
  it('a 3×2 same-color block in family/block mode is one Brick 1×2 (3004)', () => {
    // 1 cell wide × 2 rows = 3×2 sub-pixels, all one color.
    const tiling = tileMosaic(solidMosaic(1, 2, black), 'family', 'block');
    expect(tiling).toHaveLength(1);
    expect(tiling[0]).toMatchObject({
      piece: { partNum: '3004', w: 3, h: 2 },
      x: 0,
      y: 0,
    });
    expect(tiling[0].color.id).toBe('black');
  });

  it('the same block in ansi mode is six Plate 1×1 (3024)', () => {
    const tiling = tileMosaic(solidMosaic(1, 2, black), 'family', 'ansi');
    expect(tiling).toHaveLength(6);
    for (const p of tiling) {
      expect(p.piece.partNum).toBe('3024');
    }
  });

  it('a 1×3 vertical run with the plates set is one 3023 over one 3024', () => {
    // Greedy places the 1×2 plate at rows 0–1, then the 1×1 plate at row 2.
    const tiling = tileMosaic(columnMosaic(3), 'plates', 'block');
    expect(column0(tiling)).toEqual([
      ['3023', 0],
      ['3024', 2],
    ]);
  });

  it('a 1×6 vertical run with the plates set is three 3023 plates', () => {
    const tiling = tileMosaic(columnMosaic(6), 'plates', 'block');
    expect(column0(tiling)).toEqual([
      ['3023', 0],
      ['3023', 2],
      ['3023', 4],
    ]);
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
  const width = mosaicPlateWidth(mosaic);
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
    const counts = coverageCounts(tiling, width, mosaic.rows);
    for (let y = 0; y < mosaic.rows; y++) {
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
    // 12×2 sub-pixels: 6 black + 6 white, each half two 3×2 bricks.
    const tiling = tileMosaic(mosaic, 'family', 'block');
    expect(tiling).toHaveLength(4);
    expect(tiling.map((p) => [p.piece.partNum, p.color.id, p.x, p.y])).toEqual([
      ['3004', 'black', 0, 0],
      ['3004', 'black', 3, 0],
      ['3004', 'white', 6, 0],
      ['3004', 'white', 9, 0],
    ]);
  });

  it('pieces never straddle a color change (checkerboard cells)', () => {
    // Alternating solid cells: 3-wide color runs, so only 3×1 bricks fit.
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
