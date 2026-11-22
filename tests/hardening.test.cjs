const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp, hstsValue, securityHeaders } = require('../server/app.cjs');
const { hashPassword, parseUsers } = require('../server/auth.cjs');
const { parseTrustedProxies, clientAddress } = require('../server/proxy.cjs');
const { backup } = require('../server/backup.cjs');

const request = (address, forwarded) => ({ socket: { remoteAddress: address }, headers: forwarded === undefined ? {} : { 'x-forwarded-for': forwarded } });

test('forwarded addresses are honoured only from trusted proxies', () => {
  const none = parseTrustedProxies('');
  assert.equal(clientAddress(request('10.0.0.5', '203.0.113.9'), none), '10.0.0.5');
  const trusted = parseTrustedProxies('10.0.0.0/8, 172.16.0.1, fd00::/8');
  assert.equal(clientAddress(request('10.0.0.5', '203.0.113.9'), trusted), '203.0.113.9');
  assert.equal(clientAddress(request('::ffff:10.0.0.5', '203.0.113.9'), trusted), '203.0.113.9');
  // A client cannot choose its own address by prepending entries.
  assert.equal(clientAddress(request('10.0.0.5', '198.51.100.1, 203.0.113.9'), trusted), '203.0.113.9');
  // Chained trusted proxies are skipped.
  assert.equal(clientAddress(request('10.0.0.5', '203.0.113.9, 10.1.1.1'), trusted), '203.0.113.9');
  // An untrusted peer's header is ignored.
  assert.equal(clientAddress(request('198.51.100.7', '203.0.113.9'), trusted), '198.51.100.7');
  // Missing, empty or malformed headers fall back to the socket.
  assert.equal(clientAddress(request('10.0.0.5'), trusted), '10.0.0.5');
  assert.equal(clientAddress(request('10.0.0.5', 'not-an-ip'), trusted), '10.0.0.5');
  assert.equal(clientAddress(request('10.0.0.5', 'garbage, 10.1.1.1'), trusted), '10.0.0.5');
});

test('trusted proxy configuration rejects blanket or malformed trust', () => {
  for (const bad of ['0.0.0.0/0', '::/0', 'example.com', '10.0.0.0/33', '10.0.0.0/8/1', '10.0.0.0/x']) assert.throws(() => parseTrustedProxies(bad), bad);
  assert.equal(parseTrustedProxies('').configured, false);
});

test('HSTS defaults to one week, is configurable and can be disabled', () => {
  assert.equal(hstsValue({}), 'max-age=604800');
  assert.equal(hstsValue({ ZIOK_HSTS_MAX_AGE: '31536000', ZIOK_HSTS_INCLUDE_SUBDOMAINS: 'true' }), 'max-age=31536000; includeSubDomains');
  assert.equal(hstsValue({ ZIOK_HSTS_MAX_AGE: '0' }), '');
  assert.throws(() => hstsValue({ ZIOK_HSTS_MAX_AGE: '-1' }));
});

test('static host headers stay in step with the server headers', () => {
  const file = fs.readFileSync(path.join(__dirname, '..', '_headers'), 'utf8');
  for (const [name, value] of Object.entries(securityHeaders)) assert.ok(file.includes(`${name}: ${value}`), name);
  assert.match(file, /Strict-Transport-Security: max-age=\d+/);
});

async function withServer(options, run) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ziok-hardening-'));
  const passwordHash = await hashPassword('test-only-password-for-ci');
  const users = parseUsers(JSON.stringify([{ username: 'admin', role: 'admin', passwordHash }]));
  const origin = 'https://ziok.test';
  const server = createApp({ users, stateFile: path.join(directory, 'content.json'), origin, ...options });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const login = (forwarded, password = 'wrong password') => fetch(`${base}/api/admin/login`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...(forwarded ? { 'X-Forwarded-For': forwarded } : {}) }, body: JSON.stringify({ username: 'admin', password }) });
  try { await run({ base, login }); } finally { await new Promise(resolve => server.close(resolve)); fs.rmSync(directory, { recursive: true, force: true }); }
}

