const dgram = require('node:dgram');
const { randomBytes } = require('node:crypto');
const GROUP = '239.255.83.71', PORT = 48371, PROTOCOL = 'fragmente-lan-v2';
function packet(bytes) {
  if (bytes.length > 2048) return null;
  try { const value = JSON.parse(bytes.toString()); return value.protocol === PROTOCOL ? value : null; } catch { return null; }
}
async function advertise(offer, addresses) {
  const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
  try {
    await new Promise((resolve, reject) => { socket.once('error', reject); socket.bind(PORT, '0.0.0.0', resolve); });
    let memberships = 0;
    for (const address of addresses) try { socket.addMembership(GROUP, address); memberships++; } catch { /* Try another interface. */ }
    if (!memberships) throw new Error('Local-network discovery is unavailable on this connection.');
    socket.on('error', () => {});
    socket.on('message', (bytes, remote) => {
      const request = packet(bytes);
      if (!request || request.kind !== 'find' || request.code !== offer.code || !/^[a-f0-9]{32}$/.test(request.nonce)) return;
      socket.send(Buffer.from(JSON.stringify({ protocol: PROTOCOL, kind: 'offer', nonce: request.nonce, port: offer.port, fingerprint: offer.fingerprint })), remote.port, remote.address, () => {});
    });
    return () => socket.close();
  } catch (error) { socket.close(); throw error; }
}
async function discover(code, interfaceAddress) {
  const socket = dgram.createSocket('udp4'), nonce = randomBytes(16).toString('hex');
  let interval, timeout, settle;
  const offers = new Map();
  try {
    return await new Promise((resolve, reject) => {
      socket.on('error', reject);
      socket.on('message', (bytes, remote) => {
        const offer = packet(bytes);
        if (!offer || offer.kind !== 'offer' || offer.nonce !== nonce || !Number.isInteger(offer.port) || offer.port < 1024 || offer.port > 65535 || !/^[a-f0-9]{64}$/.test(offer.fingerprint)) return;
        offers.set(`${remote.address}:${offer.port}`, { host: remote.address, port: offer.port, fingerprint: offer.fingerprint });
        if (!settle) settle = setTimeout(() => resolve([...offers.values()]), 300);
      });
      socket.bind(0, '0.0.0.0', () => {
        if (interfaceAddress) socket.setMulticastInterface(interfaceAddress);
        socket.setMulticastTTL(1);
        const message = Buffer.from(JSON.stringify({ protocol: PROTOCOL, kind: 'find', code, nonce }));
        const send = () => socket.send(message, PORT, GROUP, error => { if (error) reject(error); });
        send(); interval = setInterval(send, 1000);
      });
      timeout = setTimeout(() => reject(new Error('Device not found. Check the six-letter code, keep both apps open on the same Wi-Fi, and allow local-network access.')), 6000);
    });
  } finally { clearInterval(interval); clearTimeout(timeout); clearTimeout(settle); socket.close(); }
}
module.exports = { advertise, discover, packet };
