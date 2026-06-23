import { fitWithin, compressImage } from '../compressImage';

describe('fitWithin', () => {
  it('does not upscale when both sides fit within max', () => {
    expect(fitWithin(800, 600, 1600)).toEqual([800, 600]);
  });

  it('clamps the width for a landscape image larger than max', () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual([1600, 1200]);
  });

  it('clamps the height for a portrait image larger than max', () => {
    expect(fitWithin(3000, 4000, 1600)).toEqual([1200, 1600]);
  });

  it('clamps a square image to max on both sides', () => {
    expect(fitWithin(2000, 2000, 1600)).toEqual([1600, 1600]);
  });
});

describe('compressImage', () => {
  it('returns a non-image file unchanged', async () => {
    const file = new File(['x'], 'a.txt', { type: 'text/plain' });
    await expect(compressImage(file)).resolves.toBe(file);
  });
});
