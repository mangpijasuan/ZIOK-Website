const net = require('node:net');

// Cloudflare's published edge ranges (https://www.cloudflare.com/ips-v4 and ips-v6, checked 2026-11-24).
// Used only when ZIOK_CLOUDFLARE=true; review them now and then.
const cloudflareRanges = ['173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22', '141.101.64.0/18', '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20', '197.234.240.0/22', '198.41.128.0/17', '162.158.0.0/15', '104.16.0.0/13', '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22', '2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32', '2405:8100::/32', '2a06:98c0::/29', '2c0f:f248::/32'];
const cloudflare = new net.BlockList();
for (const range of cloudflareRanges) { const [address, bits] = range.split('/'); cloudflare.addSubnet(address, Number(bits), net.isIP(address) === 4 ? 'ipv4' : 'ipv6'); }

// Parses a comma-separated list of proxy IPs or CIDR ranges into a matcher.
// Blanket trust ("0.0.0.0/0", "::/0") is rejected because it would let any
// client choose its own address through X-Forwarded-For.
function parseTrustedProxies(value, { cloudflare: behindCloudflare = false } = {}) {
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
  return { configured: entries.length > 0, has: address => matches(list, address), cloudflare: behindCloudflare };
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
  // Behind Cloudflare the visitor's address arrives in CF-Connecting-IP. It is believed only when the address
  // that connected to our proxy (the last X-Forwarded-For entry, added by the proxy itself) is a Cloudflare
  // edge, so a request that bypasses Cloudflare cannot choose its own address with this header.
  if (trusted.cloudflare && forwarded.length && matches(cloudflare, forwarded.at(-1))) {
    const visitor = normalize(String(req.headers['cf-connecting-ip'] || '').trim());
    if (net.isIP(visitor) && !matches(cloudflare, visitor) && !trusted.has(visitor)) return visitor;
    return forwarded.at(-1);
  }
  for (let index = forwarded.length - 1; index >= 0; index--) {
    const candidate = forwarded[index];
    if (!net.isIP(candidate)) return socket;
    if (!trusted.has(candidate)) return candidate;
  }
  return socket;
}

module.exports = { parseTrustedProxies, clientAddress };
