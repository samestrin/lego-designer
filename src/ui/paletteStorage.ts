/**
 * Palette persistence: the user's palette (toggles + custom colors) survives
 * reloads via localStorage. Anything unparseable or invalid falls back to
 * the curated defaults. Curated colors added after the user's palette was
 * stored (e.g. the trans colors) are merged in with their default state, so
 * returning users see new colors without losing their toggles/customs.
 */

import type { PaletteColor } from '../core/types';
import { defaultPalette, validatePalette } from '../core/palette';

const STORAGE_KEY = 'lego-designer-palette-v1';

export function loadStoredPalette(): PaletteColor[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPalette();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultPalette();
    const palette = parsed as PaletteColor[];
    if (
      palette.some(
        (c) =>
          typeof c?.id !== 'string' ||
          typeof c?.name !== 'string' ||
          typeof c?.hex !== 'string' ||
          typeof c?.brand !== 'string' ||
          typeof c?.enabled !== 'boolean',
      )
    ) {
      return defaultPalette();
    }
    if (validatePalette(palette).length > 0) return defaultPalette();
    // Merge in curated colors the stored palette predates.
    const storedIds = new Set(palette.map((c) => c.id));
    const merged = [
      ...palette,
      ...defaultPalette().filter((c) => !storedIds.has(c.id)),
    ];
    return merged;
  } catch {
    return defaultPalette();
  }
}

export function saveStoredPalette(palette: PaletteColor[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(palette));
  } catch {
    // Storage full or unavailable — palette just won't persist.
  }
}
