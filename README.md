# lego-designer

[![CI](https://github.com/samestrin/lego-designer/actions/workflows/ci.yml/badge.svg)](https://github.com/samestrin/lego-designer/actions/workflows/ci.yml)

Turn a photo into a build plan for a LEGO mosaic viewed **plate-edge-on**.
A 1×1 plate (part 3024) shows an 8mm-wide × 3.2mm-tall colored edge — one
"sub-pixel". Three stacked sub-pixels form a cell (8mm × 9.6mm) that
encodes a foreground color, a background color, and a split, ANSI-art style
(▀▄█): e.g. split 1 from the bottom = one fg plate then two bg plates. This
trick squeezes 3 color slots out of 3 plates and doubles as coarse shading.
Drop in a JPG/PNG, pick a width in cells, and get a live preview, a
course-by-course build guide, and a per-piece parts count. Everything runs
in the browser; no image ever leaves your machine.

## Quickstart

```sh
npm install
npm run dev    # http://localhost:5173
npm run test   # core engine + crop unit tests
```

## The physical model

The whole mosaic is **one ordinary standing LEGO wall** — studs up, stacked
courses — and its face IS the display. No tipping, ever: what you see while
building is what you get. The mapping:

- A wall **stud** (8mm, horizontal) = one sub-pixel column; studs run along
  a display row.
- A wall **course** (3.2mm, vertical) = one sub-pixel row; three stacked
  courses make one cell.

So a piece spanning `w` studs × `h` courses covers a w×h block of the
display's sub-pixel grid, in a single color. Plates are 1 course tall;
bricks are 3 courses (9.6mm). The piece catalog:

| Part | Name | Studs × courses |
| --- | --- | --- |
| 3024 | Plate 1×1 | 1×1 |
| 3023 | Plate 1×2 | 2×1 |
| 3623 | Plate 1×3 | 3×1 |
| 3710 | Plate 1×4 | 4×1 |
| 3666 | Plate 1×6 | 6×1 |
| 3005 | Brick 1×1 | 1×3 |
| 3004 | Brick 1×2 | 2×3 |
| 3622 | Brick 1×3 | 3×3 |
| 3010 | Brick 1×4 | 4×3 |
| 3245 | Brick 1×2×2 | 2×6 |
| 14716 | Brick 1×1×3 | 1×9 |
| 22886 | Brick 1×2×3 | 2×9 |
| 49311 | Brick 1×4×3 | 4×9 |
| 2453 | Brick 1×1×5 | 1×15 |
| 2454 | Brick 1×2×5 | 2×15 |

The tall bricks (3245 up to 2454, in the **extended** set) each replace a
whole column of plates in one placement — great for big flat regions.
Availability narrows fast as pieces get taller: 3245 is common, the ×3s are
newer with short color lists, the ×5s sit in between — check before you
shop. (For 2454, the no-side-supports variant 46212 has the cleanest face.)

## Building the physical display

1. Open the **Guide** tab and print it (or download the .txt).
2. **Frame the bottom first** (suggested construction — adjust to your
   bins): 3 layers of long thin plates (1×8/1×10), each layer offset about
   half a plate length so seams never line up (running bond — that's where
   the strength comes from), with SNOT corner pieces so the sides can wrap.
3. **Build** the wall up from the bottom border, bottom-to-top: each course
   in the guide lists the pieces that *start* on that course, left to right
   by stud. Pieces spanning several courses are listed only on their first.
   Side borders (a SNOT-brick column, 36841 1×1-1×1, studs facing inward)
   rise alongside, capturing the mosaic's left/right edges.
4. **Cap it with the top border** last; corner brackets (e.g. 2357 or
   1×2-1×2) tie the whole frame into one rigid ring. Frame pieces are not
   counted in the parts list.

Grab the exact piece counts per color from the **Parts** tab (CSV export
included).

## Piece sets and modes

- **Piece set** — which parts the tiler may use: 1×1 plates only, plates
  (1×1 + 1×2), the 1×1/1×2 plate+brick family, or *extended*: longer
  plates (up to 1×6), longer bricks (up to 1×4), and the tall-brick
  family (1×2×2 up to 1×2×5).
- **Mode** — *Block* tries the biggest pieces first (fewest pieces, smooth
  faces); *ANSI* tries the smallest first, landing on 1×1 plates almost
  everywhere for maximum seam texture.
- The **preview** shows the wall face exactly as you'll build it — there
  is only one orientation, because the wall IS the display.

Both choices persist in the browser via localStorage, alongside your
palette.

## Image and style controls

- **Contrast / saturation** — pre-encode adjustments (−100…+100) applied
  to the resampled grid. Boosting both usually helps: the LEGO palette has
  far less dynamic range than a photo.
- **Dither strength** — scales the Floyd–Steinberg error diffusion
  (0 = off, 100% = full). Lower values reduce single-plate "confetti" in
  flat regions at the cost of rougher gradients.
- **Leading** — darkens strong edges before matching so region boundaries
  snap to black/dark gray, like the lead came in stained glass (pairs well
  with trans colors).

## Palette

The default palette is a curated set of current-production LEGO colors. Use
**Edit palette…** to disable colors you don't own or add custom ones (any
brand — gobricks etc.). Your palette persists in the browser via
localStorage; "Reset to defaults" restores the curated set.

Thirteen **trans colors** (Trans-Clear, Trans-Red, Trans-Light Blue, …) ship
disabled by default — enable them in the palette editor when you want the
stained-glass look. They render glassy in the preview and match on their
apparent (lit) color, which varies with your lighting/backing, so tune the
hex values to your stock. Note: trans colors are common as 1×1 plates but
rare as larger pieces, so block mode may plan pieces that are hard to buy.

## Roadmap

- Flat baseplate mode (classic top-down stud mosaics)
- Hand-draw editor (paint cells directly)
- BrickLink XML export for one-click part ordering
- Half-stud offsets via jumper plates (15573) for ▌▐ vertical splits
