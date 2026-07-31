import { useMemo } from 'react';
import type { Mosaic } from '../core/types';
import { displayHeightMm, displayWidthMm, totalPlates } from '../core/types';
import { countParts } from '../core/partsList';

interface ControlsProps {
  cellWidth: number;
  onCellWidth: (n: number) => void;
  dither: boolean;
  onDither: (b: boolean) => void;
  consolidate: boolean;
  onConsolidate: (b: boolean) => void;
  offsetX: number;
  offsetY: number;
  onOffsets: (x: number, y: number) => void;
  showMismatches: boolean;
  onShowMismatches: (b: boolean) => void;
  mismatchCount: number;
  mosaic: Mosaic | null;
  onOpenPalette: () => void;
}

const MM_PER_INCH = 25.4;

export function Controls(props: ControlsProps) {
  const {
    cellWidth,
    onCellWidth,
    dither,
    onDither,
    consolidate,
    onConsolidate,
    offsetX,
    offsetY,
    onOffsets,
    showMismatches,
    onShowMismatches,
    mismatchCount,
    mosaic,
    onOpenPalette,
  } = props;

  const widthMm = cellWidth * 9.6;
  const sizeLabel = mosaic
    ? `${(widthMm / MM_PER_INCH).toFixed(1)}" × ${(displayHeightMm(mosaic) / MM_PER_INCH).toFixed(1)}" · ${displayWidthMm(mosaic)} × ${displayHeightMm(mosaic)} mm`
    : `${(widthMm / MM_PER_INCH).toFixed(1)}" wide`;

  const pieceCounts = useMemo(() => {
    if (!mosaic || !consolidate) return null;
    let plates = 0;
    let bricks = 0;
    for (const { part, count } of countParts(mosaic, { consolidate }).values()) {
      if (part === 'brick') bricks += count;
      else plates += count;
    }
    return { plates, bricks, total: plates + bricks };
  }, [mosaic, consolidate]);

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
          {mosaic &&
            (pieceCounts ? (
              <>
                {' '}
                · {pieceCounts.total.toLocaleString()} pieces (
                {pieceCounts.plates.toLocaleString()} plates +{' '}
                {pieceCounts.bricks.toLocaleString()} bricks)
              </>
            ) : (
              <> · {totalPlates(mosaic).toLocaleString()} plates</>
            ))}
        </p>
      </section>

      <section className="flex items-center gap-2">
        <input
          id="consolidate"
          type="checkbox"
          checked={consolidate}
          onChange={(e) => onConsolidate(e.target.checked)}
          className="accent-amber-500"
        />
        <label htmlFor="consolidate" className="text-neutral-300">
          Merge 3-plate runs into 1×1 bricks (3005)
        </label>
      </section>

      <section className="flex items-center gap-2">
        <input
          id="dither"
          type="checkbox"
          checked={dither}
          onChange={(e) => onDither(e.target.checked)}
          className="accent-amber-500"
        />
        <label htmlFor="dither" className="text-neutral-300">
          Dither (Floyd–Steinberg)
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
