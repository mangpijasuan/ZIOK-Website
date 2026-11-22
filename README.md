# Zomi Innkuan Oklahoma, Inc. website

The public website runs without a build step. For the full experience, including the administrator dashboard and persistent content, run the Node.js server.

## Run locally (recommended: full website and admin portal)

Prerequisites: Git and Node.js 22 or newer (including npm). Production (Docker) and CI run Node 24, pinned in `.nvmrc`; the code is tested on 22 and 24.

### 1. Clone the repository

```sh
git clone https://github.com/mangpijasuan/ZIOK-Website.git
cd ZIOK-Website
```

If you already cloned it, open a terminal in that folder and run `git pull origin main`.

### 2. Configure a local test administrator and start the server

**Windows (PowerShell)**

```powershell
$credential = [PSCredential]::new("admin", (Read-Host "Choose a local test password (14+ characters)" -AsSecureString))
$hash = $credential.GetNetworkCredential().Password | node server/hash-password.cjs
Remove-Variable credential
$env:ZIOK_USERS_JSON = ConvertTo-Json -Compress -InputObject @(
    @{ username = "admin"; role = "admin"; passwordHash = $hash }
)
$env:ZIOK_INSECURE_LOCAL = "true"
$env:ZIOK_PUBLIC_ORIGIN = "http://127.0.0.1:3000"
$env:PORT = "3000"
$env:ZIOK_STATE_FILE = Join-Path (Get-Location) "var/test-content.json"
npm start
```

**macOS / Linux (Bash)**

```bash
read -rs -p "Choose a local test password (14+ characters): " ziok_password
printf '\n'
ziok_hash=$(printf '%s' "$ziok_password" | node server/hash-password.cjs)
unset ziok_password
export ZIOK_USERS_JSON=$(node -e 'process.stdout.write(JSON.stringify([{username:"admin",role:"admin",passwordHash:process.argv[1]}]))' "$ziok_hash")
export ZIOK_INSECURE_LOCAL=true
export ZIOK_PUBLIC_ORIGIN=http://127.0.0.1:3000
export PORT=3000
export ZIOK_STATE_FILE="$PWD/var/test-content.json"
npm start
```

Use a unique local test password of 14–256 characters. Do not reuse production credentials or commit the account configuration.

### 3. Open the website

- Public website: http://127.0.0.1:3000
- Administrator portal: http://127.0.0.1:3000/admin
- Username: `admin`
- Password: the local password you chose above.

Keep the terminal open while testing. The expected startup message is `ZIOK server listening on loopback port 3000`. Save and publish content through the administrator portal; test changes persist in `var/test-content.json`.

If port 3000 is occupied, change both `PORT` and `ZIOK_PUBLIC_ORIGIN` to another unused port and open the matching URL. If the browser refuses the connection, check that `npm start` is still running. Always use the exact configured origin for administrator sign-in.

### 4. Update the running website

Stop the server with Ctrl+C, then run these commands in the same terminal:

```sh
git switch main
git pull origin main
npm start
```

Refresh the browser (Ctrl+F5). A new terminal requires the local environment configuration above again. Keep the same state-file path to preserve your saved content.

## Run locally (public-only static preview)

For a public-only preview without admin editing, Python 3 is sufficient:

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Open http://127.0.0.1:8000. Use `python3` if needed. This is a local preview only; never expose a general-purpose directory server to the public internet.

## Deploy to ziok.org

For static hosting, publish the public HTML, JavaScript, CSS, logo, `robots.txt`, `sitemap.xml`, `_headers` (for compatible hosts) and `documents/` assets. Set `index.html` as the home page. Do not upload local configuration, `var/`, `.env` files, or administrator server files. Configure your domain DNS and HTTPS through your hosting provider. The optional administrator portal below requires a Node host instead of static-only hosting.

Production settings (trusted proxy for login limits, HSTS, backups and restore, directory listing requests) are documented in [docs/OPERATIONS.md](docs/OPERATIONS.md).

Search, sharing and sitemap maintenance are described in [docs/SEO.md](docs/SEO.md).

## Contents

- `index.html`: community homepage, events, contact information and media setup
- `leadership.html`: board of directors and terms
- `businesses.html`, `businesses.js`: 42 business listings
- `churches.html`, `churches.js`: 21 church listings
- `villages.html`, `villages.js`: 49 village associations
- `governance.html`, `reader.html`, `reader.js`: document directory and page reader
- `documents/`: original constitution and bylaws PDFs and all 21 rendered pages
- `locale.js`: shared English/Zomi translations and language preference
- `ziok-logo.png`: official organization logo

## Current limitations

This is a static application. Official public media links are configured centrally in `media-config.js`, committed through GitHub, and published on deployment. Leave unconfirmed values empty. Never include private credentials in this file. Automatic Facebook and YouTube synchronization requires a backend and authorized API access. Online membership, donations, and account management are not enabled. No hosting credentials, tokens or API keys are included.

## Validation and deployment checklist

