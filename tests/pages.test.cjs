const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../server/app.cjs');
const { hashPassword, parseUsers } = require('../server/auth.cjs');
const { defaults, validateContent, migrateContent, slugify } = require('../server/content.cjs');
const { routeContentPage } = require('../server/pages.cjs');

const origin = 'https://ziok.test';
const base = () => structuredClone(validateContent(defaults));
function sample() {
  const content = base();
  content.news = [
    { title: 'Annual <b>Gathering</b> & Picnic', titleZo: 'Zomi kikhopna', body: 'First paragraph with <script>alert(1)</script>.\n\nSecond paragraph.\nSame paragraph, new line.', bodyZo: 'Zomi lai', tag: 'Community', slug: '', date: '2026-11-01' },
    { title: 'Undated note', titleZo: '', body: 'English only.', bodyZo: '', tag: '', slug: '', date: '' }
  ];
  content.events = [
    { title: 'Zomi National Day', titleZo: 'Zomi Nam Ni', body: 'Annual celebration', bodyZo: '', date: 'FEB 20', slug: '', startDate: '2027-02-20', location: 'Tulsa <Hall>, OK' },
    { title: 'Community gathering', titleZo: '', body: 'To be announced', bodyZo: '', date: 'TBD', slug: '', startDate: '', location: '' }
  ];
  return validateContent(content);
}
const jsonLd = html => JSON.parse(/<script type="application\/ld\+json">(.*?)<\/script>/s.exec(html)[1]);
const page = (pathname, content = sample()) => routeContentPage(pathname, content, { origin });

test('page names are derived once, kept unique and never change when a title is edited', () => {
  assert.equal(slugify('Zomi National Day!'), 'zomi-national-day');
  assert.equal(slugify('  Äpfel & Birnen  '), 'apfel-birnen');
  assert.equal(slugify('日本語'), 'item');
  const content = base();
  content.news = ['Same title', 'Same title', 'Same title'].map(title => ({ ...content.news[0], title, slug: '' }));
  const saved = validateContent(content);
  assert.deepEqual(saved.news.map(item => item.slug), ['same-title', 'same-title-2', 'same-title-3']);
  saved.news[0].title = 'Renamed completely';
  assert.deepEqual(validateContent(saved).news.map(item => item.slug), ['same-title', 'same-title-2', 'same-title-3']);
  const explicit = structuredClone(saved); explicit.news[1].slug = 'same-title';
  assert.throws(() => validateContent(explicit), /Duplicate page name/);
  for (const bad of ['Has Space', 'UPPER', '-lead', 'trail-', 'a--b', 'x'.repeat(81)]) { const item = structuredClone(saved); item.news[0].slug = bad; assert.throws(() => validateContent(item), bad); }
  // Items saved before pages existed gain page names on load.
  const legacy = { ...saved, news: saved.news.map(({ slug, date, ...rest }) => rest), events: saved.events.map(({ slug, startDate, location, ...rest }) => rest) };
  assert.ok(migrateContent(legacy).news.every(item => item.slug));
});

test('dates must be real calendar days', () => {
  for (const bad of ['2026-02-30', '2026-13-01', '26-1-1', 'tomorrow', '2026-1-01']) {
    const content = sample(); content.news[0].date = bad; assert.throws(() => validateContent(content), /YYYY-MM-DD/, bad);
    const event = sample(); event.events[0].startDate = bad; assert.throws(() => validateContent(event), /YYYY-MM-DD/, bad);
  }
});

