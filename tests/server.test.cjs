const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../server/app.cjs');
const { hashPassword, parseUsers, verifyPassword } = require('../server/auth.cjs');
const { defaults, validateContent, migrateContent } = require('../server/content.cjs');

test('password configuration and content validation', async () => {
  const password = 'test-only-password-for-ci';
  const hash = await hashPassword(password);
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword('incorrect password', hash), false);
  assert.throws(() => parseUsers('[]'));
  assert.throws(() => parseUsers(JSON.stringify([{ username: 'editor', role: 'editor', passwordHash: hash }])));
  const good = structuredClone(defaults);
  good.media.youtubeChannel = 'https://www.youtube.com/@ziok';
  assert.equal(validateContent(good).media.youtubeChannel, good.media.youtubeChannel);
  assert.throws(() => validateContent({ ...good, media: { ...good.media, youtubeChannel: 'https://example.org' } }));
});

test('community defaults and migration preserve original records, reject invalid changes', () => {
  const content = validateContent(defaults);
  assert.deepEqual([content.businesses.length, content.churches.length, content.villages.length, content.leadership.length, content.terms.length, content.documents.length], [42, 18, 49, 14, 2, 2]);
  const legacy = { news: defaults.news, events: defaults.events, media: defaults.media };
  assert.deepEqual(migrateContent(legacy), content);
  assert.throws(() => validateContent({ ...content, businesses: [...content.businesses, content.businesses[0]] }));
  assert.throws(() => validateContent({ ...content, terms: [{ label: '2030–2032' }] }));
  assert.throws(() => validateContent({ ...content, documents: [] }));
});

test('authenticated draft, publishing, audit and durable data lifecycle', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ziok-test-'));
  const stateFile = path.join(directory, 'content.json');
  const password = 'test-only-password-for-ci';
  const passwordHash = await hashPassword(password);
  const users = parseUsers(JSON.stringify(['admin', 'editor'].map(role => ({ username: role, role, passwordHash }))));
  const origin = 'https://ziok.test';
  let server, base;
  async function start() {
    server = createApp({ users, stateFile, origin });
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    base = `http://127.0.0.1:${server.address().port}`;
  }
  async function close() { if (server) await new Promise(resolve => server.close(resolve)); server = null; }
  async function call(route, { payload, cookie, csrf, requestOrigin = origin } = {}) {
    const headers = { ...(cookie ? { Cookie: cookie } : {}), ...(csrf ? { 'X-CSRF-Token': csrf } : {}) };
    return fetch(base + route, payload === undefined ? { headers } : { method: 'POST', headers: { ...headers, Origin: requestOrigin, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  }
  async function login(username) {
    const response = await call('/api/admin/login', { payload: { username, password } });
    assert.equal(response.status, 200);
    const header = response.headers.get('set-cookie');
    assert.match(header, /HttpOnly/); assert.match(header, /SameSite=Strict/); assert.match(header, /Secure/);
    const cookie = header.split(';')[0];
    const session = await (await call('/api/admin/session', { cookie })).json();
    return { cookie, csrf: session.csrf };
  }
  try {
    await start();
    assert.equal((await call('/')).status, 200);
    assert.equal((await call('/admin')).status, 200);
    assert.equal((await call('/api/admin/state')).status, 401);
    assert.equal((await call('/server/auth.cjs')).status, 404);
    assert.equal((await call('/var/content.json')).status, 404);
    assert.equal((await call('/api/admin/login', { payload: { username: 'admin', password: 'wrong password' } })).status, 401);
    assert.equal((await call('/api/admin/login', { payload: { username: 'admin', password }, requestOrigin: 'https://other.test' })).status, 403);
    const editor = await login('editor');
    const data = await (await call('/api/admin/state', editor)).json();
    assert.equal(data.revision, 0);
    const content = structuredClone(data.draft);
    content.news[0].title = 'Approved community announcement';
    content.businesses[0].name = 'Edited test business';
    content.churches[0].name = 'Edited test church';
    content.villages[0].name = 'Edited test village association';
    content.terms.push({ label: '2028–2030' });
    content.leadership.push({ term: '2028–2030', name: 'Test officer', nickname: '', role: 'Secretary', kind: 'Officer' });
    content.documents[0].noteEn = 'Approved test document note';
    const save = await call('/api/admin/save', { ...editor, payload: { revision: 0, content } });
    assert.equal(save.status, 200);
    assert.match(await (await call('/public-content.js')).text(), /ZIOK_CONTENT = null/);
    assert.equal((await call('/api/admin/publish', { ...editor, payload: { revision: 1 } })).status, 403);
    const admin = await login('admin');
    assert.equal((await call('/api/admin/publish', { cookie: admin.cookie, payload: { revision: 1 } })).status, 403);
    assert.equal((await call('/api/admin/publish', { ...admin, payload: { revision: 0 } })).status, 409);
    assert.equal((await call('/api/admin/publish', { ...admin, payload: { revision: 1 } })).status, 200);
    assert.match(await (await call('/public-content.js')).text(), /Approved community announcement/);
    const published = await (await call('/public-content.js')).text();
    for (const value of ['Edited test business', 'Edited test church', 'Edited test village association', 'Test officer', 'Approved test document note']) assert.ok(published.includes(value));
    assert.equal((await call('/documents/ziok-constitution-september-2024.pdf')).status, 200);
    const current = await (await call('/api/admin/state', admin)).json();
    assert.equal(current.revision, 2);
    assert.deepEqual(current.audit.map(x => x.action), ['publish', 'save draft']);
    assert.equal((await call('/api/admin/logout', { ...admin, payload: {} })).status, 200);
    assert.equal((await call('/api/admin/state', admin)).status, 401);
    await close(); await start();
    assert.match(await (await call('/public-content.js')).text(), /Approved community announcement/);
    assert.equal((await call('/api/admin/state', editor)).status, 401);
  } finally { await close(); await fs.rm(directory, { recursive: true, force: true }); }
});
