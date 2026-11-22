const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createApp, resolveBindHost } = require('../server/app.cjs');
const { hashPassword, parseUsers, verifyPassword } = require('../server/auth.cjs');
const { defaults, validateContent, migrateContent } = require('../server/content.cjs');

test('bind host defaults to loopback and permits explicit production container networking only', () => {
  assert.equal(resolveBindHost(undefined, false), '127.0.0.1');
  assert.equal(resolveBindHost(undefined, true), '127.0.0.1');
  assert.equal(resolveBindHost('0.0.0.0', false), '0.0.0.0');
  assert.throws(() => resolveBindHost('0.0.0.0', true));
  assert.throws(() => resolveBindHost('invalid-host', false));
});

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
  assert.deepEqual([content.businesses.length, content.churches.length, content.villages.length, content.leadership.length, content.terms.length, content.documents.length], [42, 21, 49, 14, 2, 2]);
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
    assert.match(await (await call('/public-content.js')).text(), /ZIOK_UPDATED = null/, 'no date before the first publish');
    assert.equal((await call('/api/admin/publish', { ...editor, payload: { revision: 1 } })).status, 403);
    const admin = await login('admin');
    assert.equal((await call('/api/admin/publish', { cookie: admin.cookie, payload: { revision: 1 } })).status, 403);
    assert.equal((await call('/api/admin/publish', { ...admin, payload: { revision: 0 } })).status, 409);
    assert.equal((await call('/api/admin/publish', { ...admin, payload: { revision: 1 } })).status, 200);
    assert.match(await (await call('/public-content.js')).text(), /Approved community announcement/);
    const published = await (await call('/public-content.js')).text();
    assert.match(published, new RegExp(`ZIOK_UPDATED = "${new Date().toISOString().slice(0, 10)}"`), 'publish date is exposed');
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


test('legacy church seed refresh preserves customized directories', () => {
  const legacy = [{"name":"Bethel EBC","pastor":"Rev. Zam Cin Kap"},{"name":"Bethel UPC","pastor":"Pastor Suan Go Cin"},{"name":"Bethel Worship Center","pastor":"Rev. Kap Lian Tuang"},{"name":"EBC Tulsa","pastor":"Rev. Lian Za Tuang"},{"name":"Far East Mission Church","pastor":"Rev. Dr. Cin Khaw Kham"},{"name":"Full Gospel Assembly International","pastor":"Rev. Dr. Dam Suan Mung"},{"name":"Full Life Church","pastor":"Rev. Dr. Nang Khen Khup"},{"name":"Gateway International Church","pastor":"Rev. Dr. Suan Za Lian"},{"name":"Hosanna Mission Church","pastor":"Pastor Thawng Kim"},{"name":"Laipian Pasian Paaina Pawlpi","pastor":"Pa Haupi"},{"name":"Myanmar Adventist Fellowship","pastor":"Sia Lianno"},{"name":"Myanmar Christian Church","pastor":"Rev. Dr. Kham Khan Khai"},{"name":"Myanmar Zomi Baptist Church","pastor":"Pastor Hau Suan Khai"},{"name":"Shalom Baptist Church","pastor":"Pastor Sangpi"},{"name":"St. Catherine of Alexandria","pastor":"Father. Robert Kim Pu"},{"name":"Tulsa Baptist Church","pastor":"Sia Paubawi"},{"name":"ZBCM of Tulsa","pastor":"Rev. Dr. Ngo Suanthang Guite"},{"name":"Zomi SDA Tulsa","pastor":"Pastor Thlenga"}];
  assert.deepEqual(migrateContent({ ...defaults, churches: legacy }).churches, defaults.churches);
  const customized = legacy.map((item,index) => index === 0 ? {...item, pastor: 'Custom pastor'} : item);
  assert.deepEqual(migrateContent({ ...defaults, churches: customized }).churches, customized);
});

test('sitemap dates move only when content is published; admin and API responses are not indexable; assets are served', async () => {
  const { sitemapWithPublishDate } = require('../server/app.cjs');
  const xml = '<url><loc>a</loc><lastmod>2026-11-22</lastmod></url><url><loc>b</loc><lastmod>2027-01-05</lastmod></url>';
  assert.equal(sitemapWithPublishDate(xml, { published: null, audit: [{ action: 'save draft', at: '2027-03-01T10:00:00Z' }] }), xml, 'drafts do not change dates');
  assert.equal(sitemapWithPublishDate(xml, { published: {}, audit: [{ action: 'save draft', at: '2027-03-01T10:00:00Z' }] }), xml, 'saving is not publishing');
  const published = sitemapWithPublishDate(xml, { published: {}, audit: [{ action: 'publish', at: '2026-12-01T10:00:00Z' }, { action: 'publish', at: '2026-12-15T09:00:00Z' }] });
  assert.match(published, /<loc>a<\/loc><lastmod>2026-12-15<\/lastmod>/);
  assert.match(published, /<loc>b<\/loc><lastmod>2027-01-05<\/lastmod>/, 'later dates are never lowered');

  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ziok-seo-'));
  const passwordHash = await hashPassword('test-only-password-for-ci');
  const users = parseUsers(JSON.stringify([{ username: 'admin', role: 'admin', passwordHash }]));
  const server = createApp({ users, stateFile: path.join(directory, 'content.json'), origin: 'https://ziok.test' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const map = await fetch(`${base}/sitemap.xml`);
    assert.equal(map.status, 200);
    assert.match(map.headers.get('content-type'), /application\/xml/);
    const served = await map.text();
    const committed = await fs.readFile(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
    assert.ok(served.startsWith(committed.slice(0, committed.indexOf('</urlset>')).trimEnd()), 'unpublished state keeps the committed pages and dates');
    assert.match(served, /<loc>https:\/\/ziok\.test\/news\/a-home-for-the-zomi-community<\/loc>/, 'generated pages are listed');
    assert.match((await fetch(`${base}/ziok-social.jpg`)).headers.get('content-type'), /image\/jpeg/);
    assert.match((await fetch(`${base}/favicon.ico`)).headers.get('content-type'), /image\/x-icon/);
    for (const name of ['favicon-48.png', 'favicon-192.png', 'apple-touch-icon.png']) assert.equal((await fetch(`${base}/${name}`)).status, 200, name);
    assert.match((await fetch(`${base}/admin`)).headers.get('x-robots-tag'), /noindex/);
    assert.match((await fetch(`${base}/api/admin/state`)).headers.get('x-robots-tag'), /noindex/);
    assert.equal((await fetch(`${base}/`)).headers.get('x-robots-tag'), null, 'public pages stay indexable');
  } finally { await new Promise(resolve => server.close(resolve)); await fs.rm(directory, { recursive: true, force: true }); }
});
