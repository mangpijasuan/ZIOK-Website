const $ = id => document.getElementById(id);
let previousFocus;
function openModal(id) {
  previousFocus = document.activeElement;
  document.querySelectorAll('body > header, body > main, body > footer, body > .skip-link').forEach(element => element.inert = true);
  $(id).classList.add('open');
  $(id).querySelector('button').focus();
}
function closeModal(id) {
  $(id).classList.remove('open');
  document.querySelectorAll('body > header, body > main, body > footer, body > .skip-link').forEach(element => element.inert = false);
  previousFocus?.focus();
}
document.querySelectorAll('[data-open-dialog]').forEach(button => button.addEventListener('click', () => openModal(button.dataset.openDialog)));
document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => closeModal(button.dataset.closeDialog)));
document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', event => {
    if (event.target === modal) closeModal(modal.id);
  });
  modal.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeModal(modal.id);
    if (event.key !== 'Tab') return;
    const buttons = [...modal.querySelectorAll('button, a[href], input, select')];
    const first = buttons[0], last = buttons.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  });
});
document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-tab]').forEach(other => {
    other.classList.toggle('active', other === button);
    other.setAttribute('aria-pressed', String(other === button));
  });
  ['videos', 'photos'].forEach(id => $(id).classList.toggle('hidden', id !== button.dataset.tab));
}));
function approvedUrl(value, hosts) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && hosts.includes(url.hostname) ? url.href : null;
  } catch { return null; }
}
function contentText(tag, english, zomi = '', className = '') {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = english;
  element.dataset.contentEn = english;
  element.dataset.contentZo = zomi || english;
  return element;
}
// Titles link to their own page when the server provides one (/news/<slug>, /events/<slug>).
function contentLink(tag, href, english, zomi, className = '') {
  const element = document.createElement(tag);
  const link = contentText('a', english, zomi, 'content-link');
  link.href = href; element.className = className; element.append(link);
  return element;
}
function viewAll(grid, href, english, zomi) {
  const paragraph = document.createElement('p'); paragraph.className = 'view-all';
  const link = contentText('a', english, zomi, 'content-link'); link.href = href;
  paragraph.append(link); grid.after(paragraph);
}
if (ZIOK_CONTENT) {
  $('newsgrid').replaceChildren(...ZIOK_CONTENT.news.map(item => {
    const card = document.createElement('article'); card.className = 'card';
    const inner = document.createElement('div'); inner.className = 'inner';
    inner.append(contentText('div', item.tag, '', 'tag'), contentLink('h3', '/news/' + item.slug, item.title, item.titleZo), contentText('p', item.body, item.bodyZo));
    card.append(inner); return card;
  }));
  $('eventgrid').replaceChildren(...ZIOK_CONTENT.events.map(item => {
    const card = document.createElement('article'); card.className = 'event';
    const inner = document.createElement('div');
    inner.append(contentLink('h3', '/events/' + item.slug, item.title, item.titleZo), contentText('p', item.body, item.bodyZo));
    card.append(contentText('div', item.date, '', 'date'), inner); return card;
  }));
  // Zomi wording below is a draft built from glossary terms; have a Zomi reader confirm it.
  viewAll($('newsgrid'), '/news/', 'View all news', 'Thuthak khempeuh en in');
  viewAll($('eventgrid'), '/events/', 'View all events', 'Pawite khempeuh en in');
}
function addMediaLink(container, url, label) {
  const link = document.createElement('a');
  link.href = url; link.textContent = label; link.className = 'source';
  link.target = '_blank'; link.rel = 'noopener noreferrer';
  container.append(document.createElement('br'), link);
}
const media = ZIOK_CONTENT?.media || ZIOK_MEDIA;
const channel = approvedUrl(media.youtubeChannel, ['youtube.com', 'www.youtube.com', 'm.youtube.com']);
const facebook = approvedUrl(media.facebookPage, ['facebook.com', 'www.facebook.com', 'm.facebook.com']);
if (/^[\w-]{11}$/.test(media.youtubeVideoId)) {
  const iframe = document.createElement('iframe');
  iframe.className = 'embed'; iframe.loading = 'lazy'; iframe.title = 'Community video';
  iframe.src = 'https://www.youtube-nocookie.com/embed/' + media.youtubeVideoId;
  iframe.allowFullscreen = true;
  $('videos').replaceChildren(iframe);
  $('ytstatus').textContent = 'YouTube · Community videos';
}
if (channel) {
  addMediaLink($('videos'), channel, 'Visit YouTube channel');
  $('ytstatus').textContent = 'YouTube · Community videos';
}
if (facebook) {
  addMediaLink($('photos'), facebook, 'Visit Facebook Page');
  $('fbstatus').textContent = 'Facebook · Community updates';
}

// Only configured official profiles become clickable; empty slots are non-interactive.
const socialHosts = {
  facebookPage: ['facebook.com', 'www.facebook.com', 'm.facebook.com'],
  youtubeChannel: ['youtube.com', 'www.youtube.com', 'm.youtube.com'],
  instagramPage: ['instagram.com', 'www.instagram.com'],
  tiktokPage: ['tiktok.com', 'www.tiktok.com', 'm.tiktok.com'],
  xPage: ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com']
};
document.querySelectorAll('[data-social]').forEach(icon => {
  const key = icon.dataset.social;
  const url = approvedUrl(media[key], socialHosts[key]);
  if (!url) return;
  const link = document.createElement('a');
  const name = icon.getAttribute('aria-label').replace(' (link not configured)', '');
  link.className = icon.className; link.dataset.social = key;
  link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer';
  link.setAttribute('aria-label', name); link.title = name;
  link.append(...icon.childNodes); icon.replaceWith(link);
});
