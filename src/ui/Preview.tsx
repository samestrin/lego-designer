import { useEffect, useMemo, useRef, useState } from 'react';
import type { Mosaic } from '../core/types';
import { displayWidthMm, mosaicPlateWidth, totalPlates } from '../core/types';
import { consolidateRow, rowPlates } from '../core/consolidate';
import type { Segment } from '../core/consolidate';
import { countParts } from '../core/partsList';
import { MISMATCH_THRESHOLD } from './mismatch';

interface PreviewProps {
  mosaic: Mosaic;
  showMismatches: boolean;
  consolidate: boolean;
}

/** Target on-screen width for the default (fit) zoom. */
const FIT_PX = 720;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 16;

/**
 * Canvas rendering of the mosaic at `s` screen px per mm: each sub-pixel is
 * a 3.2s × 8s rect in the plate's color, with a light top / dark bottom
 * bevel and a thin dark gap between plates to read as stacked edges.
 * With `consolidate` on, same-color runs of 3 plates render as one smooth
 * 9.6s × 8s brick face — no gap lines inside a brick segment.
 */
export function Preview({ mosaic, showMismatches, consolidate }: PreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // null = auto-fit to the pane; the slider/buttons pin an explicit zoom.
  const [zoom, setZoom] = useState<number | null>(null);

  const fitZoom = Math.min(
    ZOOM_MAX,
    Math.max(ZOOM_MIN, FIT_PX / displayWidthMm(mosaic)),
  );
  const s = zoom ?? fitZoom;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const subW = 3.2 * s;
    const rowH = 8 * s;
    canvas.width = Math.ceil(mosaic.cellWidth * 3 * subW);
    canvas.height = Math.ceil(mosaic.rows * rowH);

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < mosaic.rows; y++) {
      const plates = rowPlates(mosaic, y);
      const segments: Segment[] = consolidate
        ? consolidateRow(plates)
        : plates.map((color) => ({
            color,
            part: 'plate' as const,
            pieces: 1,
            plates: 1,
          }));
      let px = 0;
      for (const seg of segments) {
        const w = seg.plates * subW;
        const py = y * rowH;
        ctx.fillStyle = seg.color.hex;
        ctx.fillRect(px, py, w, rowH);
        // Bevel: lit top edge, shadowed bottom edge.
        ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.fillRect(px, py, w, 1);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
        ctx.fillRect(px, py + rowH - 1, w, 1);
        // Gap between neighboring pieces; a brick face has none inside.
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fillRect(px + w - 1, py, 1, rowH);
        // Faint outline so multi-brick runs still read as separate bricks.
        if (seg.part === 'brick') {
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
          ctx.lineWidth = 1;
          for (let b = 0; b < seg.pieces; b++) {
            const bw = 3 * subW;
            ctx.strokeRect(px + b * bw + 0.5, py + 0.5, bw - 1, rowH - 1);
          }
        }
        px += w;
      }
      if (showMismatches) {
        for (let x = 0; x < mosaic.cellWidth; x++) {
          const cell = mosaic.cells[y * mosaic.cellWidth + x];
          if (cell.error > MISMATCH_THRESHOLD) {
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
            ctx.lineWidth = 2;
            ctx.strokeRect(x * 3 * subW + 1, y * rowH + 1, 3 * subW - 2, rowH - 2);
          }
        }
      }
    }
  }, [mosaic, s, showMismatches, consolidate]);

  const pieceCounts = useMemo(() => {
    if (!consolidate) return null;
    let plates = 0;
    let bricks = 0;
    for (const { part, count } of countParts(mosaic, { consolidate }).values()) {
      if (part === 'brick') bricks += count;
      else plates += count;
    }
    return { plates, bricks, total: plates + bricks };
  }, [mosaic, consolidate]);

  const zoomLabel = useMemo(() => `${Math.round((s / fitZoom) * 100)}%`, [s, fitZoom]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-neutral-800 px-3 py-2 text-xs text-neutral-400">
        <button
          type="button"
          onClick={() => setZoom(Math.max(ZOOM_MIN, s - 0.5))}
          className="rounded border border-neutral-700 px-2 py-0.5 hover:border-amber-500 hover:text-amber-400"
        >
          −
        </button>
        <input
          type="range"
          min={ZOOM_MIN}
          max={ZOOM_MAX}
          step={0.5}
          value={s}
          aria-label="zoom"
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-40 accent-amber-500"
        />
        <button
          type="button"
          onClick={() => setZoom(Math.min(ZOOM_MAX, s + 0.5))}
          className="rounded border border-neutral-700 px-2 py-0.5 hover:border-amber-500 hover:text-amber-400"
        >
          +
        </button>
        <span>{zoomLabel}</span>
        <button
          type="button"
          onClick={() => setZoom(null)}
          className="rounded border border-neutral-700 px-2 py-0.5 hover:border-amber-500 hover:text-amber-400"
        >
          fit
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center overflow-auto p-4">
        <canvas ref={canvasRef} className="max-w-none" />
      </div>
      <p className="border-t border-neutral-800 px-3 py-2 text-xs text-neutral-500">
        grid {mosaic.cellWidth}×{mosaic.rows} cells · {mosaicPlateWidth(mosaic)}{' '}
        plates/row ·{' '}
        {pieceCounts
          ? `${pieceCounts.total.toLocaleString()} pieces (${pieceCounts.plates.toLocaleString()} plates + ${pieceCounts.bricks.toLocaleString()} bricks)`
          : `${totalPlates(mosaic).toLocaleString()} plates`}
      </p>
    </div>
  );
}
