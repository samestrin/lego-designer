/**
 * Image loading and cropping for the browser UI.
 *
 * `loadImageFile` bridges File → PixelData via canvas; `cropPixelData` and
 * `windowedCrop` are pure array math so they stay unit-testable in node.
 */

import type { PixelData } from '../core/types';

/** Longer-side cap; keeps the encoder's box-average fast on huge photos. */
const MAX_SIDE = 2048;

export async function loadImageFile(
  file: File,
): Promise<{ pixels: PixelData; url: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error(`could not decode image: ${file.name}`));
      el.src = url;
    });

    const scale = Math.min(
      1,
      MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight),
    );
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d context unavailable');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);

    const { data } = ctx.getImageData(0, 0, width, height);
    return { pixels: { width, height, data }, url };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}

function clampFrac(f: number): number {
  return Math.max(-1, Math.min(1, f));
}

/** Copy a cw×ch window out of `pixels`; offsets slide it within the slack. */
function cropTo(
  pixels: PixelData,
  cw: number,
  ch: number,
  offsetXFrac: number,
  offsetYFrac: number,
): PixelData {
  const ox = Math.round(((clampFrac(offsetXFrac) + 1) / 2) * (pixels.width - cw));
  const oy = Math.round(((clampFrac(offsetYFrac) + 1) / 2) * (pixels.height - ch));
  const data = new Uint8ClampedArray(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    const srcStart = ((oy + y) * pixels.width + ox) * 4;
    data.set(pixels.data.subarray(srcStart, srcStart + cw * 4), y * cw * 4);
  }
  return { width: cw, height: ch, data };
}

/**
 * Largest crop of `pixels` matching `targetAspect` (width/height), centered
 * by default and shifted by offsets in [-1, 1] fractions of the slack.
 */
export function cropPixelData(
  pixels: PixelData,
  offsetXFrac: number,
  offsetYFrac: number,
  targetAspect: number,
): PixelData {
  let cw = pixels.width;
  let ch = Math.round(pixels.width / targetAspect);
  if (ch > pixels.height) {
    ch = pixels.height;
    cw = Math.round(pixels.height * targetAspect);
  }
  cw = Math.max(1, Math.min(pixels.width, cw));
  ch = Math.max(1, Math.min(pixels.height, ch));
  return cropTo(pixels, cw, ch, offsetXFrac, offsetYFrac);
}

/**
 * A fixed window of `windowFrac` of each dimension (same aspect as the
 * source), positioned by the offsets within the remaining slack.
 */
export function windowedCrop(
  pixels: PixelData,
  offsetXFrac: number,
  offsetYFrac: number,
  windowFrac = 0.9,
): PixelData {
  const cw = Math.max(1, Math.round(pixels.width * windowFrac));
  const ch = Math.max(1, Math.round(pixels.height * windowFrac));
  return cropTo(pixels, cw, ch, offsetXFrac, offsetYFrac);
}
