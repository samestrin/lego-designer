/**
 * Options persistence: piece set, tiling mode, and preview view mode survive
 * reloads via localStorage. Anything unparseable or invalid falls back to
 * the defaults.
 */

import type { PieceSetId, TilingMode } from '../core/tiling';
import { PIECE_SETS } from '../core/tiling';

export type ViewMode = 'tipped' | 'building' | 'both';

export interface DesignerOptions {
  setId: PieceSetId;
  mode: TilingMode;
  viewMode: ViewMode;
  /** 0–100; 0 = dither off. */
  ditherStrength: number;
  /** -100..100; 0 = unchanged. */
  contrast: number;
  saturation: number;
  leading: boolean;
}

const STORAGE_KEY = 'lego-designer-options-v1';

export const DEFAULT_OPTIONS: DesignerOptions = {
  setId: 'family',
  mode: 'block',
  viewMode: 'tipped',
  ditherStrength: 100,
  contrast: 0,
  saturation: 0,
  leading: false,
};

const MODES: TilingMode[] = ['block', 'ansi'];
const VIEW_MODES: ViewMode[] = ['tipped', 'building', 'both'];

function clampNum(v: unknown, lo: number, hi: number, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v)
    ? Math.min(hi, Math.max(lo, v))
    : fallback;
}

export function loadStoredOptions(): DesignerOptions {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_OPTIONS;
    const parsed = JSON.parse(raw) as Partial<DesignerOptions>;
    return {
      setId:
        typeof parsed.setId === 'string' && parsed.setId in PIECE_SETS
          ? (parsed.setId as PieceSetId)
          : DEFAULT_OPTIONS.setId,
      mode: MODES.includes(parsed.mode as TilingMode)
        ? (parsed.mode as TilingMode)
        : DEFAULT_OPTIONS.mode,
      viewMode: VIEW_MODES.includes(parsed.viewMode as ViewMode)
        ? (parsed.viewMode as ViewMode)
        : DEFAULT_OPTIONS.viewMode,
      ditherStrength: clampNum(parsed.ditherStrength, 0, 100, DEFAULT_OPTIONS.ditherStrength),
      contrast: clampNum(parsed.contrast, -100, 100, DEFAULT_OPTIONS.contrast),
      saturation: clampNum(parsed.saturation, -100, 100, DEFAULT_OPTIONS.saturation),
      leading: typeof parsed.leading === 'boolean' ? parsed.leading : DEFAULT_OPTIONS.leading,
    };
  } catch {
    return DEFAULT_OPTIONS;
  }
}

export function saveStoredOptions(opts: DesignerOptions): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(opts));
  } catch {
    // Storage full or unavailable — options just won't persist.
  }
}
