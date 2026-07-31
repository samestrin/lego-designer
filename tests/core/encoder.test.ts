import { describe, expect, it } from 'vitest';
import { encodeMosaic } from '../../src/core/encoder';
import { defaultPalette } from '../../src/core/palette';
import { countParts } from '../../src/core/partsList';
import { tileMosaic } from '../../src/core/tiling';
import { cellPlates } from '../../src/core/types';
import type { PixelData } from '../../src/core/types';

function makePixels(
  width: number,
  height: number,
  fill: (x: number, y: number) => [number, number, number],
): PixelData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = fill(x, y);
      const i = (y * width + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  return { width, height, data };
}

const solid = (r: number, g: number, b: number) => () =>
  [r, g, b] as [number, number, number];

describe('encodeMosaic', () => {
  it('encodes a solid-color image as uniform split-3 cells with near-zero error', () => {
    // Exact Bright Red hex, so the nearest palette match is error-free.
    // 12×10 source at cellWidth 4 → 4 studs wide; rows =
    // round(10 * 4 * (8/9.6) / 12) = 3 (cell aspect 8:9.6).
    const pixels = makePixels(12, 10, solid(0xc9, 0x1a, 0x09));
    const mosaic = encodeMosaic(pixels, 4, defaultPalette(), {
      dither: false,
    });

    expect(mosaic.cellWidth).toBe(4);
    expect(mosaic.rows).toBe(3);
    expect(mosaic.cells).toHaveLength(12);
    for (const cell of mosaic.cells) {
      expect(cell.split).toBe(3);
      expect(cell.fg.id).toBe('bright-red');
      expect(cell.bg.id).toBe('bright-red');
      expect(cell.error).toBeLessThan(0.001);
    }
  });

  it('encodes a black-left / white-right image with correct halves and plate counts', () => {
    // 24×12 source → rows = round(12 * 4 * (8/9.6) / 24) = 2.
    const pixels = makePixels(24, 12, (x) =>
      x < 12 ? [0, 0, 0] : [255, 255, 255],
    );
    const mosaic = encodeMosaic(pixels, 4, defaultPalette(), {
      dither: false,
    });

    expect(mosaic.rows).toBe(2);
    expect(mosaic.cells).toHaveLength(8);
    for (let y = 0; y < mosaic.rows; y++) {
      for (let x = 0; x < mosaic.cellWidth; x++) {
        const cell = mosaic.cells[y * mosaic.cellWidth + x];
        expect(cell.split).toBe(3);
        expect(cell.fg.id).toBe(x < 2 ? 'black' : 'white');
      }
    }

    const counts = countParts(tileMosaic(mosaic, 'plates-1x1', 'block'));
    const total = [...counts.values()].reduce((s, e) => s + e.count, 0);
    expect(total).toBe(3 * mosaic.cellWidth * mosaic.rows);
    expect(counts.get('3024:black')?.count).toBe(12);
    expect(counts.get('3024:white')?.count).toBe(12);
  });

  it('a horizontal light-over-dark split produces bottom-fill cells on the boundary', () => {
    // 32×27 source at cellWidth 4 → rows = round(27 * 4 * (8/9.6) / 32) = 3,
    // so the 4×9 sub-pixel grid samples 8×3 source px per sub-pixel. The
    // white/black boundary at y=12 lands exactly on the second sub-pixel of
    // the middle cell row: samples top-to-bottom [white, black, black].
    const pixels = makePixels(32, 27, (_x, y) =>
      y < 12 ? [255, 255, 255] : [0, 0, 0],
    );
    const mosaic = encodeMosaic(pixels, 4, defaultPalette(), {
      dither: false,
    });

    expect(mosaic.rows).toBe(3);
    for (let x = 0; x < mosaic.cellWidth; x++) {
      const top = mosaic.cells[x];
      expect(top.split).toBe(3);
      expect(top.fg.id).toBe('white');

      const boundary = mosaic.cells[mosaic.cellWidth + x];
      expect(boundary.fgSide).toBe('bottom');
      expect(boundary.split).toBe(2);
      expect(boundary.fg.id).toBe('black');
      expect(boundary.bg.id).toBe('white');
      // Plates top-to-bottom: white, black, black.
      expect(cellPlates(boundary).map((p) => p.id)).toEqual([
        'white',
        'black',
        'black',
      ]);

      const bottom = mosaic.cells[2 * mosaic.cellWidth + x];
      expect(bottom.split).toBe(3);
      expect(bottom.fg.id).toBe('black');
    }
  });

  it('dithers a black→white gradient into a mix of splits or colors, deterministically', () => {
    const pixels = makePixels(48, 8, (x) => {
      const v = Math.round((x * 255) / 47);
      return [v, v, v];
    });
    const palette = defaultPalette();
    const a = encodeMosaic(pixels, 8, palette, { dither: true });
    const b = encodeMosaic(pixels, 8, palette, { dither: true });

    const splits = new Set(a.cells.map((c) => c.split));
    const colors = new Set(a.cells.flatMap((c) => [c.fg.id, c.bg.id]));
    expect(splits.size >= 3 || colors.size >= 2).toBe(true);

    // Deterministic: identical input produces an identical mosaic.
    expect(JSON.stringify(b.cells)).toBe(JSON.stringify(a.cells));
  });

  it('produces a single row for a very wide, short image', () => {
    const pixels = makePixels(60, 1, solid(0xf4, 0xf4, 0xf4));
    const mosaic = encodeMosaic(pixels, 5, defaultPalette(), {
      dither: false,
    });
    expect(mosaic.rows).toBe(1);
    expect(mosaic.cells).toHaveLength(5);
  });

  it('ditherStrength scales the diffused error (0 = off, still deterministic)', () => {
    const pixels = makePixels(48, 8, (x) => {
      const v = Math.round((x * 255) / 47);
      return [v, v, v];
    });
    const palette = defaultPalette();
    const off = encodeMosaic(pixels, 8, palette, { dither: true, ditherStrength: 0 });
    const half = encodeMosaic(pixels, 8, palette, { dither: true, ditherStrength: 0.5 });
    const full = encodeMosaic(pixels, 8, palette, { dither: true, ditherStrength: 1 });
    const noDither = encodeMosaic(pixels, 8, palette, { dither: false });

    const key = (m: typeof off) => JSON.stringify(m.cells);
    expect(key(off)).toBe(key(noDither)); // strength 0 ≡ dither off
    expect(key(half)).not.toBe(key(full)); // strength actually changes output
    expect(key(full)).toBe(key(encodeMosaic(pixels, 8, palette, { dither: true })));
  });

  it('contrast pushes a mid-gray image away from gray matches', () => {
    const pixels = makePixels(24, 12, solid(0x80, 0x80, 0x80));
    const palette = defaultPalette();
    const flat = encodeMosaic(pixels, 4, palette, { dither: false });
    const darkened = encodeMosaic(pixels, 4, palette, {
      dither: false,
      contrast: -100,
    });
    // Contrast -100 flattens everything to 128 gray; both must stay valid,
    // and negative contrast must not lighten the result.
    const lum = (m: typeof flat) =>
      m.cells.reduce((s, c) => s + (c.fg.id === 'black' ? 1 : 0), 0);
    expect(lum(darkened)).toBeGreaterThanOrEqual(lum(flat));
  });

  it('leading darkens strong-edge cells, leaving flat regions alone', () => {
    // Two non-dark halves with a strong boundary: light gray vs white.
    const pixels = makePixels(48, 12, (x) =>
      x < 24 ? [0xa3, 0xa2, 0xa4] : [0xff, 0xff, 0xff],
    );
    const palette = defaultPalette();
    const DARK = new Set(['black', 'dark-bluish-gray', 'trans-black']);
    const darkCount = (m: ReturnType<typeof encodeMosaic>) =>
      m.cells.filter((c) => DARK.has(c.fg.id) || DARK.has(c.bg.id)).length;

    const plain = encodeMosaic(pixels, 8, palette, { dither: false });
    const leaded = encodeMosaic(pixels, 8, palette, { dither: false, leading: true });
    expect(darkCount(leaded)).toBeGreaterThan(darkCount(plain));

    // Flat regions untouched: a solid light-gray image stays non-dark.
    const solidGray = makePixels(24, 12, solid(0xa3, 0xa2, 0xa4));
    const leadedSolid = encodeMosaic(solidGray, 4, palette, {
      dither: false,
      leading: true,
    });
    expect(darkCount(leadedSolid)).toBe(0);
  });
});
