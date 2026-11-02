const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('rotating the capture frame leaves screen pixels fixed and inverse-samples its bounds', () => {
  const html = fs.readFileSync(`${__dirname}/capture-overlay.html`, 'utf8');
  assert.equal((html.match(/class="rotate-handle"/g) || []).length, 1);
  assert.ok(!html.includes('id="local-preview"'));
  assert.ok(!html.includes('type="range"'));
  const calls = [];
  const ctx = Object.fromEntries(['fillRect', 'translate', 'scale', 'rotate', 'drawImage'].map(name => [name, (...args) => calls.push([name, ...args])]));
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, { style: {}, naturalWidth: 2000, naturalHeight: 1600,
      classList: { add() {}, remove() {} }, getContext: () => ctx });
    return elements.get(id);
  };
  const context = vm.createContext({ document: { querySelector: element, querySelectorAll: () => [element('.rotate-handle')] },
    window: { captureUI: { onState() {} } }, innerWidth: 1000, innerHeight: 800, Math, Number });
  vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], context);
  vm.runInContext('rect={x:100,y:200,width:300,height:40};updateRotation(30)', context);
  assert.equal(element('#selection').style.transform, 'rotate(30deg)');
  assert.deepEqual(element('#screen').style, {});
  assert.equal(element('#rotated').width, 600);
  assert.equal(element('#rotated').height, 80);
  assert.deepEqual(calls.find(call => call[0] === 'translate'), ['translate', 300, 40]);
  assert.deepEqual(calls.find(call => call[0] === 'scale'), ['scale', 2, 2]);
  assert.equal(calls.find(call => call[0] === 'rotate')[1], -Math.PI / 6);
  assert.deepEqual(calls.find(call => call[0] === 'drawImage').slice(2), [-250, -220, 1000, 800]);
});
