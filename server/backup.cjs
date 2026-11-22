const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { migrateContent } = require('./content.cjs');

const root = path.resolve(__dirname, '..');
const NAME = /^content-\d{8}T\d{6}Z-r(\d+)\.json$/;

function stamp(date) { return date.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z'); }

// Validates a state file the same way the server does when it starts, so a
// backup that passes here can be restored. Content goes through the real
// content validation, not just a shape check.
function validateState(state) {
  if (!state || typeof state !== 'object' || !Number.isSafeInteger(state.revision) || state.revision < 0 || !Array.isArray(state.audit)) throw new Error('State file is not valid; nothing was backed up');
  for (const entry of state.audit) {
    if (!entry || typeof entry.at !== 'string' || Number.isNaN(Date.parse(entry.at)) || typeof entry.actor !== 'string' || typeof entry.action !== 'string' || !Number.isSafeInteger(entry.revision) || entry.revision < 1 || entry.revision > state.revision) throw new Error('State file has an invalid audit entry; nothing was backed up');
  }
  if (typeof state.draft !== 'object' || state.draft === null) throw new Error('State file is not valid; nothing was backed up');
  try {
    migrateContent(state.draft);
    if (state.published !== null) migrateContent(state.published);
  } catch (error) { throw new Error(`State file content failed validation (${error.message}); nothing was backed up`); }
  return state;
}

// Copies the content state (drafts, published content and audit history) to a
// timestamped file. A backup is skipped when the newest one is already at the
// same revision, so a scheduled task can run as often as needed.
function backup({ stateFile, directory = path.join(path.dirname(stateFile), 'backups'), keep = 30, now = new Date() }) {
  if (!Number.isInteger(keep) || keep < 1) throw new Error('Backup retention must be a positive integer');
  const raw = fs.readFileSync(stateFile, 'utf8');
  validateState(JSON.parse(raw));
  const state = JSON.parse(raw);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const existing = () => fs.readdirSync(directory).map(name => ({ name, match: NAME.exec(name) })).filter(item => item.match)
    .map(item => ({ name: item.name, revision: Number(item.match[1]) })).sort((a, b) => a.name.localeCompare(b.name));
  const newest = existing().at(-1);
  if (newest && newest.revision === state.revision && fs.readFileSync(path.join(directory, newest.name), 'utf8') === raw) return { created: null, kept: existing().length };
  const file = path.join(directory, `content-${stamp(now)}-r${state.revision}.json`);
  const temp = `${file}.${randomBytes(8).toString('hex')}.tmp`;
  try { fs.writeFileSync(temp, raw, { mode: 0o600, flag: 'wx' }); fs.renameSync(temp, file); }
  finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
  const all = existing();
  for (const old of all.slice(0, Math.max(0, all.length - keep))) fs.unlinkSync(path.join(directory, old.name));
  return { created: file, kept: Math.min(all.length, keep) };
}

if (require.main === module) {
  try {
    // node server/backup.cjs --verify <file>: check a backup or off-site copy before restoring it.
    if (process.argv[2] === '--verify') {
      if (!process.argv[3]) throw new Error('Usage: node server/backup.cjs --verify <file>');
      const state = validateState(JSON.parse(fs.readFileSync(path.resolve(process.argv[3]), 'utf8')));
      console.log(`Backup is valid (revision ${state.revision}, ${state.audit.length} audit entries)`);
      return;
    }
    const stateFile = path.resolve(process.env.ZIOK_STATE_FILE || path.join(root, 'var', 'content.json'));
    const keep = Number(process.env.ZIOK_BACKUP_KEEP || 30);
    const directory = process.env.ZIOK_BACKUP_DIR ? path.resolve(process.env.ZIOK_BACKUP_DIR) : undefined;
    const result = backup({ stateFile, directory, keep });
    console.log(result.created ? `Backup written: ${result.created} (${result.kept} kept)` : `Backup already current (${result.kept} kept)`);
  } catch (error) {
    console.error(`Backup failed: ${error.message}`);
    process.exitCode = 1;
  }
}
module.exports = { backup, validateState };
