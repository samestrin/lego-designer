import { describe, expect, it } from 'vitest';
import { encodeMosaic } from '../../src/core/encoder';
import { generateGuide } from '../../src/core/guide';
import { defaultPalette } from '../../src/core/palette';
import { countParts, partsToCsv } from '../../src/core/partsList';
import { PIECES, tileMosaic } from '../../src/core/tiling';
import type { PixelData } from '../../src/core/types';
import { mosaicPlateWidth } from '../../src/core/types';

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
  it('prints header, piece set/mode, build+tip instructions, and a frame appendix', () => {
    const guide = generateGuide(testMosaic(), { set: 'family', mode: 'block' });
    expect(guide).toContain('LEGO DESIGNER — build guide');
    expect(guide).toContain('Grid: 4 cells × 2 rows (12 plates wide)');
    expect(guide).toContain('Piece set:');
    expect(guide).toContain('Mode: block');
    expect(guide).toContain('BUILD a standing wall 2 studs wide × 12 courses tall');
    expect(guide).toContain('tip it 90° clockwise');
    expect(guide).toContain('FRAME:');
  });

  it('lists pieces on their starting course only, with stud spans', () => {
    // family/block on the half-black fixture: four Brick 1×2 (3 courses × 2
    // studs), starting on courses 1, 4, 7, 10.
    const guide = generateGuide(testMosaic(), { set: 'family', mode: 'block' });
    const courseLines = guide.split('\n').filter((l) => l.startsWith('Course '));
    expect(courseLines).toEqual([
      'Course 001: Black Brick 1×2 (studs 1-2)',
      'Course 004: Black Brick 1×2 (studs 1-2)',
      'Course 007: White Brick 1×2 (studs 1-2)',
      'Course 010: White Brick 1×2 (studs 1-2)',
    ]);
  });

  it('uses singular "stud" for 1-stud pieces', () => {
    const guide = generateGuide(testMosaic(), { set: 'plates-1x1', mode: 'block' });
    expect(guide).toContain('Course 001: Black Plate 1×1 (stud 1), Black Plate 1×1 (stud 2)');
  });

  it('Parts line totals equal countParts per piece type', () => {
    const mosaic = testMosaic();
    const opts = { set: 'extended', mode: 'block' } as const;
    const guide = generateGuide(mosaic, opts);
    const partsLine = guide.split('\n').find((l) => l.startsWith('Parts: '))!;
    const guideTotals = new Map<string, number>();
    for (const m of partsLine.matchAll(/(\d+)× [^(]+ \((\d+)\)/g)) {
      guideTotals.set(m[2], Number(m[1]));
    }
    const counts = countParts(tileMosaic(mosaic, opts.set, opts.mode));
    const partTotals = new Map<string, number>();
    for (const { piece, count } of counts.values()) {
      partTotals.set(piece.partNum, (partTotals.get(piece.partNum) ?? 0) + count);
    }
    expect(guideTotals).toEqual(partTotals);
  });

  it('course listings reconstruct to exactly the full 3W×H grid', () => {
    const mosaic = testMosaic();
    const width = mosaicPlateWidth(mosaic);
    const guide = generateGuide(mosaic, { set: 'extended', mode: 'block' });
    const covered = Array.from({ length: mosaic.rows }, () =>
      new Array<number>(width).fill(0),
    );
    const byName = new Map(Object.values(PIECES).map((p) => [p.name, p]));
    for (const line of guide.split('\n')) {
      const courseMatch = /^Course (\d+): (.+)$/.exec(line);
      if (!courseMatch) continue;
      const x = Number(courseMatch[1]) - 1; // course 1 = sub-pixel x 0
      for (const m of courseMatch[2].matchAll(
        /((?:Plate|Brick) 1×\d) \((?:stud (\d+)|studs (\d+)-(\d+))\)/g,
      )) {
        const studA = Number(m[2] ?? m[3]);
        const studB = Number(m[2] ?? m[4]);
        const piece = byName.get(m[1])!;
        for (let dx = 0; dx < piece.w; dx++) {
          for (let y = studA - 1; y <= studB - 1; y++) {
            covered[y][x + dx]++;
          }
        }
      }
    }
    for (let y = 0; y < mosaic.rows; y++) {
      for (let x = 0; x < width; x++) {
        expect(covered[y][x]).toBe(1);
      }
    }
  });
});

describe('countParts / partsToCsv', () => {
  it('sorts by count descending', () => {
    const counts = countParts(tileMosaic(testMosaic(), 'plates-1x1', 'block'));
    const list = [...counts.values()].map((e) => e.count);
    expect(list).toEqual([...list].sort((a, b) => b - a));
  });

  it('keys entries by partNum:colorId and counts physical pieces', () => {
    const counts = countParts(tileMosaic(testMosaic(), 'family', 'block'));
    expect(counts.get('3004:black')).toMatchObject({ count: 2 });
    expect(counts.get('3004:white')).toMatchObject({ count: 2 });
    expect(counts.size).toBe(2);
  });

  it('writes a CSV header plus one row per piece+color', () => {
    // plates set on the half-black fixture: twelve 1×2 plates (one per
    // column, spanning both rows), 6 per color.
    const counts = countParts(tileMosaic(testMosaic(), 'plates', 'block'));
    const lines = partsToCsv(counts).split('\n');
    expect(lines[0]).toBe('part,id,name,hex,brand,count');
    expect(lines).toHaveLength(1 + counts.size);
    expect(lines).toContain('Plate 1×2 (3023),black,Black,#1B2A34,lego,6');
    expect(lines).toContain('Plate 1×2 (3023),white,White,#F4F4F4,lego,6');
  });
});
