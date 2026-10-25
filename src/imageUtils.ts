export function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function objectUrl(blob: Blob) {
  return URL.createObjectURL(blob);
}

export async function cropImageBlob(
  sourceBlob: Blob,
  region: { x: number; y: number; width: number; height: number },
) {
  const bitmap = await createImageBitmap(sourceBlob);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(region.width));
  canvas.height = Math.max(1, Math.round(region.height));
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Unable to create crop canvas.');
  }

  context.drawImage(
    bitmap,
    region.x,
    region.y,
    region.width,
    region.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  bitmap.close();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Unable to crop selected image area.'));
      }
    }, 'image/png');
  });
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
