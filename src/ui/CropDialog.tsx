import { useRef, useState } from 'react';
import type { CropRect } from '../image/load';

interface CropDialogProps {
  url: string;
  imgWidth: number;
  imgHeight: number;
  cellWidth: number;
  crop: CropRect;
  onChange: (crop: CropRect) => void;
  onClose: () => void;
}

type DragMode =
  | { kind: 'draw'; startX: number; startY: number }
  | { kind: 'move'; startX: number; startY: number; orig: CropRect }
  | { kind: 'resize'; corner: 'nw' | 'ne' | 'sw' | 'se'; orig: CropRect };

const MIN_SIZE = 0.02;

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function normalize(r: CropRect): CropRect {
  let { x, y, w, h } = r;
  if (w < 0) {
    x += w;
    w = -w;
  }
  if (h < 0) {
    y += h;
    h = -h;
  }
  x = clamp01(x);
  y = clamp01(y);
  w = Math.max(MIN_SIZE, Math.min(1 - x, w));
  h = Math.max(MIN_SIZE, Math.min(1 - y, h));
  return { x, y, w, h };
}

/**
 * Crop dialog: drag on the image to frame a region, drag inside the rect to
 * move it, drag a corner handle to resize. Free aspect — the encoder
 * adapts the display height to whatever is framed.
 */
export function CropDialog({ url, imgWidth, imgHeight, cellWidth, crop, onChange, onClose }: CropDialogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragMode | null>(null);

  const rowsEstimate = Math.max(
    1,
    Math.round(((crop.h * imgHeight) / (crop.w * imgWidth)) * cellWidth * (8 / 9.6)),
  );

  const toFrac = (e: React.PointerEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      fx: clamp01((e.clientX - rect.left) / rect.width),
      fy: clamp01((e.clientY - rect.top) / rect.height),
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const { fx, fy } = toFrac(e);
    const target = e.target as HTMLElement;
    const corner = target.dataset.corner as 'nw' | 'ne' | 'sw' | 'se' | undefined;
    if (corner) {
      setDrag({ kind: 'resize', corner, orig: crop });
    } else if (target.dataset.cropbody) {
      setDrag({ kind: 'move', startX: fx, startY: fy, orig: crop });
    } else {
      setDrag({ kind: 'draw', startX: fx, startY: fy });
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const { fx, fy } = toFrac(e);
    if (drag.kind === 'draw') {
      onChange(
        normalize({ x: drag.startX, y: drag.startY, w: fx - drag.startX, h: fy - drag.startY }),
      );
    } else if (drag.kind === 'move') {
      onChange(
        normalize({
          ...drag.orig,
          x: drag.orig.x + fx - drag.startX,
          y: drag.orig.y + fy - drag.startY,
        }),
      );
    } else {
      const o = drag.orig;
      const right = o.x + o.w;
      const bottom = o.y + o.h;
      let { x, y, w, h } = o;
      if (drag.corner.includes('w')) {
        x = Math.min(fx, right - MIN_SIZE);
        w = right - x;
      }
      if (drag.corner.includes('e')) {
        w = Math.max(MIN_SIZE, fx - x);
      }
      if (drag.corner.includes('n')) {
        y = Math.min(fy, bottom - MIN_SIZE);
        h = bottom - y;
      }
      if (drag.corner.includes('s')) {
        h = Math.max(MIN_SIZE, fy - y);
      }
      onChange(normalize({ x, y, w, h }));
    }
  };

  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
  const handles: { corner: 'nw' | 'ne' | 'sw' | 'se'; style: React.CSSProperties }[] = [
    { corner: 'nw', style: { left: -6, top: -6, cursor: 'nwse-resize' } },
    { corner: 'ne', style: { right: -6, top: -6, cursor: 'nesw-resize' } },
    { corner: 'sw', style: { left: -6, bottom: -6, cursor: 'nesw-resize' } },
    { corner: 'se', style: { right: -6, bottom: -6, cursor: 'nwse-resize' } },
  ];

  return (
    <div
      className="fixed inset-0 z-10 flex items-center justify-center bg-black/60 p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-full flex-col rounded-lg border border-neutral-700 bg-neutral-900 p-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Crop image"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-neutral-200">Crop the source</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-neutral-700 px-2 py-0.5 text-xs text-neutral-400 hover:border-amber-500 hover:text-amber-400"
          >
            Done
          </button>
        </div>

        <div
          ref={containerRef}
          className="relative select-none overflow-hidden"
          style={{ touchAction: 'none', cursor: 'crosshair' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => setDrag(null)}
        >
          <img
            src={url}
            alt="crop source"
            className="block max-h-[65vh] max-w-[70vw]"
            draggable={false}
          />
          <div
            data-cropbody
            className="absolute border-2 border-amber-500 bg-amber-500/10"
            style={{
              left: pct(crop.x),
              top: pct(crop.y),
              width: pct(crop.w),
              height: pct(crop.h),
              cursor: 'move',
            }}
          >
            {handles.map((h) => (
              <div
                key={h.corner}
                data-corner={h.corner}
                className="absolute h-3 w-3 rounded-sm border border-neutral-900 bg-amber-500"
                style={h.style}
              />
            ))}
          </div>
        </div>

        <p className="mt-3 text-xs text-neutral-500">
          {Math.round(crop.w * imgWidth)} × {Math.round(crop.h * imgHeight)} px → grid{' '}
          {cellWidth}×{rowsEstimate} cells · drag to frame, corners to resize
        </p>
      </div>
    </div>
  );
}
