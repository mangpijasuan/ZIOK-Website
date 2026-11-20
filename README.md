# Zomi Innkuan Oklahoma, Inc. website

Complete static website export, November 20, 2026. The HTML, CSS and JavaScript run without a build step or package installation.

## Run locally

1. Clone the repository or extract the ZIP file.
2. Open a terminal in `ZIOK-Website`.
3. Run `python -m http.server 8000` (or `python3 -m http.server 8000`).
4. Visit `http://localhost:8000` in your browser.

Use a local HTTP server rather than opening the HTML as a file so navigation and local language preferences work consistently.

## Deploy to ziok.org

For static hosting, publish the public HTML, JavaScript, CSS, logo, `robots.txt`, `sitemap.xml`, `_headers` (for compatible hosts) and `documents/` assets. Set `index.html` as the home page. Do not upload local configuration, `var/`, `.env` files, or administrator server files. Configure your domain DNS and HTTPS through your hosting provider. The optional administrator portal below requires a Node host instead of static-only hosting.

## Contents

- `index.html`: community homepage, events, contact information and media setup
- `leadership.html`: board of directors and terms
- `businesses.html`, `businesses.js`: 42 business listings
- `churches.html`, `churches.js`: 18 church listings
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

The static deployment remains supported; the portal requires the optional Node server. It is not available on GitHub Pages or other static-only hosting. The portal supports English/Zomi news and event drafts, public media configuration, editor/admin roles, explicit publication, revision conflict detection, and recent audit history. Directory, leadership, governance document management and automatic social synchronization are future modules.

For each officer, create a unique password hash using `node server/hash-password.cjs` with the password supplied through stdin (use a protected terminal input; never put a password on a command line). Each account must have a unique username, role `admin` or `editor`, and the resulting `passwordHash`. Supply these values via the protected `ZIOK_USERS_JSON` environment variable as a JSON array; do not commit the configuration. At least one admin is required. No default account or password is provided.

Local development: set `ZIOK_INSECURE_LOCAL=true`, `ZIOK_PUBLIC_ORIGIN=http://127.0.0.1:8080`, and the account configuration, then run `npm start`. Visit `http://127.0.0.1:8080/admin`. Never enable local development mode in production.

Production: set `ZIOK_PUBLIC_ORIGIN=https://ziok.org`, configure the `ZIOK_USERS_JSON` environment secret, and set `ZIOK_STATE_FILE` to a protected persistent location outside the web root. Run `npm start` behind an HTTPS reverse proxy that forwards the site to loopback port 8080. The service binds only to loopback; configure HTTPS, HSTS and request limits at the proxy. The public content script is served from the last published state; draft updates remain private. Cookie sessions expire after eight hours and are invalidated by server restarts. The app uses same-origin requests, CSRF checks, password hashing, role checks, login limits and an explicit public-file allowlist.

This is a single-process deployment: do not run multiple replicas against the same JSON file. Back up the state file regularly and restrict its filesystem access. Audit history retains the most recent 1,000 state changes; configure external archival if needed. The built-in IP login limit applies to the proxy's source address, so configure appropriate proxy-side rate limits as well. Before production, complete a security review, account recovery and rotation procedures, and a manual administrator workflow test. A managed identity provider with MFA is recommended for a full production deployment.

Run `npm run test:server` to validate authentication, editing roles, draft/publish isolation, audit and persistence.

Developer: MJ — https://mangpijasuan.github.io/MJ/
