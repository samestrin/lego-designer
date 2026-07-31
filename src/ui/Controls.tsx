import { useMemo } from 'react';
import type { Mosaic } from '../core/types';
import { displayHeightMm, displayWidthMm } from '../core/types';
import type { PieceSetId, Placement, TilingMode } from '../core/tiling';
import { PIECE_SETS } from '../core/tiling';
import type { ViewMode } from './optionsStorage';

interface ControlsProps {
  cellWidth: number;
  onCellWidth: (n: number) => void;
  ditherStrength: number;
  onDitherStrength: (n: number) => void;
  contrast: number;
  onContrast: (n: number) => void;
  saturation: number;
  onSaturation: (n: number) => void;
  leading: boolean;
  onLeading: (b: boolean) => void;
  setId: PieceSetId;
  onSetId: (s: PieceSetId) => void;
  mode: TilingMode;
  onMode: (m: TilingMode) => void;
  viewMode: ViewMode;
  onViewMode: (v: ViewMode) => void;
  offsetX: number;
  offsetY: number;
  onOffsets: (x: number, y: number) => void;
  showMismatches: boolean;
  onShowMismatches: (b: boolean) => void;
  mismatchCount: number;
  mosaic: Mosaic | null;
  tiling: Placement[] | null;
  onOpenPalette: () => void;
}

const MM_PER_INCH = 25.4;

const selectClass =
  'w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-300 hover:border-amber-500';

