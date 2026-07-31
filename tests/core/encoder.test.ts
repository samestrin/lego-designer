import { describe, expect, it } from 'vitest';
import { encodeMosaic } from '../../src/core/encoder';
import { defaultPalette } from '../../src/core/palette';
import { countParts } from '../../src/core/partsList';
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
    // 12×10 source at cellWidth 4 → 12 sub-pixels wide; rows =
    // round(10 * 12 * 0.4 / 12) = 4 (sub-pixel aspect 3.2:8).
    const pixels = makePixels(12, 10, solid(0xc9, 0x1a, 0x09));
    const mosaic = encodeMosaic(pixels, 4, defaultPalette(), {
      dither: false,
    });

    expect(mosaic.cellWidth).toBe(4);
    expect(mosaic.rows).toBe(4);
    expect(mosaic.cells).toHaveLength(16);
    for (const cell of mosaic.cells) {
      expect(cell.split).toBe(3);
      expect(cell.fg.id).toBe('bright-red');
      expect(cell.bg.id).toBe('bright-red');
      expect(cell.error).toBeLessThan(0.001);
    }
  });

  it('encodes a black-left / white-right image with correct halves and plate counts', () => {
    // 24×12 source → rows = round(12 * 12 * 0.4 / 24) = 2.
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

    const counts = countParts(mosaic);
    const total = [...counts.values()].reduce((s, e) => s + e.count, 0);
    expect(total).toBe(3 * mosaic.cellWidth * mosaic.rows);
    expect(counts.get('plate:black')?.count).toBe(12);
    expect(counts.get('plate:white')?.count).toBe(12);
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
});
