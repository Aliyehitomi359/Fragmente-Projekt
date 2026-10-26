const { test } = require('node:test');
const assert = require('node:assert/strict');
const { cropPixels } = require('./capture-geometry.cjs');
test('crop uses actual screenshot pixels, including Retina and fractional display scaling', () => {
  assert.deepEqual(cropPixels({ x: 10, y: 20, width: 100, height: 40 }, { width: 1000, height: 800 }, { width: 2000, height: 1600 }), { x: 20, y: 40, width: 200, height: 80 });
  assert.deepEqual(cropPixels({ x: 10, y: 20, width: 100, height: 40 }, { width: 1000, height: 800 }, { width: 1250, height: 1000 }), { x: 12, y: 25, width: 126, height: 50 });
});
test('crop clamps to screen and rejects empty or malformed selections', () => {
  assert.deepEqual(cropPixels({ x: -10, y: -10, width: 1100, height: 900 }, { width: 1000, height: 800 }, { width: 1000, height: 800 }), { x: 0, y: 0, width: 1000, height: 800 });
  for (const rect of [null, { x: NaN, y: 0, width: 10, height: 10 }, { x: 0, y: 0, width: 1, height: 10 }, { x: 1200, y: 0, width: -5, height: 10 }]) assert.throws(() => cropPixels(rect, { width: 1000, height: 800 }, { width: 1000, height: 800 }));
});
