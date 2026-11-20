const $ = id => document.getElementById(id);
let previousFocus;
function openModal(id) {
  previousFocus = document.activeElement;
  $(id).classList.add('open');
  $(id).querySelector('button').focus();
}
function closeModal(id) {
  $(id).classList.remove('open');
  previousFocus?.focus();
}
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
function setMenu(open) {
  $('links').classList.toggle('open', open);
  $('menu').setAttribute('aria-expanded', String(open));
  $('menu').setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
}
$('menu').addEventListener('click', () => setMenu(!$('links').classList.contains('open')));
document.querySelectorAll('.links a').forEach(a => a.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && $('links').classList.contains('open')) {
    setMenu(false); $('menu').focus();
  }
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
function addMediaLink(container, url, label) {
  const link = document.createElement('a');
  link.href = url; link.textContent = label; link.className = 'source';
  link.target = '_blank'; link.rel = 'noopener noreferrer';
  container.append(document.createElement('br'), link);
}
const channel = approvedUrl(ZIOK_MEDIA.youtubeChannel, ['youtube.com', 'www.youtube.com', 'm.youtube.com']);
const facebook = approvedUrl(ZIOK_MEDIA.facebookPage, ['facebook.com', 'www.facebook.com', 'm.facebook.com']);
if (/^[\w-]{11}$/.test(ZIOK_MEDIA.youtubeVideoId)) {
  const iframe = document.createElement('iframe');
  iframe.className = 'embed'; iframe.loading = 'lazy'; iframe.title = 'Community video';
  iframe.src = 'https://www.youtube-nocookie.com/embed/' + ZIOK_MEDIA.youtubeVideoId;
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
