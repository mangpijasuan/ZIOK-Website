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

## News and event pages

Every news item and event has its own public page, built by the Node server from the published content (or the original content until something is published). Static-only hosting cannot serve these pages; the Coolify deployment can.

| Address | Content |
|---|---|
| `/news/`, `/events/` | Lists of all items |
| `/news/<page-name>`, `/events/<page-name>` | One item, in English |
| `/zo/news/...`, `/zo/events/...` | The same pages in Zomi |

In the administrator portal, each news item and event has these extra fields:

- **Page name:** the last part of the address. Leave it blank and one is made from the English title. Once saved it never changes when the title changes, so shared links and search results keep working. Use lowercase letters, numbers and hyphens.
- **Published date** (news) and **Start date** (events): `YYYY-MM-DD`. Optional. Real dates are what let Google show a news article's date or list an event.
- **Location** (events): optional free text, such as "Tulsa, Oklahoma" or a venue and address.

What search engines receive:

- Each page has its own title, description, canonical address and sharing tags, plus a breadcrumb. News with a date also carries `NewsArticle` data. An event carries `Event` data only when it has both a start date and a location, because Google's event listings require both. The card label (for example "FEB 20") is display text only.
- A Zomi page exists only when the item has a Zomi title or Zomi text; otherwise `/zo/...` answers 404 and the item is left out of the Zomi list and the sitemap. English and Zomi versions point at each other with `hreflang`, and the English page is the default.
- The sitemap lists every generated page. A news item's date is its own published date; everything else uses the date of the latest publish. Items disappear from the sitemap when they are removed and published.
- On the home page, each card title links to its page, with "View all" links to the two lists. These links appear once content has been published from the portal.

### Zomi wording to confirm

Zomi interface words on the generated pages come from the site's existing glossary (Abulpi, Thuthak, Pawite, Makaihna, Laite, Kizopna and the news and events headings). Words with no glossary entry are shown in English and marked `lang="en"`: published, date, location, all news, all events, read more, skip to content, and the empty-list messages. Add reviewed translations to the `zo` table at the top of `server/pages.cjs` and they take effect automatically. The home page's "View all news / View all events" links use draft Zomi wording ("Thuthak khempeuh en in", "Pawite khempeuh en in") that a Zomi reader should confirm.

### Language codes

The Zomi pages are tagged `ctd` (Tedim Chin). Google's `hreflang` guidance prefers two-letter codes where they exist, and `ctd` has only a three-letter code. Pages are still indexable and the English pages are unaffected, but check in Search Console (International Targeting and the page indexing report) that the alternates are accepted. If they are not, the pages remain valid as stand-alone Zomi pages.

## Known limits

- The six static pages (home, leadership, documents and the three directories) remain single English addresses with the browser language switch. Their Zomi text is added in the browser, so search engines mostly see English there. Zomi addresses for these pages would be a further step.
- Directories, leadership and the home-page cards are still drawn in the browser from published content; search engines can render them, but individual directory entries have no pages of their own.
- Event times and online events are not modelled yet; events are dated by day.
- The organization record has no `sameAs` links yet, because the Facebook and YouTube addresses are set in the administrator portal rather than in the page source.
