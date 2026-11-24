const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../server/app.cjs');
const { hashPassword, parseUsers } = require('../server/auth.cjs');

const origin = 'http://127.0.0.1:8080';
const adminPassword = 'correct horse battery staple';

async function start() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ziok-accounts-'));
  const users = parseUsers(JSON.stringify([
    { username: 'admin', role: 'admin', passwordHash: await hashPassword(adminPassword) },
    { username: 'editor', role: 'editor', passwordHash: await hashPassword('editor password long') }
  ]));
  const server = createApp({ users, stateFile: path.join(dir, 'content.json'), origin, secureCookies: false });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (route, { cookie, csrf, payload } = {}) => {
    const response = await fetch(base + route, {
      method: payload === undefined ? 'GET' : 'POST',
      headers: { ...(cookie ? { Cookie: cookie } : {}), ...(payload === undefined ? {} : { 'Content-Type': 'application/json', Origin: origin, 'X-CSRF-Token': csrf || '' }) },
      body: payload === undefined ? undefined : JSON.stringify(payload)
    });
    return { status: response.status, body: await response.json().catch(() => null), cookie: response.headers.get('set-cookie')?.split(';')[0] };
  };
  const signIn = async (username, password) => {
    const login = await fetch(base + '/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify({ username, password }) });
    if (login.status !== 200) return { status: login.status };
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const info = await call('/api/admin/session', { cookie });
    return { status: 200, cookie, csrf: info.body.csrf, mustChange: info.body.mustChange };
  };
  return { call, signIn, dir, close: () => new Promise(resolve => server.close(resolve)) };
}

test('administrators create accounts with a temporary password that must be replaced', async () => {
  const app = await start();
  try {
    const admin = await app.signIn('admin', adminPassword);
    const temporary = 'temporary password 123';
    assert.equal((await app.call('/api/admin/accounts', { ...admin, payload: { action: 'create', username: 'maria', role: 'editor', password: 'short' } })).status, 400);
    const created = await app.call('/api/admin/accounts', { ...admin, payload: { action: 'create', username: 'maria', role: 'editor', password: temporary } });
    assert.equal(created.status, 200);
    assert.deepEqual(created.body.accounts.find(item => item.username === 'maria'), { username: 'maria', role: 'editor', disabled: false, mustChange: true });
    assert.equal((await app.call('/api/admin/accounts', { ...admin, payload: { action: 'create', username: 'maria', role: 'editor', password: temporary } })).status, 400, 'duplicate name');

    const maria = await app.signIn('maria', temporary);
    assert.equal(maria.mustChange, true);
    assert.equal((await app.call('/api/admin/state', maria)).status, 403, 'blocked until the password is changed');
    assert.equal((await app.call('/api/admin/accounts', maria)).status, 403);
    assert.equal((await app.call('/api/admin/password', { ...maria, payload: { current: 'wrong password entirely', next: 'a brand new long password' } })).status, 403);
    assert.equal((await app.call('/api/admin/password', { ...maria, payload: { current: temporary, next: temporary } })).status, 400);
    assert.equal((await app.call('/api/admin/password', { ...maria, payload: { current: temporary, next: 'too short' } })).status, 400);
    assert.equal((await app.call('/api/admin/password', { ...maria, payload: { current: temporary, next: 'a brand new long password' } })).status, 200);
    assert.equal((await app.call('/api/admin/state', maria)).status, 200, 'works after the change');
    assert.equal((await app.signIn('maria', temporary)).status, 401, 'old password no longer works');
    assert.equal((await app.signIn('maria', 'a brand new long password')).mustChange, false);
    // The account file is separate from the content state and is not world-readable.
    const mode = fs.statSync(path.join(app.dir, 'accounts.json')).mode & 0o777;
    assert.equal(mode, 0o600);
    assert.doesNotMatch(fs.readFileSync(path.join(app.dir, 'content.json'), 'utf8'), /passwordHash/);
    const audit = (await app.call('/api/admin/state', admin)).body.audit.map(item => item.action);
    assert.ok(audit.includes('created editor account maria') && audit.includes('changed own password'));
  } finally { await app.close(); }
});

