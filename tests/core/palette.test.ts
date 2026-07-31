import { describe, expect, it } from 'vitest';
import {
  defaultPalette,
  enabledColors,
  validatePalette,
} from '../../src/core/palette';
import type { PaletteColor } from '../../src/core/types';

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

describe('defaultPalette', () => {
  it('loads 49 colors: 36 opaque + 13 trans', () => {
    const palette = defaultPalette();
    expect(palette).toHaveLength(49);
    expect(palette.filter((c) => c.translucent)).toHaveLength(13);
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

  it('marks opaque colors lego + enabled, trans colors lego + disabled', () => {
    for (const c of defaultPalette()) {
      expect(c.brand).toBe('lego');
      expect(c.enabled).toBe(!c.translucent);
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

  it('excludes trans colors by default, includes them when enabled', () => {
    const palette = defaultPalette();
    expect(enabledColors(palette).some((c) => c.translucent)).toBe(false);
    for (const c of palette) c.enabled = true;
    expect(enabledColors(palette).filter((c) => c.translucent)).toHaveLength(13);
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
