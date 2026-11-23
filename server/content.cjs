const communityDefaults = require('../community-data.js');
const businessCategories = new Set(communityDefaults.businesses.map(item => item.category));
const defaults = {
  ...communityDefaults,
  news: [
    { title: 'A home for the Zomi community', titleZo: 'Zomi kipawlna ading inn khat', body: 'Discover community news, resources and stories from Oklahoma.', bodyZo: 'Oklahoma a kipawlna thuthak, zat theih nate leh tangthute en in.', tag: 'Welcome' },
    { title: 'Preserving our language and traditions', titleZo: 'I kampau leh ngeinate kepcinna', body: 'Celebrate and share Zomi heritage with the next generation.', bodyZo: 'Zomi ngeina pahtawi in, khangthakte tawh hawmsawn in.', tag: 'Heritage' },
    { title: 'Find your place in the community', titleZo: 'Kipawlna sungah na kihel theihna zong in', body: 'Connect with families, volunteer and participate in community life.', bodyZo: 'Innkuante tawh kizom in, utthu tawh nasem inla, kipawlna sungah kihel in.', tag: 'Get involved' }
  ],
  events: [
    { title: 'Zomi National Day', titleZo: 'Zomi Nam Ni', body: 'Annual cultural celebration', bodyZo: 'Kumcin ngeina pawi', date: 'FEB 20' },
    { title: 'Community gathering', titleZo: 'Kipawlna kikhopna', body: 'Connect with local families', bodyZo: 'Khuasung innkuante tawh kizom in', date: 'TBD' },
    { title: 'Youth & family programs', titleZo: 'Khangno leh innkuan nasep geelna', body: 'Future community activities', bodyZo: 'Mailam kipawlna nasepte', date: 'TBD' }
  ],
  media: { youtubeChannel: '', facebookPage: '', instagramPage: '', tiktokPage: '', xPage: '', youtubeVideoId: '' },
  contact: { email: 'admin@ziok.org' }
};

function slugify(title) {
  return String(title).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '') || 'item';
}

