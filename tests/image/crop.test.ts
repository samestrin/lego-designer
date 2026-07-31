import { describe, expect, it } from 'vitest';
import { cropPixelData, windowedCrop } from '../../src/image/load';
import type { PixelData } from '../../src/core/types';

/** Pixel buffer where each pixel encodes its own coordinates (r = x, g = y). */
function coordPixels(width: number, height: number): PixelData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      data[i] = x;
      data[i + 1] = y;
      data[i + 3] = 255;
    }
  }
  return { width, height, data };
}

/** Source coordinates of a cropped pixel, read back from the encoding. */
function sourceCoord(crop: PixelData, x: number, y: number): [number, number] {
  const i = (y * crop.width + x) * 4;
  return [crop.data[i], crop.data[i + 1]];
}

describe('cropPixelData', () => {
  it('crops a 100×50 source to a centered 50×50 at aspect 1', () => {
    const crop = cropPixelData(coordPixels(100, 50), 0, 0, 1);
    expect(crop.width).toBe(50);
    expect(crop.height).toBe(50);
    expect(sourceCoord(crop, 0, 0)).toEqual([25, 0]);
    expect(sourceCoord(crop, 49, 49)).toEqual([74, 49]);
  });

  it('shifts the window fully right at offsetX +1', () => {
    const crop = cropPixelData(coordPixels(100, 50), 1, 1, 1);
    expect(crop.width).toBe(50);
    expect(crop.height).toBe(50);
    // Horizontal slack is 50px; vertical slack is 0, so +1 stays at top.
    expect(sourceCoord(crop, 0, 0)).toEqual([50, 0]);
  });

  it('shifts the window fully down at offsetY +1 when there is vertical slack', () => {
    // 50×100 source at aspect 1: 50×50 window with 50px vertical slack.
    const crop = cropPixelData(coordPixels(50, 100), 0, 1, 1);
    expect(sourceCoord(crop, 0, 0)).toEqual([0, 50]);
  });

  it('keeps the full 100×50 frame at aspect 2', () => {
    const crop = cropPixelData(coordPixels(100, 50), 0, 0, 2);
    expect(crop.width).toBe(100);
    expect(crop.height).toBe(50);
    expect(sourceCoord(crop, 0, 0)).toEqual([0, 0]);
  });

  it('clamps out-of-range offsets', () => {
    const crop = cropPixelData(coordPixels(100, 50), 5, -5, 1);
    expect(sourceCoord(crop, 0, 0)).toEqual([50, 0]);
  });
});

describe('windowedCrop', () => {
  it('takes a centered 90% window by default', () => {
    const crop = windowedCrop(coordPixels(100, 50), 0, 0);
    expect(crop.width).toBe(90);
    expect(crop.height).toBe(45);
    expect(sourceCoord(crop, 0, 0)).toEqual([5, 3]); // round(0.5*10), round(0.5*5)
  });

  it('moves within the slack at offset +1', () => {
    const crop = windowedCrop(coordPixels(100, 50), 1, 1);
    expect(sourceCoord(crop, 0, 0)).toEqual([10, 5]);
  });
});
