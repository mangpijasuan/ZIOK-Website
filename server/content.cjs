const defaults = {
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
  const video = text(input?.media?.youtubeVideoId, 11);
  if (video && !/^[A-Za-z0-9_-]{11}$/.test(video)) throw new Error('Invalid YouTube video ID');
  return { news: list(input?.news, 'tag'), events: list(input?.events, 'date'), media: {
    youtubeChannel: url(input?.media?.youtubeChannel, ['youtube.com', 'www.youtube.com', 'm.youtube.com']),
    facebookPage: url(input?.media?.facebookPage, ['facebook.com', 'www.facebook.com', 'm.facebook.com']), youtubeVideoId: video
  } };
}
module.exports = { defaults, validateContent };
