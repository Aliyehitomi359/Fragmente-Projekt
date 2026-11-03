const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function fixture() {
  const elements = new Map(), timers = new Map(), actions = [];
  let nextTimer = 0, onState;
  function element(id) {
    if (!elements.has(id)) elements.set(id, { hidden: true, dataset: {}, attributes: {}, classList: { toggle() {} },
      setAttribute(name, value) { this.attributes[name] = value; }, setPointerCapture() {},
      querySelector() { return { textContent: '' }; } });
    return elements.get(id);
  }
  const captures = ['fragment', 'source'].map(kind => { const e = element(kind); e.dataset.kind = kind; return e; });
  const document = { querySelector: element, querySelectorAll: () => captures,
    elementFromPoint: () => ({ closest: () => null }) };
  const window = { screenX: 100, screenY: 100, captureUI: { action: (...args) => actions.push(args), onState(callback) { onState = callback; } } };
  const html = fs.readFileSync(path.join(__dirname, 'capture-widget.html'), 'utf8');
  vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], {
    document, window,
    setTimeout: (fn, milliseconds) => { timers.set(++nextTimer, { fn, milliseconds }); return nextTimer; },
    clearTimeout: id => timers.delete(id),
  });
  return { element, captures, actions, timers, document, notify: state => onState(state), tick: () => { for (const { fn } of [...timers.values()]) fn(); timers.clear(); } };
}

test('single click and hover open menu; leaving cancels hover; main app opens only from menu', () => {
  const f = fixture(), orb = f.element('#orb');
  orb.onclick();
  assert.equal(f.element('#menu').hidden, false);
  assert.ok(!f.actions.some(([name]) => name === 'open'));
  orb.onclick();
  assert.equal(f.element('#menu').hidden, true);
  f.actions.length = 0;
  orb.onmouseenter();
  assert.equal([...f.timers.values()][0].milliseconds, 550);
  orb.onmouseleave(); f.tick();
  assert.equal(f.actions.length, 0);
  orb.onmouseenter(); f.tick();
  assert.equal(f.element('#menu').hidden, false);
  assert.ok(!f.actions.some(([name]) => name === 'start'));
  f.element('#open').onclick();
  assert.ok(f.actions.some(([name]) => name === 'open'));
});

test('dragging does not open menu or app; click and right-click retain capture choices', () => {
  const f = fixture(), orb = f.element('#orb');
  orb.onmouseenter();
  orb.onpointerdown({ button: 0, screenX: 100, screenY: 100, pointerId: 1 });
  orb.onpointermove({ screenX: 130, screenY: 120 });
  orb.onpointerup(); orb.onclick(); f.tick();
  assert.ok(f.actions.some(([name]) => name === 'move'));
  assert.ok(!f.actions.some(([name]) => name === 'open'));
  assert.equal(f.element('#menu').hidden, true);
  orb.onclick();
  assert.equal(f.element('#menu').hidden, false);
  f.captures[0].onclick();
  assert.ok(f.actions.some(([name, kind]) => name === 'start' && kind === 'fragment'));
  orb.oncontextmenu({ preventDefault() {} });
  assert.equal(f.element('#menu').hidden, false);
});

test('success dismisses after three seconds; errors remain and opening menu cancels dismissal', () => {
  const f = fixture();
  f.notify({ text: 'Saved in the app and your local Library.' });
  assert.equal(f.element('#status').hidden, false);
  assert.equal([...f.timers.values()][0].milliseconds, 3000);
  f.tick();
  assert.equal(f.element('#status').hidden, true);
  assert.ok(f.actions.some(([name, value]) => name === 'expand' && value === false));
  f.notify({ text: 'Saved' });
  f.element('#orb').onclick();
  assert.equal(f.timers.size, 0);
  f.tick();
  assert.equal(f.element('#menu').hidden, false);
  f.notify({ text: 'Disk unavailable', error: true });
  assert.equal(f.timers.size, 0);
  assert.equal(f.element('#status').hidden, false);
});

test('transparent space passes clicks through; visible controls and orb dragging remain interactive', () => {
  const f = fixture();
  f.document.elementFromPoint = () => ({ closest: () => f.element('#orb') });
  f.document.onmousemove({ clientX: 30, clientY: 40 });
  assert.deepEqual(f.actions.at(-1), ['ignore-mouse', false]);
  f.document.elementFromPoint = () => ({ closest: () => null });
  f.document.onmousemove({ clientX: 30, clientY: 20 });
  assert.deepEqual(f.actions.at(-1), ['ignore-mouse', true]);
  const orb = f.element('#orb');
  orb.onpointerdown({ button: 0, screenX: 100, screenY: 100, pointerId: 1 });
  const count = f.actions.length;
  f.document.onmousemove({ clientX: 30, clientY: 20 });
  assert.equal(f.actions.length, count);
  orb.onpointerup();
});
