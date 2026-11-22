# Search and sharing guide

## What the site provides

- A unique title (65 characters or fewer) and description on every public page, with a canonical URL.
- Open Graph and Twitter card tags using `ziok-social.jpg` (1200 × 630), so links shared on Facebook, messaging apps and similar services show the seal, the name and a short description.
- Structured data (JSON-LD): an `NGO` organization record and a `WebSite` record on the home page, and a breadcrumb on each inner page. The organization record carries the legal name, the alternate names ZIOK and Zomi Community Oklahoma, the logo, the Tulsa address and the contact email.
- Favicons search engines can read: `favicon.ico` at the site root, 48 px and 192 px PNGs (Google asks for multiples of 48 px) and an Apple touch icon. The older 160 px WebP remains for the page header logo.
- `sitemap.xml` with a `lastmod` for each page, and `X-Robots-Tag: noindex, nofollow` on `/admin` and `/api/`. `reader.html` and `404.html` stay `noindex`.

## Sitemap dates

Dates change only when a page really changes, never because time passed.

- **Static changes:** after editing a page or its data, run `node scripts/update-sitemap.cjs` and commit `sitemap.xml`. Each page's date comes from git history of that page's own files (listed in the script); files with uncommitted edits count as today.
- **Published content:** the server raises every date to the date of the most recent **publish** in the administrator portal. Saving drafts does not change dates. Dates are never lowered.

## When the logo or name changes

Run `python3 scripts/build-brand-assets.py` (needs Pillow) to rebuild `ziok-social.jpg` and the favicons from `ziok-logo.png`, then commit the results.

## After deploying

1. **Search Console:** open the property, go to Sitemaps and submit `https://ziok.org/sitemap.xml` if it is not listed. Use URL Inspection on the home page and choose Request indexing. Search results can take days or weeks to show new titles, descriptions and favicons.
2. **Facebook:** paste `https://ziok.org/` into the Sharing Debugger and choose Scrape Again, because Facebook caches the earlier preview.
3. **Rich results:** run the home page through Google's Rich Results Test to confirm the structured data is read without errors.
4. **Check the favicon:** open `https://ziok.org/favicon.ico` directly.

## Known limits (planned next)

- News, events and directories are drawn in the browser from published content. Search engines can render this, but they cannot link to an individual news item or event until those get their own pages.
- Zomi text appears only after a visitor switches language, so search engines see English. Separate Zomi pages with `hreflang` would fix that. Google's `hreflang` expects two-letter language codes where they exist; Tedim Chin (`ctd`) has only a three-letter code, so test how it is handled before relying on it.
- The organization record has no `sameAs` links yet, because the Facebook and YouTube addresses are set in the administrator portal rather than in the page source.
