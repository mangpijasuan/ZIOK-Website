const $ = id => document.getElementById(id);
let session, revision, dirty = false;
const fields = { news: [['title', 'English title', 150], ['titleZo', 'Zomi title', 150], ['body', 'English announcement', 1000], ['bodyZo', 'Zomi announcement', 1000], ['tag', 'Category label', 80]], events: [['title', 'English title', 150], ['titleZo', 'Zomi title', 150], ['body', 'English description', 1000], ['bodyZo', 'Zomi description', 1000], ['date', 'Date label', 80]] };
const mediaFields = ['youtubeChannel', 'facebookPage', 'youtubeVideoId'];
function message(value) { $('status').textContent = value; }
async function request(endpoint, payload) {
  const options = payload === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json', ...(session ? { 'X-CSRF-Token': session.csrf } : {}) }, body: JSON.stringify(payload) };
  const response = await fetch('/api/admin/' + endpoint, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}
function addRow(type, data = {}) {
  const group = $(type + '-items');
  if (group.children.length >= 50) { message('Maximum 50 entries per section.'); return; }
  const row = document.createElement('fieldset');
  const legend = document.createElement('legend'); legend.textContent = type === 'news' ? 'News item' : 'Event'; row.append(legend);
  for (const [name, caption, max] of fields[type]) {
    const label = document.createElement('label'); label.textContent = caption;
    const input = document.createElement(max === 1000 ? 'textarea' : 'input'); input.dataset.field = name; input.maxLength = max; input.value = data[name] || ''; input.required = name === 'title'; label.append(input); row.append(label);
  }
  const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Remove entry'; remove.addEventListener('click', () => { row.remove(); markDirty(); }); row.append(remove); group.append(row);
}
function markDirty() { dirty = true; $('publish').disabled = true; }
function snapshot() {
  const content = { media: Object.fromEntries(mediaFields.map(name => [name, $(name).value])) };
  for (const type of Object.keys(fields)) content[type] = [...$(type + '-items').children].map(row => Object.fromEntries([...row.querySelectorAll('[data-field]')].map(input => [input.dataset.field, input.value])));
  return content;
}
async function load() {
  const data = await request('state'); revision = data.revision;
  for (const type of Object.keys(fields)) { $(type + '-items').replaceChildren(); data.draft[type].forEach(item => addRow(type, item)); }
  mediaFields.forEach(name => $(name).value = data.draft.media[name]);
  $('audit').replaceChildren();
  for (const record of data.audit) { const item = document.createElement('li'); item.textContent = `${record.at} — ${record.actor}: ${record.action} (revision ${record.revision})`; $('audit').append(item); }
  dirty = false; $('publish').disabled = false;
  message(`Loaded revision ${revision}. ${data.published ? 'Published content is active.' : 'Original public content is active.'}`);
}
async function signedIn() {
  session = await request('session'); await load();
  $('identity').textContent = `${session.username} · ${session.role}`;
  $('publish').hidden = session.role !== 'admin'; $('audit-panel').hidden = session.role !== 'admin';
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
document.querySelectorAll('[data-add]').forEach(button => button.addEventListener('click', () => { addRow(button.dataset.add); markDirty(); }));
$('editor').addEventListener('input', markDirty);
$('editor').addEventListener('submit', event => { event.preventDefault(); busy(event.submitter, async () => { await request('save', { revision, content: snapshot() }); await load(); message('Draft saved.'); }); });
$('publish').addEventListener('click', () => { if (!dirty && confirm('Publish the saved draft to the public homepage?')) busy($('publish'), async () => { await request('publish', { revision }); await load(); message('Published successfully.'); }); });
$('reload').addEventListener('click', () => { if (!dirty || confirm('Discard unsaved changes?')) busy($('reload'), load); });
signedIn().catch(() => signedOut());