function validateContent(input) {
  function text(value, limit, required = false) {
    if (typeof value !== 'string' || value.length > limit || (required && !value.trim())) throw new Error('Invalid content field');
    return value.trim();
  }
  // Page names (slugs) become part of public addresses such as /news/<slug>. They are saved on first
  // use and never re-derived from the title, so editing a title does not break links or search results.
  function slugs(items) {
    const taken = new Set();
    for (const item of items) {
      if (!item.slug) continue;
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(item.slug) || item.slug.length > 80) throw new Error('Page names use lowercase letters, numbers and hyphens');
      if (taken.has(item.slug)) throw new Error('Duplicate page name');
      taken.add(item.slug);
    }
    for (const item of items) {
      if (item.slug) continue;
      const base = slugify(item.title); let candidate = base, number = 2;
      while (taken.has(candidate)) candidate = `${base}-${number++}`;
      taken.add(candidate); item.slug = candidate;
    }
    return items;
  }
  function day(value) {
    const cleaned = text(value ?? '', 10);
    if (!cleaned) return '';
    const parsed = new Date(`${cleaned}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleaned) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== cleaned) throw new Error('Dates use the form YYYY-MM-DD');
    return cleaned;
  }
  function listing(value) {
    if (!Array.isArray(value) || value.length > 50) throw new Error('Each list must contain 0–50 entries');
    return value;
  }
  const common = item => ({ title: text(item?.title, 150, true), titleZo: text(item?.titleZo, 150), body: text(item?.body, 1000), bodyZo: text(item?.bodyZo, 1000) });
  const news = value => slugs(listing(value).map(item => ({ ...common(item), tag: text(item?.tag, 80), slug: text(item?.slug ?? '', 80), date: day(item?.date) })));
  const events = value => slugs(listing(value).map(item => ({ ...common(item), date: text(item?.date, 80), slug: text(item?.slug ?? '', 80), startDate: day(item?.startDate), location: text(item?.location ?? '', 200) })));
  function url(value, hosts) {
    const cleaned = text(value, 500);
    if (!cleaned) return '';
    const parsed = new URL(cleaned);
    if (parsed.protocol !== 'https:' || !hosts.includes(parsed.hostname) || parsed.username || parsed.password) throw new Error('Invalid media URL');
    return parsed.href;
  }
  function records(value, max, transform, key) {
    if (!Array.isArray(value) || value.length > max) throw new Error('Invalid community records');
    const result = value.map(transform);
    if (new Set(result.map(key)).size !== result.length) throw new Error('Duplicate community record');
    return result;
  }
  const businesses = records(input?.businesses, 200, item => {
    const name = text(item?.name, 150, true), phone = text(item?.phone, 40), address = text(item?.address, 300), category = text(item?.category, 80, true);
    if (!businessCategories.has(category) || (phone && (!/^[0-9() .-]+$/.test(phone) || phone.replace(/\D/g, '').length !== 10))) throw new Error('Invalid business contact or category');
    return { name, phone, address, category };
  }, item => item.name.toLowerCase());
  const churches = records(input?.churches, 200, item => ({ name: text(item?.name, 150, true), pastor: text(item?.pastor, 150) }), item => item.name.toLowerCase());
  const villages = records(input?.villages, 200, item => ({ name: text(item?.name, 150, true) }), item => item.name.toLowerCase());
  const terms = records(input?.terms, 20, item => {
    const label = text(item?.label, 9, true).replace('-', '–');
    if (!/^\d{4}–\d{4}$/.test(label) || Number(label.slice(0, 4)) >= Number(label.slice(5))) throw new Error('Invalid leadership term');
    return { label };
  }, item => item.label);
  if (!terms.length) throw new Error('Keep at least one leadership term');
  const leadership = records(input?.leadership, 200, item => {
    const term = text(item?.term, 9, true).replace('-', '–'), name = text(item?.name, 150, true), nickname = text(item?.nickname, 150), role = text(item?.role, 150, true), kind = text(item?.kind, 20, true);
    if (!terms.some(entry => entry.label === term) || !['Officer', 'Director'].includes(kind)) throw new Error('Invalid member term or kind');
    return { term, name, nickname, role, kind };
  }, item => `${item.term}:${item.name.toLowerCase()}`);
  const documents = records(input?.documents, 2, item => {
    const type = text(item?.type, 20, true);
    if (!['constitution', 'bylaws'].includes(type)) throw new Error('Invalid document');
    return { type, noteEn: text(item?.noteEn, 1000), noteZo: text(item?.noteZo, 1000) };
  }, item => item.type);
  if (documents.length !== 2) throw new Error('Keep both governance records');
  const video = text(input?.media?.youtubeVideoId, 11);
  if (video && !/^[A-Za-z0-9_-]{11}$/.test(video)) throw new Error('Invalid YouTube video ID');
  const email = text(input?.contact?.email ?? defaults.contact.email, 120, true).toLowerCase();
  if (!/^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(email)) throw new Error('Invalid contact email');
  return { contact: { email }, businesses, churches, villages, terms, leadership, documents, news: news(input?.news), events: events(input?.events), media: {
    youtubeChannel: url(input?.media?.youtubeChannel, ['youtube.com', 'www.youtube.com', 'm.youtube.com']),
    facebookPage: url(input?.media?.facebookPage, ['facebook.com', 'www.facebook.com', 'm.facebook.com']),
    instagramPage: url(input?.media?.instagramPage ?? '', ['instagram.com', 'www.instagram.com']),
    tiktokPage: url(input?.media?.tiktokPage ?? '', ['tiktok.com', 'www.tiktok.com', 'm.tiktok.com']),
    xPage: url(input?.media?.xPage ?? '', ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com']), youtubeVideoId: video
  } };
}
// Existing Phase 4 state has no community fields; preserve its published homepage data.
// Refresh only the untouched legacy church seed; preserve administrator-customized lists.
const legacyChurches = [{"name":"Bethel EBC","pastor":"Rev. Zam Cin Kap"},{"name":"Bethel UPC","pastor":"Pastor Suan Go Cin"},{"name":"Bethel Worship Center","pastor":"Rev. Kap Lian Tuang"},{"name":"EBC Tulsa","pastor":"Rev. Lian Za Tuang"},{"name":"Far East Mission Church","pastor":"Rev. Dr. Cin Khaw Kham"},{"name":"Full Gospel Assembly International","pastor":"Rev. Dr. Dam Suan Mung"},{"name":"Full Life Church","pastor":"Rev. Dr. Nang Khen Khup"},{"name":"Gateway International Church","pastor":"Rev. Dr. Suan Za Lian"},{"name":"Hosanna Mission Church","pastor":"Pastor Thawng Kim"},{"name":"Laipian Pasian Paaina Pawlpi","pastor":"Pa Haupi"},{"name":"Myanmar Adventist Fellowship","pastor":"Sia Lianno"},{"name":"Myanmar Christian Church","pastor":"Rev. Dr. Kham Khan Khai"},{"name":"Myanmar Zomi Baptist Church","pastor":"Pastor Hau Suan Khai"},{"name":"Shalom Baptist Church","pastor":"Pastor Sangpi"},{"name":"St. Catherine of Alexandria","pastor":"Father. Robert Kim Pu"},{"name":"Tulsa Baptist Church","pastor":"Sia Paubawi"},{"name":"ZBCM of Tulsa","pastor":"Rev. Dr. Ngo Suanthang Guite"},{"name":"Zomi SDA Tulsa","pastor":"Pastor Thlenga"}];
function churchSignature(list) {
  return Array.isArray(list) ? JSON.stringify(list.map(item => [item.name,item.pastor]).sort((a,b)=>a[0].localeCompare(b[0]))) : '';
}
function migrateContent(input) {
  const merged = { ...structuredClone(communityDefaults), ...input };
  if (churchSignature(merged.churches) === churchSignature(legacyChurches)) merged.churches = structuredClone(communityDefaults.churches);
  return validateContent(merged);
}
module.exports = { defaults, validateContent, migrateContent, slugify };
