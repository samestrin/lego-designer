/**
 * Mosaic encoder.
 *
 * Converts an image into a cell grid of LEGO 1×1 plate assignments.
 * Sub-pixels are 8mm wide × 3.2mm tall (2.5:1), so the resample is
 * anisotropic: the source is sampled at cellWidth × 3*rows where each
 * sub-pixel covers a 2.5:1 (w:h) region of the source. Row count is
 * derived from the image aspect accordingly (see CELL_ASPECT).
 */

import type { Cell, Lab, Mosaic, PaletteColor, PixelData } from './types';
import { hexToRgb, labDistanceSq, rgbToLab } from './color';
import { enabledColors } from './palette';
import { adjustPixelData } from './adjust';

const TOP_K = 4;

// Physical cell aspect: 8mm wide / 9.6mm tall (1 stud × 3 courses).
const CELL_ASPECT = 8 / 9.6;

// Leading (stained-glass "lead came"): strong edges are darkened in the
// resampled grid before matching, so edge cells naturally snap to black /
// dark gray while flat regions are untouched.
const LEADING_DARKEN = 0.6;
// ΔE between neighboring cell means that counts as a full-strength edge.
const EDGE_FULL_DE = 30;

// Floyd–Steinberg weights applied at sub-pixel resolution.
const FS_RIGHT = 7 / 16;
const FS_BELOW_LEFT = 3 / 16;
const FS_BELOW = 5 / 16;
const FS_BELOW_RIGHT = 1 / 16;

// Lab ranges used to clamp diffused error.
const L_MIN = 0;
const L_MAX = 100;
const AB_MIN = -128;
const AB_MAX = 127;

/**
 * Deterministic area-weighted box-average resampler on raw RGBA data.
 * Handles both down- and upsampling; alpha is ignored (treated opaque).
 */
export function resampleBoxAverage(
  pixels: PixelData,
  targetWidth: number,
  targetHeight: number,
): PixelData {
  const { width: sw, height: sh, data: src } = pixels;
  const out = new Uint8ClampedArray(targetWidth * targetHeight * 4);

  for (let ty = 0; ty < targetHeight; ty++) {
    const sy0 = (ty * sh) / targetHeight;
    const sy1 = ((ty + 1) * sh) / targetHeight;
    for (let tx = 0; tx < targetWidth; tx++) {
      const sx0 = (tx * sw) / targetWidth;
      const sx1 = ((tx + 1) * sw) / targetWidth;

      let r = 0;
      let g = 0;
      let b = 0;
      let area = 0;

      const ix0 = Math.floor(sx0);
      const ix1 = Math.min(sw - 1, Math.ceil(sx1) - 1);
      const iy0 = Math.floor(sy0);
      const iy1 = Math.min(sh - 1, Math.ceil(sy1) - 1);

      for (let iy = iy0; iy <= iy1; iy++) {
        const wy = Math.min(sy1, iy + 1) - Math.max(sy0, iy);
        if (wy <= 0) continue;
        for (let ix = ix0; ix <= ix1; ix++) {
          const wx = Math.min(sx1, ix + 1) - Math.max(sx0, ix);
          if (wx <= 0) continue;
          const w = wx * wy;
          const si = (iy * sw + ix) * 4;
          r += src[si] * w;
          g += src[si + 1] * w;
          b += src[si + 2] * w;
          area += w;
        }
      }

      const ti = (ty * targetWidth + tx) * 4;
      out[ti] = r / area;
      out[ti + 1] = g / area;
      out[ti + 2] = b / area;
      out[ti + 3] = 255;
    }
  }

  return { width: targetWidth, height: targetHeight, data: out };
}

interface PaletteEntry {
  color: PaletteColor;
  lab: Lab;
}

function toLabGrid(pixels: PixelData): { l: number[]; a: number[]; b: number[] } {
  const n = pixels.width * pixels.height;
  const l = new Array<number>(n);
  const a = new Array<number>(n);
  const b = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const lab = rgbToLab(
      pixels.data[i * 4],
      pixels.data[i * 4 + 1],
      pixels.data[i * 4 + 2],
    );
    l[i] = lab.l;
    a[i] = lab.a;
    b[i] = lab.b;
  }
  return { l, a, b };
}

