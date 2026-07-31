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
}

const STORAGE_KEY = 'lego-designer-options-v1';

export const DEFAULT_OPTIONS: DesignerOptions = {
  setId: 'family',
  mode: 'block',
  viewMode: 'tipped',
};

const MODES: TilingMode[] = ['block', 'ansi'];
const VIEW_MODES: ViewMode[] = ['tipped', 'building', 'both'];

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
