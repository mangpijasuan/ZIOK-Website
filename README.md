# Zomi Innkuan Oklahoma, Inc. website

Complete static website export, November 20, 2026. The HTML, CSS and JavaScript run without a build step or package installation.

## Run locally

1. Extract the ZIP file.
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

This is the current static application. Media settings are saved in the visitor's browser. Automatic Facebook and YouTube synchronization is not yet enabled; it requires a backend and authorized API access. Online membership, donations, and account management are not enabled. No hosting credentials, tokens or API keys are included.

Developer: MJ — https://mangpijasuan.github.io/MJ/