/** Top-K nearest palette entries to a Lab sample, nearest first. */
function topKNearest(sample: Lab, entries: PaletteEntry[], k: number): PaletteEntry[] {
  const scored = entries.map((e) => ({ e, d: labDistanceSq(sample, e.lab) }));
  scored.sort((x, y) => x.d - y.d);
  return scored.slice(0, k).map((s) => s.e);
}

/** The 6 cell geometries: split 0, split 3, and split 1/2 from each side. */
type Geometry =
  | { kind: 'solid'; color: PaletteEntry }
  | { kind: 'split'; fg: PaletteEntry; bg: PaletteEntry; split: 1 | 2; fgSide: 'top' | 'bottom' };

function geometryAssignments(g: Geometry): [PaletteEntry, PaletteEntry, PaletteEntry] {
  if (g.kind === 'solid') {
    return [g.color, g.color, g.color];
  }
  const plates: PaletteEntry[] = [g.bg, g.bg, g.bg];
  for (let i = 0; i < g.split; i++) {
    plates[g.fgSide === 'top' ? i : 2 - i] = g.fg;
  }
  return [plates[0], plates[1], plates[2]];
}

function geometryCell(g: Geometry, error: number): Cell {
  if (g.kind === 'solid') {
    // All three plates one color; fg/bg choice is moot, so fg = bg and
    // split 3 by convention.
    return { fg: g.color.color, bg: g.color.color, split: 3, fgSide: 'top', error };
  }
  return {
    fg: g.fg.color,
    bg: g.bg.color,
    split: g.split,
    fgSide: g.fgSide,
    error,
  };
}

export interface EncodeOptions {
  dither: boolean;
  /** Scales the diffused Floyd–Steinberg error, 0..1 (default 1). */
  ditherStrength?: number;
  /** Pre-encode adjustments, -100..100 each, applied to the resampled grid. */
  contrast?: number;
  saturation?: number;
  /** Bias cells on strong edges toward dark colors (stained-glass look). */
  leading?: boolean;
}

/**
 * Encode an image into a plate mosaic of `cellWidth` cells per row.
 * Rows are derived from the image aspect ratio: each cell is one stud wide
 * and three courses tall, so the wall is cellWidth studs × 3*rows courses.
 */
