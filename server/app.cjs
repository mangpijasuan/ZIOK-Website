const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes, timingSafeEqual } = require('node:crypto');
const { defaults, validateContent, migrateContent } = require('./content.cjs');
const { verifyPassword, parseUsers } = require('./auth.cjs');
const { parseTrustedProxies, clientAddress } = require('./proxy.cjs');
const { routeContentPage, contentSitemapEntries } = require('./pages.cjs');
const { sendBody, bodyTag, sendFileWithCaching } = require('./delivery.cjs');

const root = path.resolve(__dirname, '..');
const publicFiles = new Set(['index.html', 'leadership.html', 'businesses.html', 'churches.html', 'villages.html', 'governance.html', 'reader.html', 'home.js', 'navigation.js', 'locale.js', 'leadership.js', 'businesses.js', 'churches.js', 'villages.js', 'governance.js', 'community-data.js', 'reader.js', 'media-config.js', 'shared.css', 'print.css', 'content-pages.css', 'base.css', 'directory.css', 'index.css', 'leadership.css', 'governance.css', 'businesses.css', 'churches.css', 'villages.css', 'reader.css', 'error.css', 'ziok-logo-160.webp', 'ziok-logo.png', 'ziok-logo-512.webp', 'ziok-social.jpg', 'favicon.ico', 'favicon-48.png', 'favicon-192.png', 'apple-touch-icon.png', 'robots.txt', 'sitemap.xml']);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8' };
const headers = {
  'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; frame-src https://www.youtube-nocookie.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"
};
const token = () => randomBytes(32).toString('hex');
const ttl = 8 * 60 * 60 * 1000;
const limitWindow = 15 * 60 * 1000;
const accountFailureLimit = 10;
function equalToken(a, b) {
  return typeof a === 'string' && /^[a-f0-9]{64}$/.test(a) && typeof b === 'string' && /^[a-f0-9]{64}$/.test(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
function json(res, status, body) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); }
async function body(req) {
  if (req.headers['content-type']?.split(';')[0] !== 'application/json') throw new Error('JSON required');
  let size = 0; const chunks = [];
  for await (const chunk of req) { size += chunk.length; if (size > 1048576) throw new Error('Request too large'); chunks.push(chunk); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
const fallbackContent = migrateContent(defaults);
function initialState(file) {
  if (fs.existsSync(file)) {
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Number.isSafeInteger(saved.revision) || saved.revision < 0 || !Array.isArray(saved.audit)) throw new Error('Invalid content state');
    return { ...saved, draft: migrateContent(saved.draft), published: saved.published === null ? null : migrateContent(saved.published) };
  }
  return { revision: 0, draft: structuredClone(defaults), published: null, audit: [] };
}
function persist(file, state) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const temp = `${file}.${token()}.tmp`;
  try { fs.writeFileSync(temp, JSON.stringify(state, null, 2), { mode: 0o600, flag: 'wx' }); fs.renameSync(temp, file); }
  finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
}
function sendFile(req, res, file, cache, status = 200) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { json(res, 404, { error: 'Not found' }); return; }
  sendFileWithCaching(req, res, file, { relative: path.relative(root, file), cacheControl: cache, status, type: mime[path.extname(file)] });
}

// The date of the latest publish. Edits and drafts never count, and neither does the passage of time,
// so dates move only when content actually goes live.
function latestPublishDate(state) {
  if (state.published === null) return null;
  return state.audit.filter(entry => entry.action === 'publish').map(entry => String(entry.at).slice(0, 10)).sort().at(-1) || null;
}

// Raises each <lastmod> to the latest publish date; later dates are never lowered.
function sitemapWithPublishDate(xml, state) {
  const latest = latestPublishDate(state);
  if (!latest) return xml;
  return xml.replace(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/g, (match, date) => `<lastmod>${date > latest ? date : latest}</lastmod>`);
}

