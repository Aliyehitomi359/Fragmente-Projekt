function cropPixels(rect, bounds, size) {
  if (!rect || ![rect.x, rect.y, rect.width, rect.height].every(Number.isFinite)) throw new Error('Invalid selection.');
  const x = Math.max(0, Math.min(size.width - 1, Math.floor(rect.x * size.width / bounds.width)));
  const y = Math.max(0, Math.min(size.height - 1, Math.floor(rect.y * size.height / bounds.height)));
  const right = Math.min(size.width, Math.ceil((rect.x + rect.width) * size.width / bounds.width));
  const bottom = Math.min(size.height, Math.ceil((rect.y + rect.height) * size.height / bounds.height));
  if (rect.width < 3 || rect.height < 3 || right <= x || bottom <= y) throw new Error('Select a larger area.');
  return { x, y, width: right - x, height: bottom - y };
}
module.exports = { cropPixels };
