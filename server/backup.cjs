const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');

const root = path.resolve(__dirname, '..');
const NAME = /^content-\d{8}T\d{6}Z-r(\d+)\.json$/;

function stamp(date) { return date.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z'); }

// Copies the content state (drafts, published content and audit history) to a
// timestamped file. A backup is skipped when the newest one is already at the
// same revision, so a scheduled task can run as often as needed.
function backup({ stateFile, directory = path.join(path.dirname(stateFile), 'backups'), keep = 30, now = new Date() }) {
  if (!Number.isInteger(keep) || keep < 1) throw new Error('Backup retention must be a positive integer');
  const raw = fs.readFileSync(stateFile, 'utf8');
  const state = JSON.parse(raw);
  if (!Number.isSafeInteger(state.revision) || state.revision < 0 || !Array.isArray(state.audit) || typeof state.draft !== 'object' || state.draft === null) throw new Error('State file is not valid; nothing was backed up');
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
module.exports = { backup };