export function encodeMosaic(
  pixels: PixelData,
  cellWidth: number,
  palette: PaletteColor[],
  opts: EncodeOptions,
): Mosaic {
  const enabled = enabledColors(palette);
  if (enabled.length === 0) {
    throw new Error('palette has no enabled colors');
  }

  // Each cell samples an 8:9.6 (w:h) region of the source, so the row
  // count shrinks by CELL_ASPECT relative to square-cell sampling.
  const rows = Math.max(
    1,
    Math.round((pixels.height * cellWidth * CELL_ASPECT) / pixels.width),
  );
  const subHeight = 3 * rows;
  const resampled = adjustPixelData(resampleBoxAverage(pixels, cellWidth, subHeight), opts);
  const ditherStrength = opts.ditherStrength ?? 1;

  // Precompute Lab for each enabled palette color once.
  const entries: PaletteEntry[] = enabled.map((color) => {
    const { r, g, b } = hexToRgb(color.hex);
    return { color, lab: rgbToLab(r, g, b) };
  });

  // Working Lab grid (cellWidth × 3*rows sub-pixels); dithering mutates
  // this in place. Cell (cx, cy) covers x = cx, y = 3cy..3cy+2.
  const grid = toLabGrid(resampled);
  const cells: Cell[] = [];

  // Leading: per-cell edge strength (0..1) from the pristine grid, as the
  // mean ΔE to 4-neighbor cell means, normalized at EDGE_FULL_DE; then
  // darken edge cells' luminance so the matcher snaps them to dark colors.
  if (opts.leading) {
    const mean = (cx: number, cy: number): Lab => {
      const i0 = 3 * cy * cellWidth + cx;
      return {
        l: (grid.l[i0] + grid.l[i0 + cellWidth] + grid.l[i0 + 2 * cellWidth]) / 3,
        a: (grid.a[i0] + grid.a[i0 + cellWidth] + grid.a[i0 + 2 * cellWidth]) / 3,
        b: (grid.b[i0] + grid.b[i0 + cellWidth] + grid.b[i0 + 2 * cellWidth]) / 3,
      };
    };
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cellWidth; cx++) {
        const m = mean(cx, cy);
        let sum = 0;
        let n = 0;
        for (const [nx, ny] of [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]]) {
          if (nx < 0 || ny < 0 || nx >= cellWidth || ny >= rows) continue;
          sum += Math.sqrt(labDistanceSq(m, mean(nx, ny)));
          n++;
        }
        const edge = n ? Math.min(1, sum / n / EDGE_FULL_DE) : 0;
        if (edge > 0) {
          const scale = 1 - LEADING_DARKEN * edge;
          for (let o = 0; o < 3; o++) {
            grid.l[(3 * cy + o) * cellWidth + cx] *= scale;
          }
        }
      }
    }
  }

  const clamp = (v: number, lo: number, hi: number) =>
    v < lo ? lo : v > hi ? hi : v;

  const diffuse = (x: number, y: number, el: number, ea: number, eb: number, w: number) => {
    if (x < 0 || x >= cellWidth || y < 0 || y >= subHeight) return;
    const i = y * cellWidth + x;
    grid.l[i] = clamp(grid.l[i] + el * w, L_MIN, L_MAX);
    grid.a[i] = clamp(grid.a[i] + ea * w, AB_MIN, AB_MAX);
    grid.b[i] = clamp(grid.b[i] + eb * w, AB_MIN, AB_MAX);
  };

  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cellWidth; cx++) {
      const i0 = 3 * cy * cellWidth + cx;
      const samples: Lab[] = [0, 1, 2].map((o) => ({
        l: grid.l[i0 + o * cellWidth],
        a: grid.a[i0 + o * cellWidth],
        b: grid.b[i0 + o * cellWidth],
      }));

      // Candidate colors: union of top-K nearest to each sub-pixel, deduped.
      // Bottom sample first, so an exact two-tone boundary (whose split has
      // two tied descriptions) resolves to the bottom-fill reading: fg is
      // the color rising from the bottom of the cell.
      const candidateMap = new Map<string, PaletteEntry>();
      for (let o = samples.length - 1; o >= 0; o--) {
        for (const e of topKNearest(samples[o], entries, TOP_K)) {
          candidateMap.set(e.color.id, e);
        }
      }
      const candidates = [...candidateMap.values()];

      // Enumerate geometries. Solid assignments are scored once per
      // candidate color (split 0 and split 3 are the same physical cell,
      // so fg/bg choice is moot there — no duplication blowup).
      let best: Geometry | null = null;
      let bestError = Infinity;

      const consider = (g: Geometry) => {
        const assigned = geometryAssignments(g);
        let error = 0;
        for (let i = 0; i < 3; i++) {
          error += labDistanceSq(samples[i], assigned[i].lab);
        }
        if (error < bestError) {
          bestError = error;
          best = g;
        }
      };

      for (const c of candidates) {
        consider({ kind: 'solid', color: c });
      }
      for (const fg of candidates) {
        for (const bg of candidates) {
          if (fg === bg) continue;
          consider({ kind: 'split', fg, bg, split: 1, fgSide: 'top' });
          consider({ kind: 'split', fg, bg, split: 1, fgSide: 'bottom' });
          consider({ kind: 'split', fg, bg, split: 2, fgSide: 'top' });
          consider({ kind: 'split', fg, bg, split: 2, fgSide: 'bottom' });
        }
      }

      const chosen = best!;
      cells.push(geometryCell(chosen, bestError));

      if (opts.dither && ditherStrength > 0) {
        const assigned = geometryAssignments(chosen);
        for (let i = 0; i < 3; i++) {
          const el = samples[i].l - assigned[i].lab.l;
          const ea = samples[i].a - assigned[i].lab.a;
          const eb = samples[i].b - assigned[i].lab.b;
          const py = 3 * cy + i;
          diffuse(cx + 1, py, el, ea, eb, FS_RIGHT * ditherStrength);
          diffuse(cx - 1, py + 1, el, ea, eb, FS_BELOW_LEFT * ditherStrength);
          diffuse(cx, py + 1, el, ea, eb, FS_BELOW * ditherStrength);
          diffuse(cx + 1, py + 1, el, ea, eb, FS_BELOW_RIGHT * ditherStrength);
        }
      }
    }
  }

  return { cellWidth, rows, cells };
}