// The static page list plus an entry for each generated news and event page.
function fullSitemap(xml, state, content, origin) {
  const dated = sitemapWithPublishDate(xml, state);
  const fallback = latestPublishDate(state) || /<lastmod>([^<]*)<\/lastmod>/.exec(dated)?.[1];
  return dated.replace('</urlset>', `  ${contentSitemapEntries(content, origin, fallback)}\n</urlset>`);
}

// Browsers navigating to an unknown page get the branded 404 page; API and
// non-HTML requests keep the JSON response.
function notFound(req, res, pathname) {
  const wantsPage = !pathname.startsWith('/api/') && (req.headers.accept || '').includes('text/html');
  if (wantsPage) return sendFile(req, res, path.join(root, '404.html'), 'no-cache', 404);
  return json(res, 404, { error: 'Not found' });
}

function createApp({ users, stateFile, origin, secureCookies = true, trustedProxies = parseTrustedProxies(''), hsts = '' }) {
  let state = initialState(stateFile);
  // What visitors see: published content, or the original content until something is published.
  const publicContent = () => state.published ?? fallbackContent;
  const sessions = new Map(), attempts = new Map(), accountFailures = new Map();
  let pendingLogins = 0;
  const cookieName = secureCookies ? '__Host-ziok-session' : 'ziok-local-session';
  const cookie = (value, age) => `${cookieName}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secureCookies ? '; Secure' : ''}`;
  function sessionFor(req) {
    const id = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
    const session = sessions.get(id);
    if (!session || session.expires <= Date.now()) { sessions.delete(id); return null; }
    return { id, ...session };
  }
  function update(actor, action, draft, published) {
    const next = { revision: state.revision + 1, draft, published, audit: [...state.audit, { at: new Date().toISOString(), actor, action, revision: state.revision + 1 }].slice(-1000) };
    persist(stateFile, next); state = next;
  }
  return http.createServer(async (req, res) => {
    for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
    if (hsts) res.setHeader('Strict-Transport-Security', hsts);
    try {
      const pathname = new URL(req.url, origin).pathname;
      const method = req.method;
      if (pathname.startsWith('/api/') || pathname === '/admin' || pathname.startsWith('/admin/')) { res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Robots-Tag', 'noindex, nofollow'); }
      if (method === 'POST' && req.headers.origin !== origin) return json(res, 403, { error: 'Origin not allowed' });
      if (pathname === '/api/admin/login' && method === 'POST') {
        let input; try { input = await body(req); } catch { return json(res, 400, { error: 'Invalid request' }); }
        const username = typeof input?.username === 'string' && /^[A-Za-z0-9_.-]{1,64}$/.test(input.username) ? input.username : '';
        const now = Date.now(), key = clientAddress(req, trustedProxies);
        for (const [id, entry] of attempts) if (entry.until <= now) attempts.delete(id);
        for (const [id, entry] of accountFailures) if (entry.until <= now) accountFailures.delete(id);
        // Per-account limit, keyed on the submitted name whether or not it exists, so a lock reveals nothing about which accounts are real.
        if ((accountFailures.get(username)?.count || 0) >= accountFailureLimit) return json(res, 429, { error: 'Try again later' });
        if (attempts.size >= 1000 && !attempts.has(key)) return json(res, 429, { error: 'Try again later' });
        const entry = attempts.get(key) || { count: 0, until: now + limitWindow };
        if (entry.count >= 20 || pendingLogins >= 4) return json(res, 429, { error: 'Try again later' });
        entry.count++; attempts.set(key, entry); pendingLogins++;
        const user = users.get(username);
        let valid; try { valid = await verifyPassword(input?.password, user?.passwordHash); } finally { pendingLogins--; }
        if (!user || !valid) {
          const failures = accountFailures.get(username) || { count: 0, until: now + limitWindow };
          if (failures.count > 0 || accountFailures.size < 1000) {
            failures.count++; accountFailures.set(username, failures);
            if (failures.count === accountFailureLimit) console.warn(`Sign-in for account "${username}" locked for 15 minutes after repeated failures`);
          }
          return json(res, 401, { error: 'Invalid credentials' });
        }
        attempts.delete(key); accountFailures.delete(username);
        for (const [id, session] of sessions) if (session.expires <= now) sessions.delete(id);
        if (sessions.size >= 1000) return json(res, 503, { error: 'Try again later' });
        const previous = sessionFor(req); if (previous) sessions.delete(previous.id);
        const id = token(); sessions.set(id, { username, role: user.role, csrf: token(), expires: now + ttl });
        res.setHeader('Set-Cookie', cookie(id, ttl / 1000)); return json(res, 200, { ok: true });
      }
      if (pathname.startsWith('/api/admin/')) {
        const session = sessionFor(req);
        if (!session) return json(res, 401, { error: 'Sign in required' });
        if (method === 'POST' && !equalToken(req.headers['x-csrf-token'], session.csrf)) return json(res, 403, { error: 'Invalid request token' });
        if (pathname === '/api/admin/session' && method === 'GET') return json(res, 200, { username: session.username, role: session.role, csrf: session.csrf });
        if (pathname === '/api/admin/state' && method === 'GET') return json(res, 200, { revision: state.revision, draft: state.draft, published: state.published !== null, audit: session.role === 'admin' ? state.audit.slice(-100).reverse() : [] });
        if (pathname === '/api/admin/network' && method === 'GET') {
          if (session.role !== 'admin') return json(res, 403, { error: 'Administrators only' });
          // Lets an administrator confirm the proxy settings: connectingAddress is the proxy to trust, clientAddress should be the visitor's own public address.
          return json(res, 200, { connectingAddress: clientAddress(req, parseTrustedProxies('')), clientAddress: clientAddress(req, trustedProxies), forwardedFor: req.headers['x-forwarded-for'] || null, trustedProxiesConfigured: trustedProxies.configured });
        }
        if (pathname === '/api/admin/backup' && method === 'GET') {
          if (session.role !== 'admin') return json(res, 403, { error: 'Administrators only' });
          const name = `ziok-content-r${state.revision}-${new Date().toISOString().slice(0, 10)}.json`;
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'no-store' });
          return res.end(JSON.stringify(state, null, 2));
        }
        if (pathname === '/api/admin/logout' && method === 'POST') { sessions.delete(session.id); res.setHeader('Set-Cookie', cookie('', 0)); return json(res, 200, { ok: true }); }
        if (method === 'POST' && ['/api/admin/save', '/api/admin/publish'].includes(pathname)) {
          const publish = pathname.endsWith('/publish');
          if (publish && session.role !== 'admin') return json(res, 403, { error: 'Only administrators can publish' });
          let input; try { input = await body(req); } catch { return json(res, 400, { error: 'Invalid request' }); }
          if (input?.revision !== state.revision) return json(res, 409, { error: 'Content changed; reload before editing' });
          let draft; try { draft = publish ? state.draft : validateContent(input.content); } catch (error) { return json(res, 400, { error: error.message || 'Invalid content' }); }
          update(session.username, publish ? 'publish' : 'save draft', draft, publish ? structuredClone(draft) : state.published);
          return json(res, 200, { revision: state.revision });
        }
        return json(res, 404, { error: 'Not found' });
      }
      if (method !== 'GET' && method !== 'HEAD') return json(res, 405, { error: 'Method not allowed' });
      if (pathname === '/public-content.js') {
        const script = `const ZIOK_CONTENT = ${JSON.stringify(state.published).replace(/</g, '\\u003c')};\n`
        const updated = `const ZIOK_UPDATED = ${JSON.stringify(latestPublishDate(state))};\n`;
        res.writeHead(200, { 'Content-Type': mime['.js'], 'Cache-Control': 'no-store' }); return res.end(method === 'HEAD' ? undefined : script + updated);
      }
      if (pathname === '/sitemap.xml') {
        // Published content is editable in the portal, so a publish counts as a real change to every page.
        const body = fullSitemap(fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8'), state, publicContent(), origin);
        return sendBody(req, res, { type: mime['.xml'], body, cacheControl: 'no-cache', etag: bodyTag(body), extension: '.xml' });
      }
      const generated = routeContentPage(pathname, publicContent(), { origin });
      if (generated) {
        return sendBody(req, res, { status: generated.status, type: mime['.html'], body: generated.html, cacheControl: 'no-cache', etag: bodyTag(generated.html), extension: '.html' });
      }
      if (pathname === '/admin' || pathname === '/admin/') return sendFile(req, res, path.join(__dirname, 'admin.html'), 'no-store');
      if (pathname === '/admin/admin.js' || pathname === '/admin/admin.css') return sendFile(req, res, path.join(__dirname, pathname.split('/').pop()), 'no-store');
      const name = pathname === '/' ? 'index.html' : pathname.slice(1);
      if (name === 'documents/ziok-constitution-september-2024.pdf' || name === 'documents/ziok-bylaws-september-2024.pdf' || /^documents\/(constitution\/page-[1-9]|bylaws\/page-(0[1-9]|1[0-2]))\.webp$/.test(name) || publicFiles.has(name)) return sendFile(req, res, path.join(root, name));
      return notFound(req, res, pathname);
    } catch (error) { console.error('Request failed:', error.code || error.name); if (!res.headersSent) json(res, 500, { error: 'Server error' }); else res.end(); }
  });
}
function resolveBindHost(value, insecure) {
  const host = value || '127.0.0.1';
  if (!['127.0.0.1', '0.0.0.0'].includes(host) || (insecure && host !== '127.0.0.1')) {
    throw new Error('Invalid ZIOK_BIND_HOST: use loopback for local mode or 0.0.0.0 behind a production reverse proxy');
  }
  return host;
}
// One week by default so a mistake is recoverable; raise ZIOK_HSTS_MAX_AGE to
// 31536000 once HTTPS is confirmed everywhere. 0 disables the header.
function hstsValue(env) {
  const raw = env.ZIOK_HSTS_MAX_AGE === undefined || env.ZIOK_HSTS_MAX_AGE === '' ? '604800' : env.ZIOK_HSTS_MAX_AGE;
  if (!/^\d{1,9}$/.test(raw)) throw new Error('Invalid ZIOK_HSTS_MAX_AGE');
  if (Number(raw) === 0) return '';
  return `max-age=${raw}${env.ZIOK_HSTS_INCLUDE_SUBDOMAINS === 'true' ? '; includeSubDomains' : ''}`;
}
if (require.main === module) {
  const insecure = process.env.ZIOK_INSECURE_LOCAL === 'true';
  const origin = process.env.ZIOK_PUBLIC_ORIGIN || (insecure ? 'http://127.0.0.1:8080' : '');
  const parsed = new URL(origin);
  if (parsed.origin !== origin || (!insecure && parsed.protocol !== 'https:') || (insecure && !['127.0.0.1', 'localhost'].includes(parsed.hostname))) throw new Error('Set an HTTPS public origin or use explicit local development mode');
  const port = Number(process.env.PORT || 8080);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  const users = parseUsers(process.env.ZIOK_USERS_JSON);
  const stateFile = path.resolve(process.env.ZIOK_STATE_FILE || path.join(root, 'var', 'content.json'));
  const trustedProxies = parseTrustedProxies(process.env.ZIOK_TRUSTED_PROXIES);
  if (!insecure && !trustedProxies.configured) console.warn('ZIOK_TRUSTED_PROXIES is not set: login limits use the connecting address, which is the proxy itself when deployed behind one.');
  const server = createApp({ users, stateFile, origin, secureCookies: !insecure, trustedProxies, hsts: insecure ? '' : hstsValue(process.env) });
  const host = resolveBindHost(process.env.ZIOK_BIND_HOST, insecure);
  server.listen(port, host, () => console.log(host === '127.0.0.1' ? `ZIOK server listening on loopback port ${port}` : `ZIOK server listening on ${host}:${port}`));
}
module.exports = { createApp, resolveBindHost, hstsValue, securityHeaders: headers };
module.exports.sitemapWithPublishDate = sitemapWithPublishDate;
