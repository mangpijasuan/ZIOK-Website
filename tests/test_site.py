import re
import subprocess
import unittest
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote

ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.ids, self.links, self.options, self.scripts = [], [], [], []
        self.inline = False
        self.json_ld_open = False
        self.json_ld = []
        self.feed(path.read_text())

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        for key in ('href', 'src'):
            if key in attrs:
                self.links.append(attrs[key])
        if tag == 'option':
            self.options.append(attrs)
        if tag == 'script' and 'src' not in attrs:
            if attrs.get('type') == 'application/ld+json':
                self.json_ld_open = True
            else:
                self.inline = True

    def handle_endtag(self, tag):
        if tag == 'script':
            self.inline = False
            self.json_ld_open = False

    def handle_data(self, data):
        if self.inline:
            self.scripts.append(data)
        elif self.json_ld_open:
            self.json_ld.append(data)


class SiteTests(unittest.TestCase):
    def test_links_and_page_ids(self):
        for file in ROOT.glob('*.html'):
            page = Page(file)
            self.assertEqual(len(page.ids), len(set(page.ids)), file.name)
            for link in page.links:
                url = urlsplit(link)
                if url.scheme or url.netloc:
                    continue
                # 404.html is served at any URL depth, so it must use root-absolute links.
                if url.path:
                    self.assertEqual(url.path.startswith('/'), file.name == '404.html', (file.name, link))
                target = file.parent / unquote(url.path.lstrip('/')) if url.path else file
                self.assertTrue(target.is_file(), (file.name, link))
                if url.fragment and target.suffix == '.html':
                    self.assertIn(url.fragment, Page(target).ids, (file.name, link))

    def test_all_document_assets(self):
        for section, count, padding in [('constitution', 9, 1), ('bylaws', 12, 2)]:
            pdf = ROOT / 'documents' / f'ziok-{section}-september-2024.pdf'
            self.assertTrue(pdf.read_bytes().startswith(b'%PDF'))
            for number in range(1, count + 1):
                image = ROOT / 'documents' / section / f'page-{number:0{padding}d}.webp'
                data = image.read_bytes()
                self.assertEqual((data[:4], data[8:12]), (b'RIFF', b'WEBP'), image.name)
                self.assertLess(len(data), 150_000, image.name)

    def test_javascript_syntax(self):
        for file in ROOT.glob('*.js'):
            subprocess.run(['node', '--check', str(file)], check=True)
        for file in ROOT.glob('*.html'):
            for script in Page(file).scripts:
                subprocess.run(['node', '--check'], input=script, text=True, check=True)

    def test_category_options_have_stable_values(self):
        page = Page(ROOT / 'businesses.html')
        self.assertTrue(all('value' in option for option in page.options))
        self.assertIn('Markets', [opt['value'] for opt in page.options])

    def test_media_queries_and_metadata(self):
        for file in ROOT.glob('*.html'):
            source = file.read_text()
            self.assertNotRegex(source, r'(?<!@media)\((?:min|max)-width:')
            self.assertIn('name="description"', source)
            self.assertIn('class="skip-link"', source)
            self.assertIn('href="/shared.css"' if file.name == '404.html' else 'href="shared.css"', source)
            self.assertNotRegex(source, r'\son[a-z]+\s*=')

    def test_copyright_year_updates_on_every_page_with_a_footer(self):
        navigation = (ROOT / 'navigation.js').read_text()
        self.assertIn('data-copyright-year', navigation)
        for file in ROOT.glob('*.html'):
            source = file.read_text()
            if 'data-copyright-year' in source:
                self.assertIn('navigation.js', source, file.name)
        self.assertIn('data-copyright-year', (ROOT / '404.html').read_text())

    def test_directory_notices_have_zomi_translations(self):
        locale = (ROOT / 'locale.js').read_text()
        for name in ('businesses', 'churches', 'villages'):
            source = (ROOT / f'{name}.html').read_text()
            for sentence in re.findall(r'<p class="note">(.*?)</p>', source):
                for text in re.findall(r'<span>(.*?)</span>', sentence):
                    self.assertIn(f"'{text}':", locale, (name, text))

    PUBLIC_PAGES = ['index', 'leadership', 'governance', 'businesses', 'churches', 'villages']

    @staticmethod
    def meta(source, key, value):
        found = re.search(r'<meta %s="%s" content="([^"]*)"' % (key, re.escape(value)), source)
        return found.group(1) if found else None

    @staticmethod
    def jpeg_size(path):
        data = path.read_bytes()
        assert data[:2] == b'\xff\xd8'
        index = 2
        while index < len(data):
            marker = data[index + 1]
            length = int.from_bytes(data[index + 2:index + 4], 'big')
            if marker in (0xC0, 0xC1, 0xC2):
                return int.from_bytes(data[index + 7:index + 9], 'big'), int.from_bytes(data[index + 5:index + 7], 'big')
            index += 2 + length
        raise AssertionError('no JPEG size')

    def test_search_and_sharing_metadata(self):
        titles, descriptions = set(), set()
        for name in self.PUBLIC_PAGES:
            source = (ROOT / f'{name}.html').read_text()
            title = re.search(r'<title>([^<]*)</title>', source).group(1)
            description = self.meta(source, 'name', 'description')
            self.assertLessEqual(len(title), 65, name)
            self.assertTrue(70 <= len(description) <= 165, (name, len(description)))
            self.assertNotIn(title, titles, 'duplicate title')
            self.assertNotIn(description, descriptions, 'duplicate description')
            titles.add(title); descriptions.add(description)
            url = 'https://ziok.org/' + ('' if name == 'index' else f'{name}.html')
            self.assertIn(f'<link rel="canonical" href="{url}">', source, name)
            self.assertEqual(self.meta(source, 'property', 'og:url'), url)
            self.assertEqual(self.meta(source, 'property', 'og:title'), title)
            self.assertEqual(self.meta(source, 'property', 'og:description'), description)
            self.assertEqual(self.meta(source, 'property', 'og:image'), 'https://ziok.org/ziok-social.jpg')
            self.assertEqual(self.meta(source, 'name', 'twitter:card'), 'summary_large_image')
            self.assertEqual(self.meta(source, 'name', 'twitter:image'), 'https://ziok.org/ziok-social.jpg')
            self.assertTrue(self.meta(source, 'property', 'og:image:alt'))
            self.assertNotIn('noindex', source)

    def test_sharing_image_and_icons(self):
        image = ROOT / 'ziok-social.jpg'
        self.assertEqual(self.jpeg_size(image), (1200, 630))
        self.assertLess(image.stat().st_size, 300_000)
        for name, size in (('favicon-48.png', 48), ('favicon-192.png', 192), ('apple-touch-icon.png', 180)):
            data = (ROOT / name).read_bytes()
            self.assertTrue(data.startswith(b'\x89PNG\r\n\x1a\n'), name)
            self.assertEqual(int.from_bytes(data[16:20], 'big'), size, name)
        self.assertEqual((ROOT / 'favicon.ico').read_bytes()[:4], b'\x00\x00\x01\x00')
        for file in ROOT.glob('*.html'):
            source = file.read_text()
            if file.name == '404.html':
                continue
            for href in ('favicon.ico', 'favicon-192.png', 'apple-touch-icon.png'):
                self.assertIn(f'href="{href}"', source, (file.name, href))

    def test_structured_data(self):
        import json
        home = Page(ROOT / 'index.html')
        graph = json.loads(''.join(home.json_ld))['@graph']
        kinds = {item['@type']: item for item in graph}
        organization = kinds['NGO']
        self.assertEqual(organization['@id'], 'https://ziok.org/#organization')
        self.assertEqual(organization['url'], 'https://ziok.org/')
        self.assertEqual(organization['address']['addressLocality'], 'Tulsa')
        self.assertTrue((ROOT / organization['logo']['url'].rsplit('/', 1)[1]).is_file())
        self.assertEqual(kinds['WebSite']['publisher'], {'@id': organization['@id']})
        for name in self.PUBLIC_PAGES[1:]:
            data = json.loads(''.join(Page(ROOT / f'{name}.html').json_ld))
            self.assertEqual(data['@type'], 'BreadcrumbList')
            self.assertEqual([item['position'] for item in data['itemListElement']], [1, 2])
            self.assertEqual(data['itemListElement'][1]['item'], f'https://ziok.org/{name}.html')

    def test_sitemap_lists_every_indexable_page_with_a_real_date(self):
        sitemap = (ROOT / 'sitemap.xml').read_text()
        locs = re.findall(r'<loc>([^<]*)</loc>', sitemap)
        expected = ['https://ziok.org/' + ('' if name == 'index' else f'{name}.html') for name in self.PUBLIC_PAGES]
        self.assertEqual(sorted(locs), sorted(expected))
        dates = re.findall(r'<lastmod>(\d{4}-\d{2}-\d{2})</lastmod>', sitemap)
        self.assertEqual(len(dates), len(locs))
        self.assertEqual(sitemap.count('<lastmod>'), len(locs))

    def test_styles_live_in_stylesheets_so_the_policy_can_forbid_inline_styles(self):
        for file in ROOT.glob('*.html'):
            source = file.read_text()
            self.assertNotIn('<style', source, file.name)
            self.assertNotRegex(source, r'\sstyle\s*=', file.name)
        headers = (ROOT / '_headers').read_text()
        self.assertIn("style-src 'self';", headers)
        self.assertNotIn("'unsafe-inline'", headers)

    def test_print_stylesheet_is_linked_from_the_printable_pages(self):
        css = (ROOT / 'print.css').read_text()
        self.assertIn('@media print', css)
        for name in ('leadership', 'governance', 'businesses', 'churches', 'villages'):
            self.assertIn('<link rel="stylesheet" href="print.css" media="print">', (ROOT / f'{name}.html').read_text(), name)

    def test_shared_rules_are_not_repeated_in_page_stylesheets(self):
        directory = ROOT / 'directory.css'
        self.assertTrue(directory.is_file())
        shared = [rule for rule in directory.read_text().splitlines() if rule and not rule.startswith('/*')]
        self.assertTrue(shared)
        for name in ('businesses', 'churches', 'villages'):
            page = (ROOT / f'{name}.html').read_text()
            self.assertIn('href="directory.css"', page)
            self.assertLess(page.index('href="directory.css"'), page.index(f'href="{name}.css"'), 'shared rules load first')
            own = set((ROOT / f'{name}.css').read_text().splitlines())
            self.assertFalse([rule for rule in shared if rule in own], name)
        for name in ('index',):
            self.assertNotIn('directory.css', (ROOT / f'{name}.html').read_text())

    def test_optimized_logo(self):
        logo = ROOT / 'ziok-logo-160.webp'
        self.assertEqual(logo.read_bytes()[8:12], b'WEBP')
        self.assertLess(logo.stat().st_size, 20_000)
        self.assertTrue((ROOT / 'ziok-logo.png').is_file())


if __name__ == '__main__':
    unittest.main(verbosity=2)