- Run `python -m unittest discover -s tests -v` with Python 3 and Node.js installed. GitHub Actions runs the same checks on pushes and pull requests.
- Run `npm ci`, `npx playwright install chromium`, and `npm run test:browser` for Chromium browser regression tests. The suite uses a temporary local HTTP server and checks both desktop and mobile layouts, navigation, localization, search, dialogs, and governance documents. GitHub Actions runs these tests automatically.
- Verify the site at desktop and mobile widths and in English and Zomi, including both document readers and directory filters.
- The browser suite also checks machine-detectable WCAG A/AA issues using axe-core. Automated scans are not a certification; manually review keyboard operation, screen-reader experience, contrast under all states, and the accessibility of the original governance PDFs.
- The original logo remains available as `ziok-logo.png`; the interface uses the optimized `ziok-logo-160.webp`. Shared accessibility and language-control styles live in `shared.css`.
- On GitHub Pages, serve the root of the branch and configure `ziok.org` only when the domain is ready. Relative links also support a repository subpath.
- `robots.txt` and `sitemap.xml` assume `https://ziok.org/` is the final public address; update them if it changes.
- Canonicals and Open Graph URLs assume the same production domain. The image-based document reader is marked `noindex` in favor of the governance landing page. The language switch is client-side; separate indexable Zomi URLs and `hreflang` are not yet implemented.
- Cloudflare Pages can use the included `_headers` file for the static site. GitHub Pages does not apply this file; configure equivalent headers at a compatible host or reverse proxy. The policy permits the approved privacy-enhanced YouTube embed and existing inline CSS, but no inline scripts. Test the actual deployed response headers and media before launch.
- Before launch, enable HTTPS and configure host-supported security headers (including a suitable Content Security Policy, allowing the approved YouTube embed if used), verify content publication permissions, and review directory contact details. These are hosting and organizational tasks, not automatically enabled by this static repository.

## Optional administrator portal (Node.js 22+)

The static deployment remains supported; the portal requires the optional Node server. It is not available on GitHub Pages or other static-only hosting. The portal supports English/Zomi news and event drafts, public media configuration, business/church/village directories, board terms and members, governance document notes, editor/admin roles, explicit publication, revision conflict detection, and recent audit history. The official governance PDFs and page images remain immutable in this release; replacing an approved document or rendering a new version requires a reviewed repository update. Automatic social synchronization remains a future module.

The original 42 businesses, 21 churches, 49 village associations and 14 board members are seeded from `community-data.js`. Phase 4 persisted state is migrated on startup without discarding previously saved homepage content. The updated church directory replaces the untouched original church seed; custom administrator church edits are preserved. Directory and leadership edits share the same private draft and administrator-only publication workflow. Confirm that names, contact details and any new governance notes have organizational approval before publishing.

For each officer, create a unique password hash using `node server/hash-password.cjs` with the password supplied through stdin (use a protected terminal input; never put a password on a command line). Each account must have a unique username, role `admin` or `editor`, and the resulting `passwordHash`. Supply these values via the protected `ZIOK_USERS_JSON` environment variable as a JSON array; do not commit the configuration. At least one admin is required. No default account or password is provided.

Local development: follow the full local setup above. Never enable local development mode in production.

Production: set `ZIOK_PUBLIC_ORIGIN=https://ziok.org`, configure the `ZIOK_USERS_JSON` environment secret, and set `ZIOK_STATE_FILE` to a protected persistent location outside the web root. Run `npm start` behind an HTTPS reverse proxy that forwards the site to loopback port 8080. The service binds to loopback by default; configure HTTPS, HSTS and request limits at the proxy. For a containerized Coolify deployment, set `ZIOK_BIND_HOST=0.0.0.0`, `PORT=8080`, `ZIOK_INSECURE_LOCAL=false`, and use the container’s internal port 8080 behind Traefik without publishing a direct host port. Set `ZIOK_STATE_FILE=/app/var/content.json` and mount a persistent volume at `/app/var`. Local insecure mode always requires loopback. The public content script is served from the last published state; draft updates remain private. Cookie sessions expire after eight hours and are invalidated by server restarts. The app uses same-origin requests, CSRF checks, password hashing, role checks, login limits and an explicit public-file allowlist.

This is a single-process deployment: do not run multiple replicas against the same JSON file. Back up the state file regularly and restrict its filesystem access. Audit history retains the most recent 1,000 state changes; configure external archival if needed. The built-in IP login limit applies to the proxy's source address, so configure appropriate proxy-side rate limits as well. Before production, complete a security review, account recovery and rotation procedures, and a manual administrator workflow test. A managed identity provider with MFA is recommended for a full production deployment.

Run `npm run test:server` to validate authentication, editing roles, draft/publish isolation, audit and persistence.

## License

The original website software and developer-authored technical documentation are licensed under the [MIT License](LICENSE), copyright © 2026 Mangpi Jasuan.

The license does not grant rights to use Zomi Innkuan Oklahoma, Inc.'s name, official logo or seal, constitution and bylaws, community directory records, photographs, or other organizational and third-party content. These retain their applicable ownership and permissions. Third-party software dependencies remain subject to their respective licenses.

Developer: MJ — https://mangpijasuan.github.io/MJ/
