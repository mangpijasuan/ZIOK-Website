// Accounts managed from the administrator portal. Accounts named in ZIOK_USERS_JSON stay valid;
// a saved record for the same name replaces the one from the environment, and new names are added.
const fs = require('node:fs');

function createAccountStore({ envUsers, file, persist }) {
  let saved = {};
  if (fs.existsSync(file)) {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid accounts file');
    saved = parsed;
  }
  const raw = name => Object.hasOwn(saved, name) ? saved[name] : envUsers.get(name);
  const names = () => [...new Set([...envUsers.keys(), ...Object.keys(saved)])].sort();
  return {
    // An account that is turned off is treated as if it did not exist, unless asked for explicitly.
    get(name, includeDisabled = false) {
      const user = typeof name === 'string' ? raw(name) : undefined;
      return user && (includeDisabled || !user.disabled) ? { ...user } : undefined;
    },
    set(name, record) { saved = { ...saved, [name]: record }; persist(file, saved); },
    list() { return names().map(name => { const user = raw(name); return { username: name, role: user.role, disabled: Boolean(user.disabled), mustChange: Boolean(user.mustChange) }; }); },
    // True when, after replacing this account with `next`, someone can still sign in as an administrator.
    wouldKeepAdmin(name, next) {
      return names().some(other => { const user = other === name ? next : raw(other); return user.role === 'admin' && !user.disabled; });
    }
  };
}
module.exports = { createAccountStore };
