export type MergeDirection = 'horizontal' | 'vertical';
type Size = { width: number; height: number };

export function mergeLayout(sizes: Size[], direction: MergeDirection, gap: number) {
  if (sizes.length !== 2 || !['horizontal', 'vertical'].includes(direction) || !Number.isInteger(gap) || gap < 0 || gap > 100
      || sizes.some(s => !Number.isInteger(s.width) || !Number.isInteger(s.height) || s.width < 1 || s.height < 1)) {
    throw new Error('Choose two valid images and a gap between 0 and 100 pixels.');
  }
  const horizontal = direction === 'horizontal';
  const width = horizontal ? sizes[0].width + gap + sizes[1].width : Math.max(...sizes.map(s => s.width));
  const height = horizontal ? Math.max(...sizes.map(s => s.height)) : sizes[0].height + gap + sizes[1].height;
  if (width > 16384 || height > 16384 || width * height > 32_000_000) throw new Error('These images are too large to merge. Crop smaller fragments first.');
  return { width, height, positions: horizontal
    ? [{ x: 0, y: Math.floor((height - sizes[0].height) / 2) }, { x: sizes[0].width + gap, y: Math.floor((height - sizes[1].height) / 2) }]
    : [{ x: 0, y: 0 }, { x: 0, y: sizes[0].height + gap }] };
}

export function joinedFragmentText(first: string, second: string) {
  const a = first.trim(), b = second.trim();
  if (!a || !b) return a || b;
  return a + (/[\u3400-\u9fff]$/.test(a) && /^[\u3400-\u9fff]/.test(b) ? '' : ' ') + b;
}

export async function mergeFragmentImages(blobs: Blob[], direction: MergeDirection, gap: number) {
  const images: ImageBitmap[] = [];
  try {
    for (const blob of blobs) images.push(await createImageBitmap(blob));
    const layout = mergeLayout(images, direction, gap);
    const canvas = document.createElement('canvas');
    canvas.width = layout.width; canvas.height = layout.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Unable to create the merged image.');
    images.forEach((image, i) => context.drawImage(image, layout.positions[i].x, layout.positions[i].y));
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Unable to save merged image.')), 'image/png'));
    return blob;
  } finally { images.forEach(image => image.close()); }
}
