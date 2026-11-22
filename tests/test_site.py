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
            self.inline = True

    def handle_endtag(self, tag):
        if tag == 'script':
            self.inline = False

    def handle_data(self, data):
        if self.inline:
            self.scripts.append(data)


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
                image = ROOT / 'documents' / section / f'page-{number:0{padding}d}.png'
                self.assertTrue(image.read_bytes().startswith(b'\x89PNG\r\n\x1a\n'), image.name)

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

    def test_optimized_logo(self):
        logo = ROOT / 'ziok-logo-160.webp'
        self.assertEqual(logo.read_bytes()[8:12], b'WEBP')
        self.assertLess(logo.stat().st_size, 20_000)
        self.assertTrue((ROOT / 'ziok-logo.png').is_file())


if __name__ == '__main__':
    unittest.main(verbosity=2)
