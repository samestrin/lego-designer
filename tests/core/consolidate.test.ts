import { describe, expect, it } from 'vitest';
import { consolidateRow, rowPlates } from '../../src/core/consolidate';
import { encodeMosaic } from '../../src/core/encoder';
import { generateGuide } from '../../src/core/guide';
import { defaultPalette } from '../../src/core/palette';
import { countParts, partsToCsv } from '../../src/core/partsList';
import type { PaletteColor, PixelData } from '../../src/core/types';

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

function run(color: PaletteColor, n: number): PaletteColor[] {
  return Array.from({ length: n }, () => color);
}

/** Compact segment signature: e.g. '2b' = 2 bricks, '1p' = 1 plate. */
function signature(plates: PaletteColor[]): string[] {
  return consolidateRow(plates).map(
    (s) => `${s.color.name}:${s.pieces}${s.part === 'brick' ? 'b' : 'p'}`,
  );
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

describe('consolidateRow', () => {
  it('handles every run length 1–7', () => {
    expect(signature(run(black, 1))).toEqual(['Black:1p']);
    expect(signature(run(black, 2))).toEqual(['Black:2p']);
    expect(signature(run(black, 3))).toEqual(['Black:1b']);
    expect(signature(run(black, 4))).toEqual(['Black:1b', 'Black:1p']);
    expect(signature(run(black, 5))).toEqual(['Black:1b', 'Black:2p']);
    expect(signature(run(black, 6))).toEqual(['Black:2b']);
    expect(signature(run(black, 7))).toEqual(['Black:2b', 'Black:1p']);
  });

  it('only consolidates within maximal same-color runs', () => {
    // 2 black + 2 white: no run reaches 3, so all plates.
    expect(signature([...run(black, 2), ...run(white, 2)])).toEqual([
      'Black:2p',
      'White:2p',
    ]);
    // Alternating colors break runs even when a color totals ≥ 3.
    const alternating = [black, white, black, white, black, white];
    expect(signature(alternating)).toEqual([
      'Black:1p',
      'White:1p',
      'Black:1p',
      'White:1p',
      'Black:1p',
      'White:1p',
    ]);
  });

  it('sum of covered plates always equals the input length', () => {
    const patterns = [
      [],
      run(black, 1),
      run(black, 11),
      [...run(black, 7), ...run(white, 4), ...run(black, 3)],
      [black, white, black, white, black, white],
      [...run(black, 2), ...run(white, 9), ...run(black, 1)],
    ];
    for (const plates of patterns) {
      const covered = consolidateRow(plates).reduce((n, s) => n + s.plates, 0);
      expect(covered).toBe(plates.length);
    }
  });

  it('a brick segment covers 3 plates per piece, a plate segment 1', () => {
    for (const seg of consolidateRow(run(black, 8))) {
      expect(seg.plates).toBe(seg.pieces * (seg.part === 'brick' ? 3 : 1));
    }
  });
});

describe('consolidation on a real mosaic', () => {
  it('each row of the half-black fixture is 2 black bricks + 2 white bricks', () => {
    const mosaic = testMosaic();
    expect(mosaic.rows).toBe(2);
    for (let y = 0; y < mosaic.rows; y++) {
      expect(signature(rowPlates(mosaic, y))).toEqual([
        'Black:2b',
        'White:2b',
      ]);
    }
  });

  it('countParts with consolidate counts physical pieces per part+color', () => {
    const counts = countParts(testMosaic(), { consolidate: true });
    expect(counts.get('brick:black')).toMatchObject({ part: 'brick', count: 4 });
    expect(counts.get('brick:white')).toMatchObject({ part: 'brick', count: 4 });
    expect(counts.size).toBe(2);
    // Physical invariant: plates + 3×bricks == 3*W*H.
    let plates = 0;
    let bricks = 0;
    for (const { part, count } of counts.values()) {
      if (part === 'brick') bricks += count;
      else plates += count;
    }
    const mosaic = testMosaic();
    expect(plates + 3 * bricks).toBe(3 * mosaic.cellWidth * mosaic.rows);
  });

  it('CSV labels parts and counts bricks as single pieces', () => {
    const lines = partsToCsv(countParts(testMosaic(), { consolidate: true })).split('\n');
    expect(lines[0]).toBe('part,id,name,hex,brand,count');
    expect(lines).toContain('brick (3005),black,Black,#1B2A34,lego,4');
  });

  it('guide with consolidate lists brick parts and segment runs', () => {
    const mosaic = testMosaic();
    const guide = generateGuide(mosaic, { consolidate: true });
    expect(guide).toContain('Parts: 8× 1×1 brick (3005)');
    expect(guide).toContain('Row 01: 2×Black brick, 2×White brick');
    expect(guide).toContain(
      'Runs of 3 same-color plates are merged into 1×1 bricks (3005)',
    );
    // Header math agrees with countParts.
    const counts = countParts(mosaic, { consolidate: true });
    const total = [...counts.values()].reduce((s, e) => s + e.count, 0);
    const m = /Parts: (\d+)× 1×1 brick \(3005\)/.exec(guide);
    expect(Number(m![1])).toBe(total);
  });

  it('guide with consolidate keeps row coverage at 3W sub-pixels', () => {
    const mosaic = testMosaic();
    const guide = generateGuide(mosaic, { consolidate: true });
    for (const line of guide.split('\n').filter((l) => l.startsWith('Row '))) {
      let covered = 0;
      for (const m of line.matchAll(/(\d+)×[^,]+ (brick|plate)/g)) {
        covered += Number(m[1]) * (m[2] === 'brick' ? 3 : 1);
      }
      expect(covered).toBe(3 * mosaic.cellWidth);
    }
  });

  it('consolidate-off guide is unchanged in format', () => {
    const guide = generateGuide(testMosaic());
    expect(guide).toContain('Parts: 24× 1×1 plate (3024)');
    expect(guide).toContain('Row 01: 6×Black, 6×White');
    expect(guide).not.toContain('brick (3005)');
    expect(guide).not.toContain('×Black brick');
  });
});
