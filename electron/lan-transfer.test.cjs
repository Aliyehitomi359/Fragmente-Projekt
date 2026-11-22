const { test } = require('node:test');
const assert = require('node:assert/strict');
const https = require('node:https');
const { createLanTransfer, parseCode, fingerprintCode, privateAddress } = require('./lan-transfer.cjs');
const { advertise, discover, packet } = require('./lan-discovery.cjs');

test('six uppercase letters replace encoded endpoints and passwords', () => {
  assert.equal(parseCode(' kmtqrp '), 'KMTQRP');
  for (const code of ['ABC12D', 'ABCDE', 'ABCDEFG', 'FP1.long', 'https://example.com', null]) assert.throws(() => parseCode(code));
  assert.match(fingerprintCode('ab'.repeat(32)), /^[A-Z]{6}$/);
  assert.equal(privateAddress('192.168.1.2'), true);
  assert.equal(privateAddress('::ffff:10.0.0.2'), true);
  for (const host of ['8.8.8.8', 'example.com', '169.254.169.254', '192.168.1.999', '::1']) assert.equal(privateAddress(host), false);
  assert.equal(packet(Buffer.from('not json')), null);
});
function rawRequest(peer, code, nonce, origin) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname: '127.0.0.1', port: peer.port, path: '/materials', method: 'POST', rejectUnauthorized: false, agent: false,
      headers: origin ? { Origin: origin } : {} }, res => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
    req.on('error', reject); req.end(JSON.stringify({ action: 'receive', code, nonce, time: Date.now() }));
  });
}
test('certificate-pinned transfer requires sender approval and rejects replay, wrong pins and browser origins', async () => {
  let peer, allow = false, approvals = 0, stopped = false;
  const sender = createLanTransfer({ addresses: ['127.0.0.1'], approve: async () => { approvals++; return allow; },
    announce: async offer => { peer = { ...offer, host: '127.0.0.1' }; return () => { stopped = true; }; } });
  const receiver = createLanTransfer({ find: async () => [peer] });
  try {
    const snapshot = JSON.stringify({ version: 1, sources: [{ text: 'Synthetic private screenshot' }] });
    const session = await sender.start(snapshot);
    assert.match(session.code, /^[A-Z]{6}$/);
    assert.ok(session.expiresAt > Date.now());
    await assert.rejects(receiver.receive(session.code));
    assert.equal(approvals, 1);
    allow = true;
    assert.equal(await receiver.receive(session.code.toLowerCase()), snapshot);
    const requestNonce = 'a'.repeat(32);
    assert.equal(await rawRequest(peer, session.code, requestNonce), 200);
    assert.equal(await rawRequest(peer, session.code, requestNonce), 403);
    assert.equal(await rawRequest(peer, session.code, 'b'.repeat(32), 'https://example.com'), 403);
    const alteredPin = (BigInt(`0x${peer.fingerprint}`) + 26n ** 6n).toString(16).padStart(64, '0');
    assert.equal(fingerprintCode(alteredPin), session.code);
    const impostor = createLanTransfer({ find: async () => [{ ...peer, fingerprint: alteredPin }] });
    const before = approvals;
    await assert.rejects(impostor.receive(session.code));
    assert.equal(approvals, before, 'Wrong certificate must be rejected before sending the request');
    await sender.stop(); assert.equal(stopped, true);
    await assert.rejects(receiver.receive(session.code));
  } finally { await sender.stop(); await receiver.stop(); }
});
test('local multicast discovers the matching six-letter sender without carrying image data or keys', async () => {
  const offer = { code: 'ABCDEF', port: 40000, fingerprint: 'ab'.repeat(32) };
  const stop = await advertise(offer, ['127.0.0.1']);
  try {
    const found = await discover(offer.code, '127.0.0.1');
    assert.ok(found.some(peer => peer.port === offer.port && peer.fingerprint === offer.fingerprint));
    assert.ok(found.every(peer => Object.keys(peer).sort().join(',') === 'fingerprint,host,port'));
  } finally { stop(); }
});
