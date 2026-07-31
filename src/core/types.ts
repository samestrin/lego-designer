/**
 * Core types for the LEGO plate mosaic engine.
 *
 * Physical model: a 1×1 plate (part 3024) is 8mm × 8mm footprint, 3.2mm
 * thick. The mosaic is one ordinary standing wall — studs horizontal (8mm),
 * courses vertical (3.2mm) — and its face IS the display. One stud × one
 * course is a "sub-pixel" (8mm × 3.2mm). Three stacked courses of one stud
 * column form a "cell" (8mm × 9.6mm) holding a foreground color, a
 * background color, and a split: how many of the 3 plates (counting from
 * the top or bottom) are fg.
 */

export interface Color {
  r: number;
  g: number;
  b: number;
  hex: string;
  name?: string;
}

/** RGBA pixel buffer, row-major, 4 bytes per pixel. */
export interface PixelData {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

/** CIE Lab color space point. */
export interface Lab {
  l: number;
  a: number;
  b: number;
}

export interface PaletteColor {
  id: string;
  name: string;
  hex: string;
  brand: string;
  enabled: boolean;
  /** Transparent/trans colors render glassy in the preview; hex is the
   *  apparent (lit) color used for matching. */
  translucent?: boolean;
}

export interface Cell {
  fg: PaletteColor;
  bg: PaletteColor;
  /** Number of fg plates in the cell (0–3). */
  split: 0 | 1 | 2 | 3;
  /** Side the fg plates are stacked from; moot for split 0 and 3. */
  fgSide: 'top' | 'bottom';
  /** Best matching error found during encoding (sum of squared Lab distances). */
  error: number;
}

/** Plate colors of a cell, top to bottom as seen by the viewer. */
export function cellPlates(
  cell: Cell,
): [PaletteColor, PaletteColor, PaletteColor] {
  const plates: PaletteColor[] = [cell.bg, cell.bg, cell.bg];
  for (let i = 0; i < cell.split; i++) {
    plates[cell.fgSide === 'top' ? i : 2 - i] = cell.fg;
  }
  return [plates[0], plates[1], plates[2]];
}

/** A mosaic of cells, row-major. Display = cellWidth studs wide, 3*rows courses tall. */
export interface Mosaic {
  cellWidth: number;
  rows: number;
  cells: Cell[];
}

export function mosaicCourseHeight(m: Mosaic): number {
  return m.rows * 3;
}

export function displayWidthMm(m: Mosaic): number {
  return m.cellWidth * 8;
}

export function displayHeightMm(m: Mosaic): number {
  return m.rows * 9.6;
}

export function totalPlates(m: Mosaic): number {
  return m.cellWidth * m.rows * 3;
}
