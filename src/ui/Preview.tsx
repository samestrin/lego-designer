import { useEffect, useMemo, useRef, useState } from 'react';
import type { Mosaic } from '../core/types';
import { displayWidthMm, mosaicCourseHeight } from '../core/types';
import type { Placement } from '../core/tiling';
import { MISMATCH_THRESHOLD } from './mismatch';

interface PreviewProps {
  mosaic: Mosaic;
  tiling: Placement[];
  showMismatches: boolean;
}

/** Target on-screen width for the default (fit) zoom. */
const FIT_PX = 720;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 16;

/**
 * Canvas rendering of the tiling at `s` screen px per mm. Each Placement is
 * one smooth rect in its color with a light top / dark bottom bevel and a
 * thin dark outline — no seams inside a piece.
 *
 * One view only: the standing wall IS the display. Studs run horizontal
 * (8s each), courses vertical (3.2s each). Grid y=0 is the image's TOP
 * course, so pieces render canvas-down like the image: piece (x,y) →
 * left x×8s, top y×3.2s. (The guide numbers courses from the bottom —
 * guide course N is grid y = courseHeight − N.)
 */
export function Preview({ mosaic, tiling, showMismatches }: PreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // null = auto-fit to the pane; the slider/buttons pin an explicit zoom.
  const [zoom, setZoom] = useState<number | null>(null);

  const courseHeight = mosaicCourseHeight(mosaic);

  const fitZoom = Math.min(
    ZOOM_MAX,
    Math.max(ZOOM_MIN, FIT_PX / displayWidthMm(mosaic)),
  );
  const s = zoom ?? fitZoom;

  useEffect(() => {
    const studW = 8 * s;
    const courseH = 3.2 * s;

    const drawPiece = (
      ctx: CanvasRenderingContext2D,
      left: number,
      top: number,
      w: number,
      h: number,
      hex: string,
      translucent = false,
    ) => {
      ctx.fillStyle = hex;
      if (translucent) {
        // Glass look: slightly dimmed fill, bright diagonal gloss streak,
        // light outline instead of the opaque bevel.
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.fillRect(left, top, w, h);
        ctx.restore();
        const gw = Math.max(1.5, w * 0.18);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.30)';
        ctx.beginPath();
        ctx.moveTo(left + w * 0.15, top + h);
        ctx.lineTo(left + w * 0.15 + gw, top + h);
        ctx.lineTo(left + w * 0.55 + gw, top);
        ctx.lineTo(left + w * 0.55, top);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.fillRect(left, top, w, 1);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1;
        ctx.strokeRect(left + 0.5, top + 0.5, w - 1, h - 1);
        return;
      }
      ctx.fillRect(left, top, w, h);
      // Bevel: lit top edge, shadowed bottom edge.
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.fillRect(left, top, w, 1);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.fillRect(left, top + h - 1, w, 1);
      // Thin dark outline per piece — no seams inside a piece.
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(left + 0.5, top + 0.5, w - 1, h - 1);
    };

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    canvas.width = Math.ceil(mosaic.cellWidth * studW);
    canvas.height = Math.ceil(courseHeight * courseH);
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const p of tiling) {
      drawPiece(
        ctx,
        p.x * studW,
        p.y * courseH,
        p.piece.w * studW,
        p.piece.h * courseH,
        p.color.hex,
        p.color.translucent,
      );
    }

    // Mismatch overlay is cell-based: one 8s × 9.6s rect per cell.
    if (showMismatches) {
      for (let y = 0; y < mosaic.rows; y++) {
        for (let x = 0; x < mosaic.cellWidth; x++) {
          const cell = mosaic.cells[y * mosaic.cellWidth + x];
          if (cell.error > MISMATCH_THRESHOLD) {
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
            ctx.lineWidth = 2;
            ctx.strokeRect(x * studW + 1, y * 3 * courseH + 1, studW - 2, 3 * courseH - 2);
          }
        }
      }
    }
  }, [mosaic, tiling, s, showMismatches, courseHeight]);

  const pieceCounts = useMemo(() => {
    const byPart = new Map<string, number>();
    for (const p of tiling) {
      byPart.set(p.piece.partNum, (byPart.get(p.piece.partNum) ?? 0) + 1);
    }
    return [...byPart.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([partNum, n]) => `${n.toLocaleString()}×${partNum}`)
      .join(', ');
  }, [tiling]);

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
        grid {mosaic.cellWidth}×{mosaic.rows} cells · {courseHeight} courses tall ·{' '}
        {tiling.length.toLocaleString()} pieces ({pieceCounts})
      </p>
    </div>
  );
}
