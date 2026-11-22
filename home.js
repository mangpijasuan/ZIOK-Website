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
if (ZIOK_CONTENT) {
  $('newsgrid').replaceChildren(...ZIOK_CONTENT.news.map(item => {
    const card = document.createElement('article'); card.className = 'card';
    const inner = document.createElement('div'); inner.className = 'inner';
    inner.append(contentText('div', item.tag, '', 'tag'), contentText('h3', item.title, item.titleZo), contentText('p', item.body, item.bodyZo));
    card.append(inner); return card;
  }));
  $('eventgrid').replaceChildren(...ZIOK_CONTENT.events.map(item => {
    const card = document.createElement('article'); card.className = 'event';
    const inner = document.createElement('div');
    inner.append(contentText('h3', item.title, item.titleZo), contentText('p', item.body, item.bodyZo));
    card.append(contentText('div', item.date, '', 'date'), inner); return card;
  }));
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
  const footerLinks = $('footer-social-links');
  if (footerLinks) {
    const link = document.createElement('a');
    link.href = channel; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'YouTube';
    footerLinks.append(link);
  }
}
if (facebook) {
  addMediaLink($('photos'), facebook, 'Visit Facebook Page');
  const newsLink = document.createElement('a');
  newsLink.href = facebook; newsLink.target = '_blank'; newsLink.rel = 'noopener noreferrer';
  newsLink.textContent = 'Visit Facebook Page ↗';
  $('fbstatus').replaceChildren(newsLink);
  const footerLink = $('footer-social-links');
  if (footerLink) {
    const link = document.createElement('a');
    link.href = facebook; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Facebook';
    footerLink.append(link);
  }
}
