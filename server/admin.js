const $ = id => document.getElementById(id);
let session, revision, dirty = false;
const fields = { news: [['title', 'English title', 150], ['titleZo', 'Zomi title', 150], ['body', 'English announcement', 1000], ['bodyZo', 'Zomi announcement', 1000], ['tag', 'Category label', 80], ['date', 'Published date (YYYY-MM-DD, optional)', 10], ['slug', 'Page name for the web address (leave blank to create one automatically)', 80]], events: [['title', 'English title', 150], ['titleZo', 'Zomi title', 150], ['body', 'English description', 1000], ['bodyZo', 'Zomi description', 1000], ['date', 'Date label shown on the card (for example FEB 20)', 80], ['startDate', 'Start date (YYYY-MM-DD, optional; needed for search listings)', 10], ['location', 'Location (optional; needed for search listings)', 200], ['slug', 'Page name for the web address (leave blank to create one automatically)', 80]] };
Object.assign(fields, {
  businesses: [['name', 'Business name', 150], ['phone', 'US phone number', 40], ['address', 'Address', 300], ['category', 'Category', 80, [...new Set(ZIOK_COMMUNITY_DEFAULTS.businesses.map(item => item.category))]]],
  churches: [['name', 'Church name', 150], ['pastor', 'Pastor', 150]], villages: [['name', 'Association name', 150]],
  terms: [['label', 'Term (YYYY–YYYY)', 9]], leadership: [['term', 'Board term (YYYY–YYYY)', 9], ['name', 'Full name', 150], ['nickname', 'Nickname', 150], ['role', 'Role', 150], ['kind', 'Member type', 20, ['Officer', 'Director']]],
  documents: [['type', 'Official document', 20], ['noteEn', 'English note', 1000], ['noteZo', 'Zomi note', 1000]]
});
const labels = { news: 'News item', events: 'Event', businesses: 'Business', churches: 'Church', villages: 'Village association', terms: 'Board term', leadership: 'Board member', documents: 'Document' };
const limits = { news: 50, events: 50, businesses: 200, churches: 200, villages: 200, terms: 20, leadership: 200, documents: 2 };
const mediaFields = ['youtubeChannel', 'facebookPage', 'youtubeVideoId'];
function message(value) { $('status').textContent = value; }
function refreshCounts() {
  document.querySelectorAll('[data-count]').forEach(node => { node.textContent = $(node.dataset.count + '-items').children.length; });
}
function updateDraftBadge() {
  $('draft-status').textContent = dirty ? 'Unsaved changes' : 'Saved draft';
  $('draft-status').dataset.dirty = String(dirty);
}
document.querySelectorAll('.workspace-link').forEach(link => link.addEventListener('click', () => {
  const target = $(link.getAttribute('href').slice(1));
  if (target?.tagName === 'DETAILS') target.open = true;
  document.querySelectorAll('.sidebar a').forEach(item => {
    if (item.getAttribute('href') === link.getAttribute('href')) item.setAttribute('aria-current', 'location');
    else item.removeAttribute('aria-current');
  });
}));
async function request(endpoint, payload) {
  const options = payload === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json', ...(session ? { 'X-CSRF-Token': session.csrf } : {}) }, body: JSON.stringify(payload) };
  const response = await fetch('/api/admin/' + endpoint, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}
function addRow(type, data = {}) {
  const group = $(type + '-items');
  if (group.children.length >= limits[type]) { message(`Maximum ${limits[type]} entries for this section.`); return; }
  const row = document.createElement('fieldset');
  const legend = document.createElement('legend'); legend.textContent = labels[type]; row.append(legend);
  for (const [name, caption, max, options] of fields[type]) {
    const label = document.createElement('label'); label.textContent = caption;
    const input = document.createElement(options ? 'select' : max === 1000 ? 'textarea' : 'input'); input.dataset.field = name;
    if (options) for (const value of options) { const option = document.createElement('option'); option.value = value; option.textContent = value; input.append(option); }
    else input.maxLength = max;
    input.value = data[name] || options?.[0] || '';
    input.required = ['title', 'name', 'label', 'term', 'role', 'category', 'kind', 'type'].includes(name);
    if (type === 'documents' && name === 'type') input.readOnly = true;
    label.append(input); row.append(label);
  }
  if (type !== 'documents') { const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Remove entry'; remove.addEventListener('click', () => { row.remove(); refreshCounts(); markDirty(); }); row.append(remove); }
  group.append(row);
  const title = row.querySelector('[data-field="name"], [data-field="title"], [data-field="label"], [data-field="type"]');
  const updateLegend = () => { legend.textContent = title?.value.trim() || labels[type]; };
  title?.addEventListener('input', updateLegend); updateLegend();
  return row;
}
function markDirty() { dirty = true; $('publish').disabled = true; updateDraftBadge(); }
function snapshot() {
  const content = { media: Object.fromEntries(mediaFields.map(name => [name, $(name).value])) };
  for (const type of Object.keys(fields)) content[type] = [...$(type + '-items').children].map(row => Object.fromEntries([...row.querySelectorAll('[data-field]')].map(input => [input.dataset.field, input.value])));
  return content;
}
async function load() {
  const data = await request('state'); revision = data.revision;
  for (const type of Object.keys(fields)) { $(type + '-items').replaceChildren(); data.draft[type].forEach(item => addRow(type, item)); }
  document.querySelectorAll('[data-filter]').forEach(input => input.value = '');
  mediaFields.forEach(name => $(name).value = data.draft.media[name]);
  $('audit').replaceChildren();
  for (const record of data.audit) { const item = document.createElement('li'); item.textContent = `${record.at} — ${record.actor}: ${record.action} (revision ${record.revision})`; $('audit').append(item); }
  dirty = false; $('publish').disabled = false; refreshCounts(); updateDraftBadge();
  message(`Loaded revision ${revision}. ${data.published ? 'Published content is active.' : 'Original public content is active.'}`);
}
async function signedIn() {
  session = await request('session'); await load();
  $('identity').textContent = `${session.username} · ${session.role}`;
  $('publish').hidden = session.role !== 'admin'; $('audit-panel').hidden = session.role !== 'admin'; $('audit-link').hidden = session.role !== 'admin';
  $('signin').hidden = true; $('dashboard').hidden = false; $('logout').hidden = false;
}
function signedOut() { session = null; $('dashboard').hidden = true; $('logout').hidden = true; $('signin').hidden = false; $('password').value = ''; }
async function busy(button, action) {
  button.disabled = true;
  try { await action(); } catch (error) { message(error.message); }
  finally { button.disabled = button.id === 'publish' && dirty; }
}
$('login').addEventListener('submit', event => { event.preventDefault(); busy(event.submitter, async () => { await request('login', { username: $('username').value, password: $('password').value }); $('password').value = ''; await signedIn(); }); });
$('logout').addEventListener('click', () => busy($('logout'), async () => { await request('logout', {}); signedOut(); message('Signed out.'); }));
document.querySelectorAll('[data-add]').forEach(button => button.addEventListener('click', () => { const filter = $('filter-' + button.dataset.add); if (filter) { filter.value = ''; filter.dispatchEvent(new Event('input')); } const row = addRow(button.dataset.add); if (row) { refreshCounts(); markDirty(); row.querySelector('[data-field]')?.focus(); } }));
document.querySelectorAll('[data-filter]').forEach(input => input.addEventListener('input', () => {
  const query = input.value.toLowerCase();
  for (const row of $(input.dataset.filter + '-items').children) row.hidden = ![...row.querySelectorAll('[data-field]')].some(field => field.value.toLowerCase().includes(query));
}));
$('editor').addEventListener('input', event => { if (!event.target.matches('[data-filter]')) markDirty(); });
$('editor').addEventListener('invalid', event => { const details = event.target.closest('details'); if (details) details.open = true; const row = event.target.closest('fieldset'); if (row) row.hidden = false; }, true);
$('editor').addEventListener('submit', event => { event.preventDefault(); busy(event.submitter, async () => { await request('save', { revision, content: snapshot() }); await load(); message('Draft saved.'); }); });
$('publish').addEventListener('click', () => { if (!dirty && confirm('Publish the saved draft to the public website?')) busy($('publish'), async () => { await request('publish', { revision }); await load(); message('Published successfully.'); }); });
$('reload').addEventListener('click', () => { if (!dirty || confirm('Discard unsaved changes?')) busy($('reload'), load); });
signedIn().catch(() => signedOut());
