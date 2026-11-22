const https = require('node:https');
const os = require('node:os');
const { randomBytes, createHash, X509Certificate } = require('node:crypto');
const selfsigned = require('selfsigned');
const discovery = require('./lan-discovery.cjs');
const LIMIT = 64 * 1024 * 1024, TTL = 10 * 60 * 1000;
function privateAddress(address) {
  const ip = String(address).replace(/^::ffff:/, '');
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(ip)) return false;
  const p = ip.split('.').map(Number);
  if (p.some(n => n > 255)) return false;
  return p[0] === 10 || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) || (p[0] === 192 && p[1] === 168) || p[0] === 127;
}
function fingerprintCode(fingerprint) {
  if (!/^[a-f0-9]{64}$/.test(fingerprint)) throw new Error('Invalid device certificate.');
  let value = BigInt(`0x${fingerprint}`) % (26n ** 6n), code = '';
  for (let i = 0; i < 6; i++) { code = String.fromCharCode(65 + Number(value % 26n)) + code; value /= 26n; }
  return code;
}
function parseCode(value) {
  if (typeof value !== 'string' || !/^[A-Z]{6}$/.test(value.trim().toUpperCase())) throw new Error('Enter six letters, for example KMTQRP.');
  return value.trim().toUpperCase();
}
async function readBody(stream, limit) {
  let size = 0; const chunks = [];
  for await (const chunk of stream) {
    size += chunk.length;
    if (size > limit) throw new Error('Transfer is too large. Maximum: 64 MB.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
function createLanTransfer({ approve = async () => false, addresses, find = discovery.discover, announce = discovery.advertise } = {}) {
  let server, expiryTimer, closeDiscovery;
  async function stop() {
    clearTimeout(expiryTimer);
    closeDiscovery?.(); closeDiscovery = undefined;
    if (!server) return;
    const previous = server; server = undefined;
    previous.closeAllConnections();
    await new Promise(resolve => previous.close(resolve));
  }
  async function start(snapshot) {
    if (typeof snapshot !== 'string' || Buffer.byteLength(snapshot) > LIMIT - 4096) throw new Error('Library is too large for one transfer (64 MB limit).');
    await stop();
    const hosts = addresses || [...new Set(Object.values(os.networkInterfaces()).flat().filter(i => i && !i.internal && i.family === 'IPv4' && privateAddress(i.address)).map(i => i.address))].slice(0, 8);
    if (!hosts.length) throw new Error('Connect to a private Wi-Fi or local network first.');
    const pems = await selfsigned.generate([{ name: 'commonName', value: 'Fragmente local transfer' }], { keyType: 'ec', notAfterDate: new Date(Date.now() + 86400000) });
    const fingerprint = createHash('sha256').update(new X509Certificate(pems.cert).raw).digest('hex');
    const code = fingerprintCode(fingerprint), expiresAt = Date.now() + TTL, seen = new Set();
    let requests = 0, windowStart = Date.now(), awaitingApproval = false;
    const current = https.createServer({ key: pems.private, cert: pems.cert, minVersion: 'TLSv1.3' }, async (req, res) => {
      res.setHeader('Cache-Control', 'no-store'); res.setHeader('Connection', 'close');
      try {
        if (req.method !== 'POST' || req.url !== '/materials' || req.headers.origin || !privateAddress(req.socket.remoteAddress)) { res.writeHead(403).end(); return; }
        if (Date.now() - windowStart > 60000) { windowStart = Date.now(); requests = 0; }
        if (++requests > 10 || awaitingApproval) { res.writeHead(429).end(); return; }
        if (Date.now() >= expiresAt) { res.writeHead(410).end(); return; }
        const message = JSON.parse((await readBody(req, 2048)).toString());
        if (message.code !== code || message.action !== 'receive' || typeof message.nonce !== 'string' || !/^[a-f0-9]{32}$/.test(message.nonce)
          || !Number.isFinite(message.time) || Math.abs(Date.now() - message.time) > 60000 || seen.has(message.nonce)) throw new Error('Invalid pairing request.');
        seen.add(message.nonce); awaitingApproval = true;
        let allowed;
        try { allowed = await approve({ address: req.socket.remoteAddress.replace(/^::ffff:/, ''), code }); }
        finally { awaitingApproval = false; }
        if (!allowed || current !== server || Date.now() >= expiresAt || res.destroyed) { if (!res.destroyed) res.writeHead(403).end(); return; }
        const body = Buffer.from(JSON.stringify({ nonce: message.nonce, snapshot }));
        res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': body.length }); res.end(body);
      } catch { if (!res.destroyed) { if (!res.headersSent) res.writeHead(403); res.end(); } }
    });
    current.maxConnections = 8; current.requestTimeout = 60000; current.headersTimeout = 10000;
    current.setTimeout(60000, socket => socket.destroy());
    await new Promise((resolve, reject) => { current.once('error', reject); current.listen(0, addresses ? '127.0.0.1' : '0.0.0.0', resolve); });
    server = current;
    try { closeDiscovery = await announce({ code, port: current.address().port, fingerprint }, hosts); }
    catch (error) { await stop(); throw error; }
    expiryTimer = setTimeout(() => { void stop(); }, TTL); expiryTimer.unref();
    return { code, expiresAt };
  }
  async function receive(value) {
    const code = parseCode(value), peers = await find(code);
    const matching = peers.filter(peer => privateAddress(peer.host) && Number.isInteger(peer.port) && peer.port >= 1024 && peer.port <= 65535 && fingerprintCode(peer.fingerprint) === code);
    if (!matching.length) throw new Error('Device not found. Check the connection code and local-network access.');
    if (new Set(matching.map(p => p.fingerprint)).size > 1) throw new Error('Multiple devices have this code. Create a new connection code.');
    for (const peer of matching) {
      try {
        const nonce = randomBytes(16).toString('hex');
        const body = Buffer.from(JSON.stringify({ action: 'receive', code, nonce, time: Date.now() }));
        const bytes = await new Promise((resolve, reject) => {
          // Local self-signed certificates are pinned before sending application data.
          const request = https.request({ hostname: peer.host, port: peer.port, path: '/materials', method: 'POST', agent: false,
            rejectUnauthorized: false, minVersion: 'TLSv1.3', headers: { 'Content-Type': 'application/json', 'Content-Length': body.length }, timeout: 60000 }, response => {
            if (response.statusCode !== 200) { response.resume(); reject(Object.assign(new Error('Transfer not approved or the sender is busy. Check the sending device and retry.'), { code: 'PAIRING_REJECTED' })); return; }
            readBody(response, LIMIT).then(resolve, reject);
          });
          request.on('socket', socket => socket.once('secureConnect', () => {
            const raw = socket.getPeerCertificate().raw;
            const actual = raw && createHash('sha256').update(raw).digest('hex');
            if (actual !== peer.fingerprint || fingerprintCode(actual) !== code) { request.destroy(new Error('Device certificate does not match the connection code.')); return; }
            request.end(body);
          }));
          request.on('error', reject); request.on('timeout', () => request.destroy(new Error('Timed out waiting for the sending device.')));
        });
        const result = JSON.parse(bytes.toString());
        if (result.nonce !== nonce || typeof result.snapshot !== 'string') throw new Error('Invalid transfer response.');
        return result.snapshot;
      } catch (error) {
        if (error.code === 'PAIRING_REJECTED') throw error;
        // Connection failures can still try another interface of the same verified sender.
      }
    }
    throw new Error('Transfer failed. Approve the request on the sending device, keep both apps open, and check local-network access.');
  }
  return { start, receive, stop };
}
module.exports = { createLanTransfer, privateAddress, parseCode, fingerprintCode };
