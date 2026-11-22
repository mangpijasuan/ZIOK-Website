// Server-rendered public pages for community news and events, in English and Zomi.
// Each item has its own address (/news/<slug>, /events/<slug>, and /zo/... for Zomi) so search
// engines can index and link to individual stories and events.

const siteName = 'Zomi Innkuan Oklahoma';

// Interface wording. Zomi entries come from the site's existing glossary (locale.js). Anything
// missing from `zo` falls back to English and is marked lang="en" so screen readers pronounce it
// correctly. Add translations to `zo` as they are reviewed.
const en = {
  home: 'Home', news: 'News', events: 'Events', leadership: 'Leadership', documents: 'Documents', contact: 'Contact',
  newsHeading: 'News & announcements', eventsHeading: 'Community events',
  newsIntro: 'Stay connected with our community.', eventsIntro: 'Dates and details for community gatherings.',
  published: 'Published', when: 'Date', where: 'Location', allNews: 'All news', allEvents: 'All events',
  readMore: 'Read more', noNews: 'No news has been published yet.', noEvents: 'No events have been published yet.',
  language: 'Language', skip: 'Skip to content', rights: 'All rights reserved.', toBeConfirmed: 'Date to be confirmed'
};
const zo = {
  home: 'Abulpi', news: 'Thuthak', events: 'Pawite', leadership: 'Makaihna', documents: 'Laite', contact: 'Kizopna',
  newsHeading: 'Thuthak pen leh theihsaknate', eventsHeading: 'Kipawlna pawite',
  newsIntro: 'I kipawlna tawh kizom paisuak in.', language: 'Kampau'
};
const strings = { en, zo };
const languages = { en: { tag: 'en', locale: 'en_US', name: 'English', prefix: '' }, zo: { tag: 'ctd', locale: 'ctd', name: 'Zomi', prefix: '/zo' } };

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const json = data => JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

function ui(lang) {
  const missing = key => lang === 'zo' && !zo[key];
  const text = key => (lang === 'zo' && zo[key]) || en[key];
  return { text, markup: key => (missing(key) ? `<span lang="en">${escapeHtml(en[key])}</span>` : escapeHtml(text(key))) };
}

const clip = (value, limit) => {
  const clean = String(value || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), limit - 25))}…`;
};
function pageTitle(title) {
  for (const suffix of [` | ${siteName} (ZIOK)`, ' | ZIOK']) if (title.length + suffix.length <= 65) return title + suffix;
  return `${clip(title, 58)} | ZIOK`;
}
function formatDay(value, lang) {
  const date = new Date(`${value}T00:00:00Z`);
  return lang === 'en' ? new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(date) : value;
}
const paragraphs = value => String(value || '').split(/\n{2,}/).map(part => part.trim()).filter(Boolean).map(part => `<p>${escapeHtml(part).replace(/\n/g, '<br>')}</p>`).join('');

// Which fields to show for a language. Zomi pages use Zomi text and fall back to English per field.
const view = (item, lang) => ({ ...item, title: (lang === 'zo' && item.titleZo) || item.title, body: (lang === 'zo' && item.bodyZo) || item.body });
const hasZomi = item => Boolean(item.titleZo || item.bodyZo);

function layout({ lang, origin, path, title, description, hero, body, alternates, jsonld, kind, email = 'admin@ziok.org' }) {
  const t = ui(lang);
  const language = languages[lang];
  const url = origin + path;
  const links = [['/index.html', 'home'], ['/news/', 'news'], ['/events/', 'events'], ['/leadership.html', 'leadership'], ['/governance.html', 'documents'], ['/index.html#contact', 'contact']]
    .map(([href, key]) => {
      const localised = href === '/news/' || href === '/events/' ? language.prefix + href : href;
      const current = (key === 'news' && kind.startsWith('news')) || (key === 'events' && kind.startsWith('events'));
      return `<a href="${localised}"${current ? ' aria-current="page"' : ''}>${t.markup(key)}</a>`;
    }).join('');
  const switcher = alternates.filter(item => item.lang !== lang && item.lang !== 'x-default')
    .map(item => `<a class="lang-switch" href="${item.path}" hreflang="${languages[item.lang].tag}" lang="${languages[item.lang].tag}">${escapeHtml(languages[item.lang].name)}</a>`).join('');
  const hreflang = alternates.map(item => `<link rel="alternate" hreflang="${item.lang === 'x-default' ? 'x-default' : languages[item.lang].tag}" href="${escapeHtml(origin + item.path)}">`).join('');
  return `<!doctype html>
