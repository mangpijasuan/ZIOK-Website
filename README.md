# Zomi Innkuan Oklahoma, Inc. website

Complete static website export, November 20, 2026. The HTML, CSS and JavaScript run without a build step or package installation.

## Run locally

1. Clone the repository or extract the ZIP file.
2. Open a terminal in `ZIOK-Website`.
3. Run `python -m http.server 8000` (or `python3 -m http.server 8000`).
4. Visit `http://localhost:8000` in your browser.

Use a local HTTP server rather than opening the HTML as a file so navigation and local language preferences work consistently.

## Deploy to ziok.org

Upload the contents of this folder to the document root of any static web host (for example, Nginx, Apache, GitHub Pages on an appropriate custom domain, or Cloudflare Pages). Set `index.html` as the home page. Preserve the `documents/` folder structure and all assets. Configure your domain DNS and HTTPS through your hosting provider.

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
- On GitHub Pages, serve the root of the branch and configure `ziok.org` only when the domain is ready. Relative links also support a repository subpath.
- `robots.txt` and `sitemap.xml` assume `https://ziok.org/` is the final public address; update them if it changes.
- Before launch, enable HTTPS and configure host-supported security headers (including a suitable Content Security Policy, allowing the approved YouTube embed if used), verify content publication permissions, and review directory contact details. These are hosting and organizational tasks, not automatically enabled by this static repository.

Developer: MJ — https://mangpijasuan.github.io/MJ/
