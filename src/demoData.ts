import type { AppData, Fragment, CutRegion } from './types';
import { DEFAULT_BOX_ID } from './boxMembership';

export async function createDemoData(language: 'en' | 'zh' = 'en'): Promise<AppData> {
  const zh = language === 'zh';
  const createdAt = new Date().toISOString();
  const response = await fetch(`./portfolio/dubliners-${language}.png`);
  if (!response.ok) throw new Error('Could not load the Dubliners sample screenshot.');
  const imageBlob = await response.blob();
  const bitmap = await createImageBitmap(imageBlob);
  // Coordinates refer to the supplied screenshot, not newly typeset text.
  const referenceWidth = zh ? 1380 : 2048;
  const scale = bitmap.width / referenceWidth;
  const selections: [string, number, number, number, number][] = zh ? [
    ['整个爱尔兰都在下雪', 686, 12, 252, 33],
    ['落在光秃秃的小山上', 125, 57, 253, 34],
    ['又轻轻地', 801, 57, 112, 34],
    ['他的灵魂缓缓地昏睡了', 993, 147, 280, 34],
    ['雪花微微地穿过宇宙', 68, 193, 254, 34],
    ['飘落到所有的生者和死者身上', 881, 193, 364, 34],
  ] : [
    ['A few light taps upon the pane', 109, 6, 401, 32],
    ['It had begun to snow again.', 890, 6, 354, 32],
    ['falling softly', 1200, 94, 153, 32],
    ['the dark mutinous Shannon waves', 264, 138, 427, 32],
    ['His soul swooned slowly', 1535, 182, 318, 32],
    ['all the living and the dead', 1408, 226, 332, 32],
  ];
  const fragments: Fragment[] = [];
  const cutRegions: CutRegion[] = [];
  const dimensions: { width: number; height: number }[] = [];
  try {
    for (const [index, [text, rx, ry, rw, rh]] of selections.entries()) {
      const x = Math.round(rx * scale), y = Math.round(ry * scale);
      const width = Math.round(rw * scale), height = Math.round(rh * scale);
      const crop = document.createElement('canvas'); crop.width = width; crop.height = height;
      const context = crop.getContext('2d');
      if (!context) throw new Error('Could not crop sample screenshot.');
      context.drawImage(bitmap, x, y, width, height, 0, 0, width, height);
      const blob = await new Promise<Blob>((resolve, reject) => crop.toBlob(b => b ? resolve(b) : reject(new Error('Could not save sample crop.')), 'image/png'));
      const id = `dubliners-${language}-${index}`, cutRegionId = `cut-${id}`;
      fragments.push({ id, imageBlob: blob, createdAt, updatedAt: createdAt, sourceType: 'cropped',
        sourcePageId: 'dubliners-source', cutRegionId, ocrText: text, ocrStatus: 'done', boxId: DEFAULT_BOX_ID,
        boxIds: [DEFAULT_BOX_ID, ...(index < 3 ? ['demo-poem-box'] : [])], isFavorite: index === 1 });
      cutRegions.push({ id: cutRegionId, sourcePageId: 'dubliners-source', x, y, width, height, fragmentId: id, createdAt });
      dimensions.push({ width, height });
    }
  } finally { bitmap.close(); }
  const name = zh ? '雪落在字句之间' : 'Snow between words';
  return {
    sources: [{ id: 'dubliners-source', name: zh ? '都柏林人 · 死者' : 'Dubliners · The Dead', imageBlob,
      createdAt, cutRegions, ocrText: selections.map(s => s[0]).join(' '), ocrStatus: 'done', nameEdited: true,
      book: zh ? '都柏林人' : 'Dubliners', author: 'James Joyce', chapterOrPage: zh ? '死者（用户提供的译文截图，译者未注明）' : 'The Dead', isFavorite: true }],
    fragments,
    boxes: [{ id: DEFAULT_BOX_ID, name: 'Default Box', createdAt }, { id: 'demo-poem-box', name: zh ? '雪' : 'Snow', createdAt }],
    canvases: [{ id: 'main-canvas', name, createdAt, updatedAt: createdAt, archivedAt: createdAt,
      width: 1200, height: 900, backgroundColor: '#faf8f0', placements: [0, 2, 4, 5].map((index, order) => {
        const width = Math.min(740, dimensions[index].width / scale * 1.6);
        return { id: `placement-${order}`, canvasId: 'main-canvas', fragmentId: fragments[index].id,
          x: [110, 330, 170, 380][order], y: 155 + order * 165, width,
          height: width * dimensions[index].height / dimensions[index].width, rotation: [-2, 3, -1, 2][order] };
      }) }],
  };
}
