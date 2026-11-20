const { randomBytes, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const derive = promisify(scrypt);
const HASH = /^[a-f0-9]{32}:[a-f0-9]{128}$/;
const dummy = `${'0'.repeat(32)}:${'0'.repeat(128)}`;

async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 14 || password.length > 256) throw new Error('Password must contain 14–256 characters');
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${(await derive(password, salt, 64)).toString('hex')}`;
}
async function verifyPassword(password, encoded) {
  if (typeof password !== 'string' || password.length > 256) return false;
  const [salt, hash] = (HASH.test(encoded || '') ? encoded : dummy).split(':');
  const actual = await derive(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(hash, 'hex')) && HASH.test(encoded || '');
}
function parseUsers(value) {
  const parsed = JSON.parse(value || '[]');
  if (!Array.isArray(parsed) || !parsed.length) throw new Error('Configure at least one administrator in ZIOK_USERS_JSON');
  const users = new Map();
  for (const item of parsed) {
    if (!/^[A-Za-z0-9_.-]{1,64}$/.test(item?.username || '') || !['admin', 'editor'].includes(item.role) || !HASH.test(item.passwordHash || '') || users.has(item.username)) throw new Error('Invalid administrator configuration');
    users.set(item.username, { role: item.role, passwordHash: item.passwordHash });
  }
  if (![...users.values()].some(user => user.role === 'admin')) throw new Error('At least one admin role is required');
  return users;
}
module.exports = { hashPassword, verifyPassword, parseUsers };
