export function fitWithin(w: number, h: number, max: number): [number, number] {
  if (w <= max && h <= max) return [w, h];
  const ratio = w > h ? max / w : max / h;
  return [Math.round(w * ratio), Math.round(h * ratio)];
}

export async function compressImage(
  file: File,
  { maxSize = 1600, quality = 0.8 }: { maxSize?: number; quality?: number } = {},
): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  const bitmap = await createImageBitmap(file);
  const [w, h] = fitWithin(bitmap.width, bitmap.height, maxSize);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/webp', quality),
  );
  if (!blob || blob.size >= file.size) return file; // nunca piorar
  return new File([blob], file.name.replace(/\.\w+$/, '.webp'), { type: 'image/webp' });
}