test('item pages: canonical, alternates, structured data and escaping', () => {
  const content = sample();
  const slug = content.news[0].slug;
  const en = page(`/news/${slug}`, content).html;
  assert.match(en, /<html lang="en">/);
  assert.match(en, new RegExp(`<link rel="canonical" href="${origin}/news/${slug}">`));
  assert.match(en, new RegExp(`hreflang="en" href="${origin}/news/${slug}"`));
  assert.match(en, new RegExp(`hreflang="ctd" href="${origin}/zo/news/${slug}"`));
  assert.match(en, new RegExp(`hreflang="x-default" href="${origin}/news/${slug}"`));
  assert.match(en, /<time datetime="2026-11-01">November 1, 2026<\/time>/);
  assert.doesNotMatch(en, /<script>alert/, 'content is escaped');
  assert.doesNotMatch(en, /<b>Gathering/, 'markup in titles is escaped');
  assert.match(en, /First paragraph[^<]*&lt;script&gt;/);
  assert.match(en, /<p>Second paragraph\.<br>Same paragraph, new line\.<\/p>/);
  const data = jsonLd(en)['@graph'];
  assert.deepEqual(data.map(item => item['@type']), ['BreadcrumbList', 'NewsArticle']);
  assert.equal(data[1].datePublished, '2026-11-01');
  assert.equal(data[1].inLanguage, 'en');
  assert.equal(data[0].itemListElement.at(-1).item, `${origin}/news/${slug}`);

  const zo = page(`/zo/news/${slug}`, content).html;
  assert.match(zo, /<html lang="ctd">/);
  assert.match(zo, /<h1>Zomi kikhopna<\/h1>/);
  assert.match(zo, /Zomi lai/);
  assert.match(zo, new RegExp(`<link rel="canonical" href="${origin}/zo/news/${slug}">`));
  assert.match(zo, /<a class="lang-switch" href="\/news\/[^"]+" hreflang="en" lang="en">English<\/a>/);
  assert.equal(jsonLd(zo)['@graph'][1].inLanguage, 'ctd');
  assert.match(zo, /<a href="\/zo\/news\/">/, 'links stay inside the Zomi section');
  assert.match(zo, /<span lang="en">All news<\/span>/, 'untranslated interface words are marked as English');
  assert.match(zo, />Thuthak<\/a>/, 'glossary words are used where they exist');
});

test('Zomi pages exist only for items with Zomi text; news without a date has no article markup', () => {
  const content = sample();
  const undated = content.news[1].slug;
  assert.equal(page(`/zo/news/${undated}`, content), null);
  const en = page(`/news/${undated}`, content).html;
  assert.doesNotMatch(en, /hreflang="ctd"/);
  assert.deepEqual(jsonLd(en)['@graph'].map(item => item['@type']), ['BreadcrumbList']);
  assert.equal(page('/news/does-not-exist', content), null);
  assert.equal(page('/events/does-not-exist', content), null);
  assert.equal(page('/news/UPPER', content), null);
  assert.equal(page('/newsletter', content), null);
});

test('event markup needs both a start date and a location', () => {
  const content = sample();
  const [dated, undated] = content.events;
  const html = page(`/events/${dated.slug}`, content).html;
  const event = jsonLd(html)['@graph'].find(item => item['@type'] === 'Event');
  assert.equal(event.startDate, '2027-02-20');
  assert.equal(event.location.name, 'Tulsa <Hall>, OK');
  assert.match(html, /Tulsa &lt;Hall&gt;, OK/);
  assert.doesNotMatch(html, /<Hall>/);
  assert.doesNotMatch(html.replace(/<script type="application\/ld\+json">.*?<\/script>/s, ''), /Tulsa <Hall>/);
  assert.ok(!/<\/script>[^]*<Hall>/.test(html), 'JSON-LD cannot break out of its script element');
  const plain = page(`/events/${undated.slug}`, content).html;
  assert.ok(!jsonLd(plain)['@graph'].some(item => item['@type'] === 'Event'));
  assert.match(plain, /To be announced|TBD/);
});

test('index pages list items, link to them, and hide items without Zomi text in Zomi', () => {
  const content = sample();
  const en = page('/news/', content).html;
  for (const item of content.news) assert.match(en, new RegExp(`href="/news/${item.slug}"`));
  assert.match(en, /<title>News &amp; announcements \| Zomi Innkuan Oklahoma \(ZIOK\)<\/title>/);
  const zo = page('/zo/news/', content).html;
  assert.match(zo, new RegExp(`href="/zo/news/${content.news[0].slug}"`));
  assert.doesNotMatch(zo, new RegExp(content.news[1].slug));
  const empty = structuredClone(content); empty.events = [];
  assert.match(page('/events/', empty).html, /No events have been published yet/);
  assert.match(page('/events', content).html, /rel="canonical" href="https:\/\/ziok\.test\/events\/"/, 'both spellings serve the canonical page');
});

test('generated pages carry no inline styles or scripts, so the strict policy holds', () => {
  const content = sample();
  for (const route of ['/news/', '/events/', '/zo/news/', `/news/${content.news[0].slug}`, `/zo/events/${content.events[0].slug}`]) {
    const html = page(route, content).html.replace(/<script type="application\/ld\+json">.*?<\/script>/s, '');
    assert.doesNotMatch(html, /<style|\sstyle=|<script(?![^>]*\bsrc=)|\son[a-z]+=/i, route);
  }
});

