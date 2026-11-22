// Rewrites <lastmod> in sitemap.xml from the git history of the files that make up each page.
// A page's date changes only when one of its own source files changes, so unchanged pages keep
// their date. Files with uncommitted changes count as modified today.
// Usage: node scripts/update-sitemap.cjs
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sources = {
  'https://ziok.org/': ['index.html', 'home.js', 'media-config.js'],
  'https://ziok.org/leadership.html': ['leadership.html', 'leadership.js'],
  'https://ziok.org/governance.html': ['governance.html', 'governance.js', 'documents/ziok-constitution-september-2024.pdf', 'documents/ziok-bylaws-september-2024.pdf'],
  'https://ziok.org/businesses.html': ['businesses.html', 'businesses.js', 'community-data.js'],
  'https://ziok.org/churches.html': ['churches.html', 'churches.js', 'community-data.js'],
  'https://ziok.org/villages.html': ['villages.html', 'villages.js', 'community-data.js']
};
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const today = new Date().toISOString().slice(0, 10);
function modified(file) {
  if (git('status', '--porcelain', '--', file)) return today;
  return git('log', '-1', '--format=%cs', '--', file) || today;
}
let xml = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8').replace(/<lastmod>[^<]*<\/lastmod>/g, '');
for (const [url, files] of Object.entries(sources)) {
  const date = files.map(modified).sort().at(-1);
  const entry = `<loc>${url}</loc>`;
  if (!xml.includes(entry)) throw new Error(`sitemap.xml is missing ${url}`);
  xml = xml.replace(entry, `${entry}<lastmod>${date}</lastmod>`);
  console.log(date, url);
}
fs.writeFileSync(path.join(root, 'sitemap.xml'), xml);
