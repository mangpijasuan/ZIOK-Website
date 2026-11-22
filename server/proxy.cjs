const net = require('node:net');

// Parses a comma-separated list of proxy IPs or CIDR ranges into a matcher.
// Blanket trust ("0.0.0.0/0", "::/0") is rejected because it would let any
// client choose its own address through X-Forwarded-For.
function parseTrustedProxies(value) {
  const list = new net.BlockList();
  const entries = String(value || '').split(',').map(item => item.trim()).filter(Boolean);
  for (const entry of entries) {
    const [address, prefix, extra] = entry.split('/');
    const family = net.isIP(address);
    if (!family || extra !== undefined) throw new Error(`Invalid ZIOK_TRUSTED_PROXIES entry: ${entry}`);
    const type = family === 4 ? 'ipv4' : 'ipv6';
    if (prefix === undefined) { list.addAddress(address, type); continue; }
    const bits = Number(prefix);
    if (!/^\d{1,3}$/.test(prefix) || bits < 1 || bits > (family === 4 ? 32 : 128)) throw new Error(`Invalid ZIOK_TRUSTED_PROXIES entry: ${entry}`);
    list.addSubnet(address, bits, type);
  }
  return { configured: entries.length > 0, has: address => matches(list, address) };
}

function normalize(address) {
  if (typeof address !== 'string') return '';
  return address.toLowerCase().replace(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/, '$1');
}

function matches(list, address) {
  const family = net.isIP(address);
  return family !== 0 && list.check(address, family === 4 ? 'ipv4' : 'ipv6');
}

// Returns the client address. X-Forwarded-For is consulted only when the
// connecting socket is a configured proxy. The header is read from the right,
// skipping other trusted proxies, so entries a client prepends are ignored.
function clientAddress(req, trusted) {
  const socket = normalize(req.socket.remoteAddress) || 'unknown';
  if (!trusted.configured || !trusted.has(socket)) return socket;
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',').map(item => normalize(item.trim())).filter(Boolean);
  for (let index = forwarded.length - 1; index >= 0; index--) {
    const candidate = forwarded[index];
    if (!net.isIP(candidate)) return socket;
    if (!trusted.has(candidate)) return candidate;
  }
  return socket;
}

module.exports = { parseTrustedProxies, clientAddress };