test('titles fit search results and descriptions are trimmed at a word', () => {
  const content = sample();
  content.news[0].title = 'A very long announcement title that goes on well past what a search result can display';
  content.news[0].body = 'word '.repeat(100);
  const html = page(`/news/${validateContent(content).news[0].slug}`, validateContent(content)).html;
  const title = /<title>([^<]*)<\/title>/.exec(html)[1];
  const description = /<meta name="description" content="([^"]*)"/.exec(html)[1];
  assert.ok(title.length <= 65, title);
  assert.ok(description.length <= 156, description.length);
  assert.match(description, /…$/);
});

async function withPublishedServer(run) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ziok-pages-'));
  const stateFile = path.join(directory, 'content.json');
  const content = sample();
  fs.writeFileSync(stateFile, JSON.stringify({ revision: 2, draft: content, published: content, audit: [{ at: '2026-12-03T10:00:00.000Z', actor: 'admin', action: 'publish', revision: 2 }] }));
  const users = parseUsers(JSON.stringify([{ username: 'admin', role: 'admin', passwordHash: await hashPassword('test-only-password-for-ci') }]));
  const server = createApp({ users, stateFile, origin });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await run({ url: `http://127.0.0.1:${server.address().port}`, content }); }
  finally { await new Promise(resolve => server.close(resolve)); fs.rmSync(directory, { recursive: true, force: true }); }
}

test('the server serves news and event pages with security headers, and answers 404 for the rest', async () => {
  await withPublishedServer(async ({ url, content }) => {
    const slug = content.news[0].slug;
    const response = await fetch(`${url}/news/${slug}`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/html/);
    assert.match(response.headers.get('content-security-policy'), /script-src 'self'/);
    assert.equal(response.headers.get('x-robots-tag'), null);
    assert.match(await response.text(), /Annual &lt;b&gt;Gathering&lt;\/b&gt;/);
    assert.equal((await fetch(`${url}/zo/news/${slug}`)).status, 200);
    assert.equal((await fetch(`${url}/events/${content.events[0].slug}`)).status, 200);
    const head = await fetch(`${url}/news/${slug}`, { method: 'HEAD' });
    assert.equal(head.status, 200); assert.equal(await head.text(), '');
    const missing = await fetch(`${url}/news/nope`, { headers: { Accept: 'text/html' } });
    assert.equal(missing.status, 404);
    assert.match(await missing.text(), /Page not found/);
    assert.equal((await fetch(`${url}/zo/news/${content.news[1].slug}`)).status, 404);
    assert.equal((await fetch(`${url}/news/${slug}`, { method: 'POST', headers: { Origin: origin } })).status, 405, 'pages are read-only');
    assert.equal((await fetch(`${url}/content-pages.css`)).status, 200);
  });
});

test('the sitemap lists every generated page with a meaningful date', async () => {
  await withPublishedServer(async ({ url, content }) => {
    const xml = await (await fetch(`${url}/sitemap.xml`)).text();
    const entry = path => new RegExp(`<loc>${origin}${path}</loc><lastmod>([\\d-]+)</lastmod>`).exec(xml)?.[1];
    assert.equal(entry(`/news/${content.news[0].slug}`), '2026-11-01', 'a news item uses its own date');
    assert.equal(entry(`/zo/news/${content.news[0].slug}`), '2026-11-01');
    assert.equal(entry(`/news/${content.news[1].slug}`), '2026-12-03', 'otherwise the latest publish');
    assert.equal(entry(`/events/${content.events[0].slug}`), '2026-12-03');
    assert.equal(entry('/news/'), '2026-12-03');
    assert.equal(entry('/zo/events/'), '2026-12-03');
    assert.equal(entry(`/zo/news/${content.news[1].slug}`), undefined, 'no Zomi page, no entry');
    assert.equal(new Set([...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map(match => match[1])).size, [...xml.matchAll(/<loc>/g)].length, 'no duplicates');
    assert.match(xml, /<url><loc>https:\/\/ziok\.org\/<\/loc><lastmod>2026-12-03<\/lastmod>/, 'static pages move to the publish date');
  });
});

test('public content exposes page names so the homepage can link to them', async () => {
  await withPublishedServer(async ({ url, content }) => {
    const script = await (await fetch(`${url}/public-content.js`)).text();
    assert.ok(script.includes(`"slug":"${content.news[0].slug}"`));
  });
});