test('only administrators manage accounts, and the last administrator is protected', async () => {
  const app = await start();
  try {
    const editor = await app.signIn('editor', 'editor password long');
    assert.equal((await app.call('/api/admin/accounts', editor)).status, 403);
    assert.equal((await app.call('/api/admin/accounts', { ...editor, payload: { action: 'create', username: 'x', role: 'admin', password: 'another long password' } })).status, 403);
    const admin = await app.signIn('admin', adminPassword);
    assert.equal((await app.call('/api/admin/accounts', { ...admin, payload: { action: 'disable', username: 'admin' } })).status, 400, 'cannot disable yourself');
    assert.equal((await app.call('/api/admin/accounts', { ...admin, payload: { action: 'role', username: 'admin', role: 'editor' } })).status, 400, 'cannot demote yourself');
    assert.equal((await app.call('/api/admin/accounts', { ...admin, payload: { action: 'nonsense', username: 'editor' } })).status, 400);
    assert.equal((await app.call('/api/admin/accounts', { ...admin, payload: { action: 'disable', username: 'ghost' } })).status, 400);
  } finally { await app.close(); }
});

test('disabling, resetting and demoting end the person’s open sessions', async () => {
  const app = await start();
  try {
    const admin = await app.signIn('admin', adminPassword);
    const editor = await app.signIn('editor', 'editor password long');
    assert.equal((await app.call('/api/admin/state', editor)).status, 200);
    assert.equal((await app.call('/api/admin/accounts', { ...admin, payload: { action: 'disable', username: 'editor' } })).status, 200);
    assert.equal((await app.call('/api/admin/state', editor)).status, 401, 'session ended');
    assert.equal((await app.signIn('editor', 'editor password long')).status, 401, 'cannot sign in while disabled');
    assert.equal((await app.call('/api/admin/accounts', { ...admin, payload: { action: 'enable', username: 'editor' } })).status, 200);
    assert.equal((await app.signIn('editor', 'editor password long')).status, 200);
    const again = await app.signIn('editor', 'editor password long');
    assert.equal((await app.call('/api/admin/accounts', { ...admin, payload: { action: 'reset', username: 'editor', password: 'reset password for editor' } })).status, 200);
    assert.equal((await app.call('/api/admin/state', again)).status, 401);
    assert.equal((await app.signIn('editor', 'reset password for editor')).mustChange, true);
    // A second administrator allows the first to be demoted by them.
    await app.call('/api/admin/accounts', { ...admin, payload: { action: 'create', username: 'second', role: 'admin', password: 'second admin password' } });
    const second = await app.signIn('second', 'second admin password');
    const changed = await app.call('/api/admin/password', { ...second, payload: { current: 'second admin password', next: 'second admin new password' } });
    assert.equal(changed.status, 200);
    assert.equal((await app.call('/api/admin/accounts', { ...second, payload: { action: 'role', username: 'admin', role: 'editor' } })).status, 200);
    assert.equal((await app.call('/api/admin/accounts', { ...second, payload: { action: 'disable', username: 'admin' } })).status, 200);
  } finally { await app.close(); }
});

test('changed passwords survive a restart and replace the environment password', async () => {
  const app = await start();
  const dir = app.dir;
  try {
    const admin = await app.signIn('admin', adminPassword);
    assert.equal((await app.call('/api/admin/password', { ...admin, payload: { current: adminPassword, next: 'my new admin password' } })).status, 200);
  } finally { await app.close(); }
  const users = parseUsers(JSON.stringify([{ username: 'admin', role: 'admin', passwordHash: await hashPassword(adminPassword) }]));
  const server = createApp({ users, stateFile: path.join(dir, 'content.json'), origin, secureCookies: false });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const login = password => fetch(`http://127.0.0.1:${server.address().port}/api/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify({ username: 'admin', password }) });
    assert.equal((await login('my new admin password')).status, 200);
    assert.equal((await login(adminPassword)).status, 401);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