<html lang="${language.tag}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeHtml(url)}">${hreflang}
<meta property="og:url" content="${escapeHtml(url)}"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:type" content="${kind.endsWith('item') && kind.startsWith('news') ? 'article' : 'website'}"><meta property="og:site_name" content="${siteName}"><meta property="og:locale" content="${language.locale}">
<meta property="og:image" content="${origin}/ziok-social.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}"><meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="${origin}/ziok-social.jpg">
<link rel="icon" href="/favicon.ico" sizes="48x48"><link rel="icon" type="image/png" href="/favicon-192.png" sizes="192x192"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<script type="application/ld+json">${json(jsonld)}</script>
<link rel="stylesheet" href="/shared.css"><link rel="stylesheet" href="/content-pages.css"></head>
<body><a class="skip-link" href="#main-content">${t.markup('skip')}</a>
<header class="site-header"><div class="nav"><a class="brand" href="/index.html"><img width="48" height="48" src="/ziok-logo-160.webp" alt=""><span>${siteName}, Inc.</span></a>
<nav class="site-nav" aria-label="Main navigation">${links}</nav>${switcher}</div></header>
<section class="hero"><div class="wrap">${hero}</div></section>
<main id="main-content" tabindex="-1" class="wrap content-main">${body}</main>
<footer class="site-footer"><div class="wrap">© <span data-copyright-year>${new Date().getFullYear()}</span> ${siteName}, Inc. · <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></div></footer>
<script src="/navigation.js"></script></body></html>`;
}

function breadcrumb(origin, crumbs) {
  return { '@type': 'BreadcrumbList', itemListElement: crumbs.map(([name, path], index) => ({ '@type': 'ListItem', position: index + 1, name, item: origin + path })) };
}

function renderPage(kind, lang, slug, content, origin) {
  const collection = kind.startsWith('news') ? 'news' : 'events';
  const items = content[collection];
  const language = languages[lang];
  const t = ui(lang);
  const base = `${language.prefix}/${collection}/`;
  const hubAlternates = [{ lang: 'en', path: `/${collection}/` }, ...(items.some(hasZomi) ? [{ lang: 'zo', path: `/zo/${collection}/` }] : []), { lang: 'x-default', path: `/${collection}/` }];
  const publisher = { '@type': 'NGO', '@id': `${origin}/#organization`, name: `${siteName}, Inc.` };
  const listName = t.text(collection === 'news' ? 'news' : 'events');
  const home = [t.text('home'), '/'];

  if (!kind.endsWith('item')) {
    const visible = lang === 'zo' ? items.filter(hasZomi) : items;
    const headingKey = collection === 'news' ? 'newsHeading' : 'eventsHeading';
    const heading = t.markup(headingKey);
    const intro = t.markup(collection === 'news' ? 'newsIntro' : 'eventsIntro');
    const description = lang === 'zo' && collection === 'news' ? `${zo.newsHeading} · ${siteName}` : collection === 'news'
      ? 'News and announcements from Zomi Innkuan Oklahoma (ZIOK) for the Zomi community in Tulsa and across Oklahoma.'
      : 'Upcoming and past Zomi community events in Oklahoma, with dates and details from Zomi Innkuan Oklahoma (ZIOK).';
    const cards = visible.map(raw => {
      const item = view(raw, lang);
      const meta = collection === 'news'
        ? [raw.tag && `<span class="tag">${escapeHtml(raw.tag)}</span>`, raw.date && `<time datetime="${raw.date}">${escapeHtml(formatDay(raw.date, lang))}</time>`]
        : [raw.startDate ? `<time datetime="${raw.startDate}">${escapeHtml(formatDay(raw.startDate, lang))}</time>` : `<span>${escapeHtml(raw.date || en.toBeConfirmed)}</span>`, raw.location && `<span>${escapeHtml(raw.location)}</span>`];
      return `<article class="item-card"><div class="meta">${meta.filter(Boolean).join('')}</div><h2><a href="${base}${raw.slug}">${escapeHtml(item.title)}</a></h2>${item.body ? `<p>${escapeHtml(clip(item.body, 180))}</p>` : ''}<a class="more" href="${base}${raw.slug}">${t.markup('readMore')}<span class="sr-only">: ${escapeHtml(item.title)}</span></a></article>`;
    }).join('');
    const hero = `<div class="kicker">${escapeHtml(siteName)}</div><h1>${heading}</h1><p class="lead">${intro}</p>`;
    const body = cards ? `<div class="item-grid">${cards}</div>` : `<p>${t.markup(collection === 'news' ? 'noNews' : 'noEvents')}</p>`;
    return { html: layout({ lang, origin, path: base, title: pageTitle(t.text(headingKey)), description, hero, body, alternates: hubAlternates, kind, email: content.contact?.email, jsonld: breadcrumb(origin, [home, [listName, base]]) }) };
  }

  const raw = items.find(entry => entry.slug === slug);
  if (!raw || (lang === 'zo' && !hasZomi(raw))) return null;
  const item = view(raw, lang);
  const path = `${base}${raw.slug}`;
  const alternates = [{ lang: 'en', path: `/${collection}/${raw.slug}` }, ...(hasZomi(raw) ? [{ lang: 'zo', path: `/zo/${collection}/${raw.slug}` }] : []), { lang: 'x-default', path: `/${collection}/${raw.slug}` }];
  const description = clip(item.body, 155) || `${item.title} · ${siteName} (ZIOK)`;
  let structured;
  if (collection === 'news') {
    structured = raw.date ? { '@type': 'NewsArticle', headline: clip(item.title, 110), description, datePublished: raw.date, inLanguage: language.tag, image: `${origin}/ziok-social.jpg`, mainEntityOfPage: origin + path, publisher, author: publisher } : null;
  } else if (raw.startDate && raw.location) {
    structured = { '@type': 'Event', name: item.title, description, startDate: raw.startDate, inLanguage: language.tag, eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode', location: { '@type': 'Place', name: raw.location, address: raw.location }, image: `${origin}/ziok-social.jpg`, organizer: publisher, url: origin + path };
  }
  const jsonld = { '@context': 'https://schema.org', '@graph': [breadcrumb(origin, [home, [listName, base], [item.title, path]]), ...(structured ? [structured] : [])] };
  const facts = collection === 'news'
    ? [raw.date && [t.markup('published'), `<time datetime="${raw.date}">${escapeHtml(formatDay(raw.date, lang))}</time>`], raw.tag && [t.markup('news'), escapeHtml(raw.tag)]]
    : [[t.markup('when'), raw.startDate ? `<time datetime="${raw.startDate}">${escapeHtml(formatDay(raw.startDate, lang))}</time>` : escapeHtml(raw.date || en.toBeConfirmed)], raw.location && [t.markup('where'), escapeHtml(raw.location)]];
  const factList = facts.filter(Boolean).map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('');
  const hero = `<div class="kicker">${escapeHtml(siteName)}</div><h1>${escapeHtml(item.title)}</h1>`;
  const body = `<nav class="crumbs" aria-label="Breadcrumb"><a href="${base}">${t.markup(collection === 'news' ? 'allNews' : 'allEvents')}</a></nav><article>${factList ? `<dl class="facts">${factList}</dl>` : ''}<div class="prose">${paragraphs(item.body)}</div></article>`;
  return { html: layout({ lang, origin, path, title: pageTitle(item.title), description, hero, body, alternates, kind, jsonld, email: content.contact?.email }) };
}

