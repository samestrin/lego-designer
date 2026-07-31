import { describe, expect, it } from 'vitest';
import {
  defaultPalette,
  enabledColors,
  validatePalette,
} from '../../src/core/palette';
import type { PaletteColor } from '../../src/core/types';

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

describe('defaultPalette', () => {
  it('loads 36 colors', () => {
    expect(defaultPalette()).toHaveLength(36);
  });

  it('has valid #RRGGBB hex for every color', () => {
    for (const c of defaultPalette()) {
      expect(c.hex).toMatch(HEX_RE);
    }
  });

  it('has unique ids', () => {
    const ids = defaultPalette().map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('marks every color lego + enabled', () => {
    for (const c of defaultPalette()) {
      expect(c.brand).toBe('lego');
      expect(c.enabled).toBe(true);
    }
  });

  it('returns a deep copy on each call', () => {
    const a = defaultPalette();
    a[0].hex = '#000000';
    expect(defaultPalette()[0].hex).not.toBe('#000000');
  });
});

describe('enabledColors', () => {
  it('filters out disabled colors', () => {
    const palette = defaultPalette();
    palette[0].enabled = false;
    expect(enabledColors(palette)).toHaveLength(35);
  });
});

describe('validatePalette', () => {
  it('accepts the default palette', () => {
    expect(validatePalette(defaultPalette())).toEqual([]);
  });

  it('flags a duplicate id', () => {
    const palette: PaletteColor[] = [
      { id: 'x', name: 'X', hex: '#112233', brand: 'lego', enabled: true },
      { id: 'x', name: 'X2', hex: '#445566', brand: 'lego', enabled: true },
    ];
    const problems = validatePalette(palette);
    expect(problems.some((p) => p.includes('duplicate id'))).toBe(true);
  });

  it('flags a bad hex', () => {
    const palette: PaletteColor[] = [
      { id: 'y', name: 'Y', hex: 'red', brand: 'lego', enabled: true },
    ];
    const problems = validatePalette(palette);
    expect(problems.some((p) => p.includes('bad hex'))).toBe(true);
  });
});
