# lego-designer

Turn a photo into a build plan for a LEGO mosaic viewed **plate-edge-on**.
A 1×1 plate (part 3024) shows a 3.2mm-wide × 8mm-tall colored edge — one
"sub-pixel". Three consecutive sub-pixels form a cell (9.6mm × 8mm) that
encodes a foreground color, a background color, and a split, ANSI-art style
(▌▐█): e.g. split 1 from the left = one fg plate then two bg plates. This
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
courses — tipped 90° onto its side when finished. The mapping:

- A wall **course** (3.2mm, vertical while standing) = one sub-pixel
  position along a display row.
- A wall **stud-column** (8mm, horizontal while standing) = one display row.

So a piece spanning `w` courses × `h` studs covers a w×h block of the
display's sub-pixel grid, in a single color. Plates are 1 course tall;
bricks are 3 courses (9.6mm). The piece catalog:

| Part | Name | Courses × studs |
| --- | --- | --- |
| 3024 | Plate 1×1 | 1×1 |
| 3023 | Plate 1×2 | 1×2 |
| 3623 | Plate 1×3 | 1×3 |
| 3710 | Plate 1×4 | 1×4 |
| 3666 | Plate 1×6 | 1×6 |
| 3005 | Brick 1×1 | 3×1 |
| 3004 | Brick 1×2 | 3×2 |
| 3622 | Brick 1×3 | 3×3 |
| 3010 | Brick 1×4 | 3×4 |

## Building the physical display

1. Open the **Guide** tab and print it (or download the .txt).
2. **Build** the wall bottom-to-top: each course in the guide lists the
   pieces that *start* on that course, left to right by stud. Pieces
   spanning several courses are listed only on their first.
3. **Tip** the finished wall 90° **clockwise** (onto its right side): the
   bottom course becomes the LEFT edge of the display, the left stud-column
   the TOP row. The plate/brick edges now face the viewer.
4. **Frame** it (suggested construction — adjust to your bins): 3 layers of
   long thin plates (1×8/1×10) along the top and bottom edges, each layer
   offset about half a plate length so seams never line up (running bond —
   that's where the strength comes from); corner brackets (e.g. 2357 or
   1×2-1×2) tying the borders into one rigid ring; and a SNOT-brick column
   (36841 1×1-1×1, studs facing the display) down each side to capture the
   bar ends. Frame pieces are not counted in the parts list.

Grab the exact piece counts per color from the **Parts** tab (CSV export
included).

## Piece sets, modes, and previews

- **Piece set** — which parts the tiler may use: 1×1 plates only, plates
  (1×1 + 1×2), the 1×1/1×2 plate+brick family, or all 9 pieces.
- **Mode** — *Block* tries the biggest pieces first (fewest pieces, smooth
  faces); *ANSI* tries the smallest first, landing on 1×1 plates almost
  everywhere for maximum seam texture.
- **Preview** — *Tipped* shows the finished display; *Building* shows the
  standing wall as you build it (course 1 at the bottom, matching the
  guide); *Side by side* shows both.

All three choices persist in the browser via localStorage, alongside your
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