// Returns { status, html } for a news or events address, or null when there is no such page (the caller then answers 404).
function routeContentPage(pathname, content, { origin }) {
  const match = /^(\/zo)?\/(news|events)(?:\/([a-z0-9-]*))?$/.exec(pathname);
  if (!match) return null;
  const lang = match[1] ? 'zo' : 'en';
  const collection = match[2];
  const slug = match[3];
  const kind = slug ? `${collection}-item` : `${collection}-index`;
  const page = renderPage(kind, lang, slug, content, origin);
  return page ? { status: 200, html: page.html } : null;
}

// Sitemap entries for the generated pages. `lastmod` for items is the item's own date when it has
// one; otherwise the supplied fallback (the latest publish date).
function contentSitemapEntries(content, origin, fallbackDate) {
  const entries = [];
  const add = (path, lastmod) => entries.push(`<url><loc>${escapeHtml(origin + path)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`);
  for (const [collection, items] of [['news', content.news], ['events', content.events]]) {
    add(`/${collection}/`, fallbackDate);
    if (items.some(hasZomi)) add(`/zo/${collection}/`, fallbackDate);
    for (const item of items) {
      const lastmod = (collection === 'news' && item.date) || fallbackDate;
      add(`/${collection}/${item.slug}`, lastmod);
      if (hasZomi(item)) add(`/zo/${collection}/${item.slug}`, lastmod);
    }
  }
  return entries.join('\n  ');
}

module.exports = { routeContentPage, contentSitemapEntries, escapeHtml, strings };
