# lego-designer

Turn a photo into a build plan for a LEGO mosaic made entirely of 1×1 plates
(part 3024) viewed **edge-on**. Stack plates into a tower, tip it over, and
you get a rigid bar 8mm tall where each plate shows a 3.2mm-wide × 8mm-tall
colored edge — one "sub-pixel". Three consecutive sub-pixels form a cell
(9.6mm × 8mm) that encodes a foreground color, a background color, and a
split, ANSI-art style (▌▐█): e.g. split 1 from the left = one fg plate then
two bg plates. This trick squeezes 3 color slots out of 3 plates and doubles
as coarse shading. Drop in a JPG/PNG, pick a width in cells, and get a live
preview, a row-by-row build guide, and a per-color parts count. Everything
runs in the browser; no image ever leaves your machine.

## Quickstart

```sh
npm install
npm run dev    # http://localhost:5173
npm run test   # core engine + crop unit tests
```

## Building the physical display

1. Open the **Guide** tab and print it (or download the .txt).
2. For each row, stack the listed plates into a **tower**, bottom-to-top in
   listed order.
3. **Tip** the tower over and lay it with the first plate listed at the left
   edge — the plate edges now face the viewer.
4. **Stack the rows** top-to-bottom to assemble the full mosaic.
5. **Frame** it: a staggered border of 1×8/1×10 plates in 3 offset layers
   along the top and bottom edges, with SNOT-brick side columns capturing
   the bar ends.

Grab the exact plate counts per color from the **Parts** tab (CSV export
included).

By default, runs of 3 same-color plates are merged into 1×1 bricks (part
3005) — three stacked plates are exactly one brick tall — so the guide,
parts list, and preview all agree on the piece counts. A brick face is
smooth (no seam lines between sub-pixels) at the cost of using a different
part; untick **Merge 3-plate runs into 1×1 bricks (3005)** to build from
plates only.

## Palette

The default palette is a curated set of current-production LEGO colors. Use
**Edit palette…** to disable colors you don't own or add custom ones (any
brand — gobricks etc.). Your palette persists in the browser via
localStorage; "Reset to defaults" restores the curated set.

## Roadmap

- Flat baseplate mode (classic top-down stud mosaics)
- Hand-draw editor (paint cells directly)
- BrickLink XML export for one-click part ordering