test('login limits are tracked per client behind a trusted proxy', async () => {
  await withServer({ trustedProxies: parseTrustedProxies('127.0.0.1') }, async ({ login }) => {
    for (let attempt = 0; attempt < 20; attempt++) assert.equal((await login('203.0.113.1')).status, 401);
    assert.equal((await login('203.0.113.1')).status, 429);
    assert.equal((await login('203.0.113.2')).status, 401, 'another client is unaffected');
    // Spoofing a leading entry does not change the identity the proxy recorded.
    assert.equal((await login('198.51.100.9, 203.0.113.1')).status, 429);
  });
});

test('without trusted proxies every request shares the connecting address', async () => {
  await withServer({}, async ({ login }) => {
    for (let attempt = 0; attempt < 20; attempt++) assert.equal((await login(`203.0.113.${attempt}`)).status, 401);
    assert.equal((await login('203.0.113.200')).status, 429);
  });
});

test('a successful sign-in clears the failure count', async () => {
  await withServer({}, async ({ login }) => {
    for (let attempt = 0; attempt < 15; attempt++) assert.equal((await login()).status, 401);
    assert.equal((await login(undefined, 'test-only-password-for-ci')).status, 200);
    for (let attempt = 0; attempt < 20; attempt++) assert.equal((await login()).status, 401);
    assert.equal((await login()).status, 429);
  });
});

test('HSTS is sent only when configured; unknown pages get a 404 page for browsers and JSON for APIs', async () => {
  await withServer({ hsts: 'max-age=604800' }, async ({ base }) => {
    const home = await fetch(`${base}/`);
    assert.equal(home.headers.get('strict-transport-security'), 'max-age=604800');
    const page = await fetch(`${base}/no/such/page`, { headers: { Accept: 'text/html,application/xhtml+xml' } });
    assert.equal(page.status, 404);
    assert.match(page.headers.get('content-type'), /text\/html/);
    assert.match(await page.text(), /Page not found/);
    assert.equal((await fetch(`${base}/no/such/page`)).headers.get('content-type').startsWith('application/json'), true);
    const api = await fetch(`${base}/api/missing`, { headers: { Accept: 'text/html' } });
    assert.equal(api.status, 404);
    assert.match(api.headers.get('content-type'), /application\/json/);
    assert.equal((await fetch(`${base}/404.html`)).status, 404, 'the error page is not a public route');
    assert.equal((await fetch(`${base}/server/backup.cjs`)).status, 404);
  });
  await withServer({}, async ({ base }) => assert.equal((await fetch(`${base}/`)).headers.get('strict-transport-security'), null));
});

test('backups are validated, skipped when unchanged, and pruned', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ziok-backup-'));
  const stateFile = path.join(directory, 'content.json');
  const write = revision => fs.writeFileSync(stateFile, JSON.stringify({ revision, draft: { news: [] }, published: null, audit: [] }));
  try {
    write(1);
    const first = backup({ stateFile, keep: 2, now: new Date('2026-11-22T12:00:00Z') });
    assert.match(first.created, /content-20261122T120000Z-r1\.json$/);
    assert.equal(fs.statSync(first.created).mode & 0o077, 0, 'backups are private');
    assert.equal(backup({ stateFile, keep: 2, now: new Date('2026-11-22T13:00:00Z') }).created, null);
    write(2); backup({ stateFile, keep: 2, now: new Date('2026-11-23T12:00:00Z') });
    write(3); backup({ stateFile, keep: 2, now: new Date('2026-11-24T12:00:00Z') });
    const kept = fs.readdirSync(path.join(directory, 'backups')).sort();
    assert.deepEqual(kept, ['content-20261123T120000Z-r2.json', 'content-20261124T120000Z-r3.json']);
    fs.writeFileSync(stateFile, '{"revision":"x"}');
    assert.throws(() => backup({ stateFile }), /not valid/);
    fs.writeFileSync(stateFile, 'not json');
    assert.throws(() => backup({ stateFile }));
    assert.throws(() => backup({ stateFile, keep: 0 }));
    assert.equal(fs.readdirSync(path.join(directory, 'backups')).length, 2, 'failed runs never delete good backups');
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