export function Controls(props: ControlsProps) {
  const {
    cellWidth,
    onCellWidth,
    ditherStrength,
    onDitherStrength,
    contrast,
    onContrast,
    saturation,
    onSaturation,
    leading,
    onLeading,
    setId,
    onSetId,
    mode,
    onMode,
    viewMode,
    onViewMode,
    offsetX,
    offsetY,
    onOffsets,
    showMismatches,
    onShowMismatches,
    mismatchCount,
    mosaic,
    tiling,
    onOpenPalette,
  } = props;

  const widthMm = cellWidth * 9.6;
  const sizeLabel = mosaic
    ? `${(widthMm / MM_PER_INCH).toFixed(1)}" × ${(displayHeightMm(mosaic) / MM_PER_INCH).toFixed(1)}" · ${displayWidthMm(mosaic)} × ${displayHeightMm(mosaic)} mm`
    : `${(widthMm / MM_PER_INCH).toFixed(1)}" wide`;

  const pieceCounts = useMemo(() => {
    if (!tiling) return null;
    const byPart = new Map<string, number>();
    for (const p of tiling) {
      byPart.set(p.piece.partNum, (byPart.get(p.piece.partNum) ?? 0) + 1);
    }
    const breakdown = [...byPart.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([partNum, n]) => `${n.toLocaleString()}×${partNum}`)
      .join(', ');
    return { total: tiling.length, breakdown };
  }, [tiling]);

  return (
    <div className="flex flex-col gap-5 p-3 text-sm">
      <section>
        <label htmlFor="cell-width" className="mb-1 block text-neutral-300">
          Width: {cellWidth} cells = {cellWidth * 3} plates wide
        </label>
        <input
          id="cell-width"
          type="range"
          min={8}
          max={64}
          step={1}
          value={cellWidth}
          onChange={(e) => onCellWidth(Number(e.target.value))}
          className="w-full accent-amber-500"
        />
        <p className="mt-1 text-xs text-neutral-500">
          display {sizeLabel}
          {pieceCounts && (
            <>
              {' '}
              · {pieceCounts.total.toLocaleString()} pieces (
              {pieceCounts.breakdown})
            </>
          )}
        </p>
      </section>

      <section>
        <label htmlFor="piece-set" className="mb-1 block text-neutral-300">
          Piece set
        </label>
        <select
          id="piece-set"
          value={setId}
          onChange={(e) => onSetId(e.target.value as PieceSetId)}
          className={selectClass}
        >
          {Object.entries(PIECE_SETS).map(([id, set]) => (
            <option key={id} value={id}>
              {set.label}
            </option>
          ))}
        </select>
      </section>

      <section>
        <label htmlFor="tiling-mode" className="mb-1 block text-neutral-300">
          Mode
        </label>
        <select
          id="tiling-mode"
          value={mode}
          onChange={(e) => onMode(e.target.value as TilingMode)}
          className={selectClass}
        >
          <option value="block">Block (fewest pieces)</option>
          <option value="ansi">ANSI (seam texture)</option>
        </select>
      </section>

      <section>
        <label htmlFor="view-mode" className="mb-1 block text-neutral-300">
          Preview
        </label>
        <select
          id="view-mode"
          value={viewMode}
          onChange={(e) => onViewMode(e.target.value as ViewMode)}
          className={selectClass}
        >
          <option value="tipped">Tipped (display)</option>
          <option value="building">Building (wall)</option>
          <option value="both">Side by side</option>
        </select>
      </section>

      <section>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-neutral-300">Image</span>
          <button
            type="button"
            onClick={() => {
              onContrast(0);
              onSaturation(0);
              onDitherStrength(100);
            }}
            className="rounded border border-neutral-700 px-2 py-0.5 text-xs text-neutral-400 hover:border-amber-500 hover:text-amber-400"
          >
            reset
          </button>
        </div>
        <label htmlFor="contrast" className="mb-0.5 block text-xs text-neutral-500">
          contrast ({contrast > 0 ? '+' : ''}{contrast})
        </label>
        <input
          id="contrast"
          type="range"
          min={-100}
          max={100}
          step={5}
          value={contrast}
          onChange={(e) => onContrast(Number(e.target.value))}
          className="w-full accent-amber-500"
        />
        <label htmlFor="saturation" className="mt-2 mb-0.5 block text-xs text-neutral-500">
          saturation ({saturation > 0 ? '+' : ''}{saturation})
        </label>
        <input
          id="saturation"
          type="range"
          min={-100}
          max={100}
          step={5}
          value={saturation}
          onChange={(e) => onSaturation(Number(e.target.value))}
          className="w-full accent-amber-500"
        />
        <label htmlFor="dither-strength" className="mt-2 mb-0.5 block text-xs text-neutral-500">
          dither, Floyd–Steinberg ({ditherStrength === 0 ? 'off' : `${ditherStrength}%`})
        </label>
        <input
          id="dither-strength"
          type="range"
          min={0}
          max={100}
          step={5}
          value={ditherStrength}
          onChange={(e) => onDitherStrength(Number(e.target.value))}
          className="w-full accent-amber-500"
        />
      </section>

      <section className="flex items-center gap-2">
        <input
          id="leading"
          type="checkbox"
          checked={leading}
          onChange={(e) => onLeading(e.target.checked)}
          className="accent-amber-500"
        />
        <label htmlFor="leading" className="text-neutral-300">
          Leading (black outlines, stained glass)
        </label>
      </section>

      <section>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-neutral-300">Crop offset</span>
          <button
            type="button"
            onClick={() => onOffsets(0, 0)}
            className="rounded border border-neutral-700 px-2 py-0.5 text-xs text-neutral-400 hover:border-amber-500 hover:text-amber-400"
          >
            center
          </button>
        </div>
        <label htmlFor="offset-x" className="mb-0.5 block text-xs text-neutral-500">
          shift horizontal ({offsetX.toFixed(2)})
        </label>
        <input
          id="offset-x"
          type="range"
          min={-1}
          max={1}
          step={0.05}
          value={offsetX}
          onChange={(e) => onOffsets(Number(e.target.value), offsetY)}
          className="w-full accent-amber-500"
        />
        <label htmlFor="offset-y" className="mt-2 mb-0.5 block text-xs text-neutral-500">
          shift vertical ({offsetY.toFixed(2)})
        </label>
        <input
          id="offset-y"
          type="range"
          min={-1}
          max={1}
          step={0.05}
          value={offsetY}
          onChange={(e) => onOffsets(offsetX, Number(e.target.value))}
          className="w-full accent-amber-500"
        />
      </section>

      <section className="flex items-center gap-2">
        <input
          id="mismatches"
          type="checkbox"
          checked={showMismatches}
          onChange={(e) => onShowMismatches(e.target.checked)}
          className="accent-amber-500"
        />
        <label htmlFor="mismatches" className="text-neutral-300">
          Highlight poor matches
          {showMismatches && mosaic && (
            <span className="ml-1 text-xs text-red-400">
              ({mismatchCount} {mismatchCount === 1 ? 'cell' : 'cells'})
            </span>
          )}
        </label>
      </section>

      <section>
        <button
          type="button"
          onClick={onOpenPalette}
          className="w-full rounded border border-neutral-700 px-2 py-1.5 text-neutral-300 hover:border-amber-500 hover:text-amber-400"
        >
          Edit palette…
        </button>
      </section>
    </div>
  );
}
