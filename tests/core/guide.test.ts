import { describe, expect, it } from 'vitest';
import { encodeMosaic } from '../../src/core/encoder';
import { generateGuide } from '../../src/core/guide';
import { defaultPalette } from '../../src/core/palette';
import { countParts, partsToCsv } from '../../src/core/partsList';
import type { PixelData } from '../../src/core/types';

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

describe('generateGuide', () => {
  it('prints header, one line per row, and a frame appendix', () => {
    const guide = generateGuide(testMosaic());
    expect(guide).toContain('LEGO DESIGNER — build guide');
    expect(guide).toContain('Grid: 4 cells × 2 rows (12 plates wide)');
    expect(guide).toContain('Parts: 24× 1×1 plate (3024)');
    expect(guide).toContain('Row 01:');
    expect(guide).toContain('Row 02:');
    expect(guide).toContain('FRAME:');
  });

  it('row run-lengths sum to 3W for every row', () => {
    const mosaic = testMosaic();
    const guide = generateGuide(mosaic);
    const rowLines = guide.split('\n').filter((l) => l.startsWith('Row '));
    expect(rowLines).toHaveLength(mosaic.rows);
    for (const line of rowLines) {
      let sum = 0;
      for (const m of line.matchAll(/(\d+)×[^,]+/g)) {
        sum += Number(m[1]);
      }
      expect(sum).toBe(3 * mosaic.cellWidth);
    }
  });

  it('parts total in the guide matches countParts', () => {
    const mosaic = testMosaic();
    const guide = generateGuide(mosaic);
    const m = /Parts: (\d+)× 1×1 plate/.exec(guide);
    expect(m).not.toBeNull();
    const counts = countParts(mosaic);
    const total = [...counts.values()].reduce((s, e) => s + e.count, 0);
    expect(Number(m![1])).toBe(total);
  });
});

describe('countParts / partsToCsv', () => {
  it('sorts by count descending', () => {
    const counts = countParts(testMosaic());
    const list = [...counts.values()].map((e) => e.count);
    expect(list).toEqual([...list].sort((a, b) => b - a));
  });

  it('writes a CSV header plus one row per color used', () => {
    const counts = countParts(testMosaic());
    const lines = partsToCsv(counts).split('\n');
    expect(lines[0]).toBe('part,id,name,hex,brand,count');
    expect(lines).toHaveLength(1 + counts.size);
    expect(lines[1]).toMatch(/^plate \(3024\),black,Black,#1B2A34,lego,12$/);
  });
});
