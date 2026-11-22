# Performance notes

- **Compression**: the Node server serves HTML, CSS, JS, XML, TXT and JSON with brotli (preferred) or gzip, honoring `Accept-Encoding` including `q=0`. Compressed bodies are cached in memory per file version.
- **Caching**: weak ETag + Last-Modified with `304 Not Modified`. Policy: `documents/` 30 days, images/icons 7 days, everything else `no-cache` (always revalidated, so edits show immediately). `_headers` mirrors this for static hosts.
- **Images**: document pages are lossless WebP (pixel-identical to the originals, each under 150 KB). The reader loads them with a `?v=` query so a change busts the cache.
- **CSS**: inline `<style>` blocks were moved into shared files (`base.css`, `directory.css`, per-page files), so styles are cached once and CSP can use `style-src 'self'`.
- **Print**: `print.css` (loaded with `media="print"`, so it costs nothing on screen) gives the directory, leadership and governance pages a clean two-column printout with no navigation, search or buttons. The business directory prints on 3 pages instead of 7.

## Measured first-visit weight (cold cache, HTML + CSS + JS + images)

| Page | Before (main) | After, brotli | After, gzip |
|---|---|---|---|
| index | 49.0 KB | 21.4 KB | 24.1 KB |
| businesses | 51.6 KB | 21.4 KB | 24.3 KB |
| leadership | 52.7 KB | 21.7 KB | 24.4 KB |
| governance | 49.4 KB | 21.0 KB | 23.5 KB |

Clients that send no `Accept-Encoding` get uncompressed files, about 7% more than before because styles are now separate files; repeat visits hit the cache.
