/**
 * Palette management.
 *
 * The default palette is a curated set of current-production LEGO colors,
 * shipped as a JSON module so other brands can be added alongside later.
 */

import type { PaletteColor } from './types';
import legoPalette from './palette-lego.json';

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

/** Curated default LEGO palette, deep-copied so callers may mutate freely. */
export function defaultPalette(): PaletteColor[] {
  return legoPalette.map((c) => ({ ...c }));
}

export function enabledColors(palette: PaletteColor[]): PaletteColor[] {
  return palette.filter((c) => c.enabled);
}

/** Validate a palette; returns a list of problems (empty when valid). */
export function validatePalette(palette: PaletteColor[]): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const c of palette) {
    if (seen.has(c.id)) {
      problems.push(`duplicate id: ${c.id}`);
    }
    seen.add(c.id);
    if (!HEX_RE.test(c.hex)) {
      problems.push(`bad hex for ${c.id}: ${c.hex}`);
    }
  }
  return problems;
}
