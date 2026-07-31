import { describe, expect, it } from 'vitest';
import { adjustPixelData } from '../../src/core/adjust';
import type { PixelData } from '../../src/core/types';

function makePixels(colors: [number, number, number][]): PixelData {
  const data = new Uint8ClampedArray(colors.length * 4);
  colors.forEach(([r, g, b], i) => {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  });
  return { width: colors.length, height: 1, data };
}

describe('adjustPixelData', () => {
  it('is identity at zero contrast and saturation', () => {
    const px = makePixels([[100, 150, 200]]);
    expect(adjustPixelData(px, { contrast: 0, saturation: 0 })).toBe(px);
  });

  it('saturation -100 yields grayscale (channels equal luma)', () => {
    const px = makePixels([[200, 100, 50]]);
    const out = adjustPixelData(px, { saturation: -100 });
    const l = Math.round(0.299 * 200 + 0.587 * 100 + 0.114 * 50);
    expect(Math.abs(out.data[0] - l)).toBeLessThanOrEqual(1);
    expect(out.data[0]).toBe(out.data[1]);
    expect(out.data[1]).toBe(out.data[2]);
  });

  it('saturation +100 moves channels away from luma', () => {
    const px = makePixels([[200, 100, 100]]);
    const out = adjustPixelData(px, { saturation: 100 });
    expect(out.data[0]).toBeGreaterThan(200 - 1); // red channel boosted
    expect(out.data[1]).toBeLessThan(100); // green pushed down
  });

  it('contrast darkens dark and lightens light around the midpoint', () => {
    const px = makePixels([
      [60, 60, 60],
      [200, 200, 200],
    ]);
    const out = adjustPixelData(px, { contrast: 50 });
    expect(out.data[0]).toBeLessThan(60);
    expect(out.data[4]).toBeGreaterThan(200);
  });

  it('clamps to 0..255', () => {
    const px = makePixels([[250, 10, 128]]);
    const out = adjustPixelData(px, { contrast: 100, saturation: 100 });
    for (let c = 0; c < 3; c++) {
      expect(out.data[c]).toBeGreaterThanOrEqual(0);
      expect(out.data[c]).toBeLessThanOrEqual(255);
    }
  });

  it('preserves alpha and dimensions', () => {
    const px = makePixels([[10, 20, 30]]);
    const out = adjustPixelData(px, { contrast: 25, saturation: 25 });
    expect(out.width).toBe(1);
    expect(out.height).toBe(1);
    expect(out.data[3]).toBe(255);
  });
});
