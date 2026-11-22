const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const { createApp } = require('../server/app.cjs');
const { hashPassword, parseUsers } = require('../server/auth.cjs');
const { chooseEncoding, cachePolicy } = require('../server/delivery.cjs');

const root = path.resolve(__dirname, '..');

test('encoding negotiation honours preferences and q=0', () => {
  assert.equal(chooseEncoding('gzip, deflate, br'), 'br');
  assert.equal(chooseEncoding('gzip'), 'gzip');
  assert.equal(chooseEncoding('br;q=0, gzip'), 'gzip');
  assert.equal(chooseEncoding('br;q=0, gzip;q=0'), null);
  assert.equal(chooseEncoding('*'), 'br');
  assert.equal(chooseEncoding('identity'), null);
  assert.equal(chooseEncoding(undefined), null);
});

test('cache lifetimes follow how often a kind of file changes', () => {
  assert.equal(cachePolicy('index.html'), 'no-cache');
  assert.equal(cachePolicy('shared.css'), 'no-cache');
  assert.equal(cachePolicy('home.js'), 'no-cache');
  assert.equal(cachePolicy('ziok-social.jpg'), 'public, max-age=604800');
  assert.equal(cachePolicy('ziok-logo-160.webp'), 'public, max-age=604800');
  assert.equal(cachePolicy('documents/bylaws/page-01.webp'), 'public, max-age=2592000');
  assert.equal(cachePolicy('documents/ziok-bylaws-september-2024.pdf'), 'public, max-age=2592000');
});

function get(base, route, headers = {}, method = 'GET') {
  return new Promise((resolve, reject) => {
    const request = http.request(base + route, { method, headers }, response => {
      const chunks = []; response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks) }));
    });
    request.on('error', reject); request.end();
  });
}

async function withServer(run) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ziok-delivery-'));
  const users = parseUsers(JSON.stringify([{ username: 'admin', role: 'admin', passwordHash: await hashPassword('test-only-password-for-ci') }]));
  const server = createApp({ users, stateFile: path.join(directory, 'content.json'), origin: 'https://ziok.test' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); fs.rmSync(directory, { recursive: true, force: true }); }
}

test('text responses are compressed when accepted, and the content is unchanged', async () => {
  await withServer(async base => {
    const original = fs.readFileSync(path.join(root, 'index.html'));
    const brotli = await get(base, '/index.html', { 'Accept-Encoding': 'gzip, br' });
    assert.equal(brotli.headers['content-encoding'], 'br');
    assert.equal(brotli.headers.vary, 'Accept-Encoding');
    assert.ok(brotli.body.length < original.length / 2, `${brotli.body.length} vs ${original.length}`);
    assert.equal(Number(brotli.headers['content-length']), brotli.body.length);
    assert.deepEqual(zlib.brotliDecompressSync(brotli.body), original);
    const gzip = await get(base, '/index.html', { 'Accept-Encoding': 'gzip' });
    assert.equal(gzip.headers['content-encoding'], 'gzip');
    assert.deepEqual(zlib.gunzipSync(gzip.body), original);
    const plain = await get(base, '/index.html', {});
    assert.equal(plain.headers['content-encoding'], undefined);
    assert.equal(plain.headers.vary, 'Accept-Encoding', 'caches keep separate copies');
    assert.deepEqual(plain.body, original);
    for (const route of ['/shared.css', '/home.js', '/sitemap.xml', '/news/', '/missing-page']) {
      const response = await get(base, route, { 'Accept-Encoding': 'br', Accept: 'text/html' });
      assert.equal(response.headers['content-encoding'], 'br', route);
    }
    for (const route of ['/ziok-social.jpg', '/ziok-logo-160.webp', '/documents/bylaws/page-01.webp', '/documents/ziok-bylaws-september-2024.pdf']) {
      const response = await get(base, route, { 'Accept-Encoding': 'br, gzip' });
      assert.equal(response.status, 200, route);
      assert.equal(response.headers['content-encoding'], undefined, `${route} is already compressed`);
    }
  });
});

test('validators answer repeat visits with 304 and keep cache headers', async () => {
  await withServer(async base => {
    for (const route of ['/index.html', '/shared.css', '/ziok-social.jpg', '/documents/bylaws/page-01.webp', '/news/', '/sitemap.xml']) {
      const first = await get(base, route, { 'Accept-Encoding': 'br' });
      assert.equal(first.status, 200, route);
      assert.ok(first.headers.etag, `${route} has an ETag`);
      const again = await get(base, route, { 'Accept-Encoding': 'br', 'If-None-Match': first.headers.etag });
      assert.equal(again.status, 304, route);
      assert.equal(again.body.length, 0);
      assert.equal(again.headers['cache-control'], first.headers['cache-control']);
      assert.equal(again.headers.etag, first.headers.etag);
      const other = await get(base, route, { 'If-None-Match': 'W/"something-else"' });
      assert.equal(other.status, 200, route);
    }
    const file = await get(base, '/shared.css');
    const modified = await get(base, '/shared.css', { 'If-Modified-Since': file.headers['last-modified'] });
    assert.equal(modified.status, 304);
    const older = await get(base, '/shared.css', { 'If-Modified-Since': new Date(0).toUTCString() });
    assert.equal(older.status, 200);
  });
});

test('cache headers on served files, HEAD requests, and private areas', async () => {
  await withServer(async base => {
    assert.equal((await get(base, '/index.html')).headers['cache-control'], 'no-cache');
    assert.equal((await get(base, '/ziok-social.jpg')).headers['cache-control'], 'public, max-age=604800');
    assert.equal((await get(base, '/documents/bylaws/page-01.webp')).headers['cache-control'], 'public, max-age=2592000');
    const head = await get(base, '/index.html', { 'Accept-Encoding': 'br' }, 'HEAD');
    assert.equal(head.status, 200); assert.equal(head.body.length, 0);
    assert.ok(Number(head.headers['content-length']) > 0);
    assert.equal(head.headers['content-encoding'], 'br');
    const admin = await get(base, '/admin/admin.js', { 'Accept-Encoding': 'br' });
    assert.equal(admin.headers['cache-control'], 'no-store');
    assert.equal(admin.headers['x-robots-tag'], 'noindex, nofollow');
    const missing = await get(base, '/nope.png');
    assert.equal(missing.status, 404);
    assert.equal(missing.headers['cache-control'], 'no-store', 'errors are not cached');
    const publicContent = await get(base, '/public-content.js');
    assert.equal(publicContent.headers['cache-control'], 'no-store');
  });
});
