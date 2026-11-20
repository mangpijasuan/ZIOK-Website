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
  media: { youtubeChannel: '', facebookPage: '', youtubeVideoId: '' }
};

function validateContent(input) {
  function text(value, limit, required = false) {
    if (typeof value !== 'string' || value.length > limit || (required && !value.trim())) throw new Error('Invalid content field');
    return value.trim();
  }
  function list(value, field) {
    if (!Array.isArray(value) || value.length > 50) throw new Error('Each list must contain 0–50 entries');
    return value.map(item => ({ title: text(item?.title, 150, true), titleZo: text(item?.titleZo, 150), body: text(item?.body, 1000), bodyZo: text(item?.bodyZo, 1000), [field]: text(item?.[field], 80) }));
  }
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
  return { businesses, churches, villages, terms, leadership, documents, news: list(input?.news, 'tag'), events: list(input?.events, 'date'), media: {
    youtubeChannel: url(input?.media?.youtubeChannel, ['youtube.com', 'www.youtube.com', 'm.youtube.com']),
    facebookPage: url(input?.media?.facebookPage, ['facebook.com', 'www.facebook.com', 'm.facebook.com']), youtubeVideoId: video
  } };
}
// Existing Phase 4 state has no community fields; preserve its published homepage data.
function migrateContent(input) { return validateContent({ ...structuredClone(communityDefaults), ...input }); }
module.exports = { defaults, validateContent, migrateContent };
