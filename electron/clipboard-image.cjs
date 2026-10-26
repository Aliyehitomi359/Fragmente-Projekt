const UTIF = require('utif');
const { PNG } = require('pngjs');
const isNativeCandidate = (type) => type.startsWith('electron application/osclipboard;') &&
  !/format="(?:NSStringPboardType|Apple HTML pasteboard type|org\.chromium\.|public\.(?:utf8|utf16|html|rtf|url|text))/.test(type);

function decodeTiff(bytes) {
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const [page] = UTIF.decode(buffer);
  if (!page || !(page.t256?.[0] > 0) || !(page.t257?.[0] > 0) || page.t256[0] * page.t257[0] > 40000000) throw new Error('TIFF image is empty or too large.');
  UTIF.decodeImage(buffer, page);
  return PNG.sync.write({ width: page.width, height: page.height, data: Buffer.from(UTIF.toRGBA8(page)) });
}

async function readClipboardPng(clipboard, nativeImage) {
  const items = await clipboard.read();
  const formats = new Set();
  let imageFound = false;
  for (const item of items) {
    item.types.forEach((type) => formats.add(type));
    const types = [...item.types].filter((type) => type.startsWith('image/') || isNativeCandidate(type));
    types.sort((a, b) => Number(b === 'image/png') - Number(a === 'image/png'));
    for (const type of types) {
      try {
        const blob = await item.getType(type);
        if (!blob.size || blob.size > 64 * 1024 * 1024) continue;
        const bytes = Buffer.from(await blob.arrayBuffer());
        const tiff = bytes.length >= 4 && (bytes.readUInt32LE(0) === 0x002a4949 || bytes.readUInt32BE(0) === 0x4d4d002a);
        imageFound ||= type.startsWith('image/') || tiff;
        if (tiff) return new Uint8Array(decodeTiff(bytes));
        const image = nativeImage.createFromBuffer(bytes);
        if (!image.isEmpty()) return new Uint8Array(image.toPNG());
      } catch { /* Another representation may still contain a readable image. */ }
    }
  }
  if (imageFound) throw new Error('An image was copied, but its format could not be decoded. Try copying the image itself again, or use Upload.');
  if ([...formats].some(isNativeCandidate)) {
    throw new Error(`No readable image representation was found. Clipboard formats: ${[...formats].filter(isNativeCandidate).slice(0, 3).map((type) => type.slice(0, 100)).join(', ')}. The source app may have copied a private format.`);
  }
  return null;
}
module.exports = { readClipboardPng, decodeTiff };
