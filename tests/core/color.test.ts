import { describe, expect, it } from 'vitest';
import {
  hexToRgb,
  labDistanceSq,
  nearestPaletteColor,
  rgbToHex,
  rgbToLab,
} from '../../src/core/color';
import { defaultPalette } from '../../src/core/palette';

describe('rgbToLab', () => {
  it('maps pure white to approximately (100, 0, 0)', () => {
    const lab = rgbToLab(255, 255, 255);
    expect(lab.l).toBeCloseTo(100, 0);
    expect(Math.abs(lab.a)).toBeLessThan(1);
    expect(Math.abs(lab.b)).toBeLessThan(1);
  });

  it('maps pure black to approximately (0, 0, 0)', () => {
    const lab = rgbToLab(0, 0, 0);
    expect(lab.l).toBeCloseTo(0, 0);
    expect(Math.abs(lab.a)).toBeLessThan(1);
    expect(Math.abs(lab.b)).toBeLessThan(1);
  });
});

describe('labDistanceSq', () => {
  it('is zero for identical colors', () => {
    const a = rgbToLab(200, 30, 90);
    expect(labDistanceSq(a, a)).toBe(0);
  });

  it('is symmetric', () => {
    const a = rgbToLab(200, 30, 90);
    const b = rgbToLab(10, 220, 60);
    expect(labDistanceSq(a, b)).toBeCloseTo(labDistanceSq(b, a), 10);
  });
});

describe('hex conversion', () => {
  it('round-trips hex → rgb → hex', () => {
    const { r, g, b } = hexToRgb('#C91A09');
    expect({ r, g, b }).toEqual({ r: 201, g: 26, b: 9 });
    expect(rgbToHex(r, g, b)).toBe('#C91A09');
  });
});

describe('nearestPaletteColor', () => {
  it('picks Black for a #1B2A34-ish input', () => {
    const palette = defaultPalette();
    const hit = nearestPaletteColor(0x1d, 0x2c, 0x36, palette);
    expect(hit.id).toBe('black');
  });

  it('picks Bright Red for a #C91A09-ish input', () => {
    const palette = defaultPalette();
    const hit = nearestPaletteColor(0xc5, 0x1e, 0x0d, palette);
    expect(hit.id).toBe('bright-red');
  });
});
