// Response delivery: compression, validators (ETag, Last-Modified) and cache lifetimes.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { createHash } = require('node:crypto');

const compressible = new Set(['.html', '.js', '.css', '.xml', '.txt', '.json']);
const minimumCompressedSize = 860;
const week = 7 * 24 * 60 * 60, month = 30 * 24 * 60 * 60;

// Cache lifetimes by what changes how often. Pages and scripts are revalidated every time (a 304 is
// cheap and changes appear at once); images and documents are kept by browsers for a while.
function cachePolicy(relative) {
  const extension = path.extname(relative);
  if (relative.startsWith('documents/')) return `public, max-age=${month}`;
  if (['.webp', '.png', '.jpg', '.ico'].includes(extension)) return `public, max-age=${week}`;
  return 'no-cache';
}

// Picks the best encoding the client accepts, honouring q=0 as "not acceptable".
function chooseEncoding(header) {
  const accepted = new Map();
  for (const part of String(header || '').split(',')) {
    const [name, ...params] = part.trim().toLowerCase().split(';');
    if (!name) continue;
    const q = params.map(item => /^\s*q=([\d.]+)\s*$/.exec(item)?.[1]).find(Boolean);
    accepted.set(name, q === undefined ? 1 : Number(q));
  }
  for (const name of ['br', 'gzip']) if ((accepted.get(name) ?? accepted.get('*') ?? 0) > 0) return name;
  return null;
}

const cache = new Map();
function compress(encoding, body, key, quality) {
  const cacheKey = `${key}:${encoding}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  const output = encoding === 'br'
    ? zlib.brotliCompressSync(body, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: quality, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: body.length } })
    : zlib.gzipSync(body, { level: quality >= 9 ? 9 : 6 });
  if (cache.size >= 300) cache.delete(cache.keys().next().value);
  cache.set(cacheKey, output);
  return output;
}

function matches(header, etag) {
  if (!header) return false;
  if (header.trim() === '*') return true;
  const strip = value => value.trim().replace(/^W\//, '');
  return header.split(',').some(candidate => strip(candidate) === strip(etag));
}

function notModified(req, etag, lastModified) {
  if (req.headers['if-none-match']) return matches(req.headers['if-none-match'], etag);
  const since = Date.parse(req.headers['if-modified-since'] || '');
  return lastModified !== undefined && !Number.isNaN(since) && Math.floor(lastModified / 1000) * 1000 <= since;
}

// Sends an in-memory body. `etag` identifies the content; `key` identifies it for the compression cache.
function sendBody(req, res, { status = 200, type, body, cacheControl, etag, lastModified, extension, quality = 5 }) {
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
  const headers = { 'Content-Type': type, 'Cache-Control': cacheControl };
  if (status === 200 && etag) headers.ETag = etag;
  if (status === 200 && lastModified !== undefined) headers['Last-Modified'] = new Date(lastModified).toUTCString();
  const shouldCompress = compressible.has(extension);
  if (shouldCompress) headers.Vary = 'Accept-Encoding';
  if (status === 200 && etag && notModified(req, etag, lastModified)) { res.writeHead(304, headers); return res.end(); }
  let payload = buffer;
  const encoding = shouldCompress && buffer.length >= minimumCompressedSize ? chooseEncoding(req.headers['accept-encoding']) : null;
  if (encoding) { payload = compress(encoding, buffer, etag || createHash('sha1').update(buffer).digest('hex'), quality); headers['Content-Encoding'] = encoding; }
  headers['Content-Length'] = payload.length;
  res.writeHead(status, headers);
  res.end(req.method === 'HEAD' ? undefined : payload);
}

const bodyTag = body => `W/"${createHash('sha1').update(body).digest('base64url').slice(0, 20)}"`;

// Sends a file from disk. Text files are compressed once and cached; images and PDFs stream unchanged.
function sendFileWithCaching(req, res, file, { relative, cacheControl = cachePolicy(relative), status = 200, type }) {
  const stat = fs.statSync(file);
  const extension = path.extname(file);
  const etag = `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
  if (compressible.has(extension)) {
    return sendBody(req, res, { status, type, body: fs.readFileSync(file), cacheControl, etag, lastModified: stat.mtimeMs, extension, quality: 11 });
  }
  const headers = { 'Content-Type': type, 'Cache-Control': cacheControl, 'Content-Length': stat.size };
  if (status === 200) { headers.ETag = etag; headers['Last-Modified'] = new Date(stat.mtimeMs).toUTCString(); }
  if (status === 200 && notModified(req, etag, stat.mtimeMs)) { delete headers['Content-Length']; res.writeHead(304, headers); return res.end(); }
  res.writeHead(status, headers);
  if (req.method === 'HEAD') res.end(); else fs.createReadStream(file).pipe(res);
}

module.exports = { cachePolicy, chooseEncoding, sendBody, bodyTag, sendFileWithCaching };
