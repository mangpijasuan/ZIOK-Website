const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');
const os = require('node:os');
const { createApp } = require('../server/app.cjs');
const { hashPassword, parseUsers } = require('../server/auth.cjs');

const root = path.resolve(__dirname, '..');
const prefix = '/ZIOK-Website/';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.pdf': 'application/pdf' };
let server, browser, base;

before(async () => {
  // Exercise GitHub Pages-style subpath hosting instead of only the root URL.
  server = http.createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      if (!pathname.startsWith(prefix)) { res.writeHead(404).end(); return; }
      const relative = decodeURIComponent(pathname.slice(prefix.length)) || 'index.html';
      const file = path.resolve(root, relative);
      if (!file.startsWith(root + path.sep) || !types[path.extname(file)]) { res.writeHead(404).end(); return; }
      const data = await fs.readFile(file);
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] });
      res.end(data);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}${prefix}`;
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

async function withPage(viewport, run) {
  const context = await browser.newContext({ viewport });
  try {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.url().startsWith(base) && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
    });
    await run(page);
    assert.deepEqual(errors, [], 'No JavaScript errors or failed local resources');
  } finally { await context.close(); }
}

async function open(page, file) {
  const response = await page.goto(base + file, { waitUntil: 'load' });
  assert.equal(response.status(), 200);
}

async function textIs(page, selector, text) {
  await page.waitForFunction(({ selector, text }) => document.querySelector(selector)?.textContent.trim() === text, { selector, text });
}

async function imageLoaded(page) {
  await page.waitForFunction(() => {
    const image = document.getElementById('page-image');
    return image.complete && image.naturalWidth > 0;
  });
}

const desktop = { width: 1440, height: 900 };
const mobile = { width: 390, height: 844 };
const pages = ['index.html', 'leadership.html', 'businesses.html', 'churches.html', 'villages.html', 'governance.html', 'reader.html?doc=constitution', 'reader.html?doc=bylaws'];

test('administrator can sign in, save bilingual draft and publish it', async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'ziok-browser-'));
  const password = 'test-only-password-for-browser';
  const users = parseUsers(JSON.stringify([{ username: 'officer', role: 'admin', passwordHash: await hashPassword(password) }]));
  const origin = 'http://127.0.0.1:18659';
  const adminServer = createApp({ users, stateFile: path.join(folder, 'content.json'), origin, secureCookies: false });
  let context;
  try {
    await new Promise((resolve, reject) => { adminServer.once('error', reject); adminServer.listen(18659, '127.0.0.1', resolve); });
    context = await browser.newContext({ viewport: desktop });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/admin');
    await page.locator('#username').fill('officer');
    await page.locator('#password').fill(password);
    await page.locator('#login button').click();
    await page.locator('#dashboard').waitFor({ state: 'visible' });
    await textIs(page, '[data-count="businesses"]', '42');
    await textIs(page, '[data-count="churches"]', '18');
    await textIs(page, '#draft-status', 'Saved draft');
    await page.setViewportSize(mobile);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
    await page.setViewportSize(desktop);
    await page.locator('#news-items [data-field="title"]').first().fill('Test announcement');
    await page.locator('#news-items [data-field="titleZo"]').first().fill('Entelna thuthak');
    await page.locator('.sidebar a[href="#module-businesses"]').click();
    assert.equal(await page.locator('#module-businesses').getAttribute('open'), '');
    await textIs(page, '#draft-status', 'Unsaved changes');
    await page.locator('#businesses-items [data-field="name"]').first().fill('Test business listing');
    await page.getByText('Church directory', { exact: true }).click();
    await page.locator('#churches-items [data-field="name"]').first().fill('Test church listing');
    await page.getByText('Village associations', { exact: true }).first().click();
    await page.locator('#villages-items [data-field="name"]').first().fill('Test village listing');
    await page.getByText('Leadership and board terms', { exact: true }).click();
    await page.getByRole('button', { name: 'Add term' }).click();
    await page.locator('#terms-items [data-field="label"]').last().fill('2028–2030');
    await page.getByRole('button', { name: 'Add member' }).click();
    const member = page.locator('#leadership-items fieldset').last();
    await member.locator('[data-field="term"]').fill('2028–2030');
    await member.locator('[data-field="name"]').fill('Test board member');
    await member.locator('[data-field="role"]').fill('Secretary');
    await page.getByText('Governance documents', { exact: true }).click();
    await page.locator('#documents-items [data-field="noteEn"]').first().fill('Test governance note');
    await page.locator('#editor button[type="submit"]').click();
    await textIs(page, '#status', 'Draft saved.');
    await textIs(page, '#draft-status', 'Saved draft');
    const publicPage = await context.newPage();
    await publicPage.goto(origin + '/');
    assert.equal(await publicPage.locator('#newsgrid h3').first().textContent(), 'A home for the Zomi community');
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#publish').click();
    await textIs(page, '#status', 'Published successfully.');
    await publicPage.reload();
    assert.equal(await publicPage.locator('#newsgrid h3').first().textContent(), 'Test announcement');
    await publicPage.locator('#lang').selectOption('zo');
    await textIs(publicPage, '#newsgrid h3', 'Entelna thuthak');
    await publicPage.goto(origin + '/businesses.html');
    await publicPage.locator('#search').fill('Test business listing');
    await textIs(publicPage, '#result-count', '1 / 42');
    await publicPage.goto(origin + '/churches.html');
    await publicPage.locator('#church-search').fill('Test church listing');
    await textIs(publicPage, '#church-count', '1 / 18');
    await publicPage.goto(origin + '/villages.html');
    await publicPage.locator('#village-search').fill('Test village listing');
    await textIs(publicPage, '#village-count', '1 / 49');
    await publicPage.goto(origin + '/leadership.html');
    await publicPage.locator('#tab2028-2030').click();
    await textIs(publicPage, '#term2028-2030 h3', 'Test board member');
    await publicPage.goto(origin + '/governance.html');
    assert.ok((await publicPage.locator('#constitution-card').textContent()).includes('Test governance note'));
    await page.locator('#logout').click();
    await page.locator('#signin').waitFor({ state: 'visible' });
    assert.deepEqual(errors, []);
  } finally {
    await context?.close();
    await new Promise(resolve => adminServer.close(resolve));
    await fs.rm(folder, { recursive: true, force: true });
  }
});

for (const [name, viewport] of [['desktop', desktop], ['mobile', mobile]]) {
  test(`${name}: every public route renders without horizontal page overflow`, async () => {
    await withPage(viewport, async page => {
      for (const file of pages) {
        await open(page, file);
        if (file.startsWith('reader')) await imageLoaded(page);
        assert.equal(await page.locator('h1').count(), 1, file);
        assert.equal(await page.locator('#menu').isVisible(), true, file);
        assert.equal(await page.locator('#nav-panel').isVisible(), false, file);
        assert.equal(await page.locator('header .brand small').count(), 0, file);
        assert.match(await page.locator('footer').innerText(), /© Zomi Innkuan Oklahoma, Inc\./, file);
        const alignment = await page.evaluate(() => {
          const edge = element => {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return { left: rect.left + parseFloat(style.paddingLeft), right: rect.right - parseFloat(style.paddingRight) };
          };
          const nav = edge(document.querySelector('header .nav'));
          const hero = edge(document.querySelector('.hero .wrap'));
          const body = edge(document.querySelector('main.wrap, main .section .wrap'));
          return { nav, hero, body };
        });
        for (const edge of ['left', 'right']) {
          assert.ok(Math.abs(alignment.nav[edge] - alignment.hero[edge]) <= 1, file + ' header/hero ' + edge);
          assert.ok(Math.abs(alignment.nav[edge] - alignment.body[edge]) <= 1, file + ' header/body ' + edge);
        }
        if (file === 'index.html') assert.equal(await page.locator('header .top').count(), 0);
        const dimensions = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, screen: innerWidth }));
        assert.ok(dimensions.content <= dimensions.screen + 2, `${file}: ${JSON.stringify(dimensions)}`);
      }
    });
  });
}

test('mobile menu opens, closes and navigates within the repository subpath', async () => {
  await withPage(mobile, async page => {
    await open(page, 'index.html');
    await page.locator('#menu').click();
    assert.equal(await page.locator('#menu').getAttribute('aria-expanded'), 'true');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#menu').getAttribute('aria-expanded'), 'false');
    await page.locator('#menu').click();
    await page.locator('#links a[href="businesses.html"]').click();
    assert.equal(new URL(page.url()).pathname, prefix + 'businesses.html');
    await page.locator('.brand').click();
    assert.equal(new URL(page.url()).pathname, prefix + 'index.html');
  });
});

test('desktop sidebar contains all navigation links and supports keyboard dismissal', async () => {
  await withPage(desktop, async page => {
    await open(page, 'index.html');
    const toggle = page.locator('#menu');
    const panel = page.locator('#nav-panel');
    assert.ok((await toggle.boundingBox()).x < (await page.locator('.brand').boundingBox()).x);
    await toggle.click();
    await panel.waitFor({ state: 'visible' });
    assert.equal(await page.locator('#links a').count(), 12);
    assert.ok((await panel.boundingBox()).x <= 1);
    assert.equal(await page.locator('#menu-close').evaluate(element => element === document.activeElement), true);
    await page.keyboard.press('Escape');
    await panel.waitFor({ state: 'hidden' });
    assert.equal(await toggle.evaluate(element => element === document.activeElement), true);
    await toggle.click();
    await page.locator('#links a[href="churches.html"]').click();
    assert.equal(new URL(page.url()).pathname, prefix + 'churches.html');
    await page.locator('#menu').click();
    await page.locator('#links a[href="index.html#news"]').click();
    assert.equal(new URL(page.url()).hash, '#news');
  });
});

test('business filtering, Zomi translation and persistence', async () => {
  await withPage(desktop, async page => {
    await open(page, 'businesses.html');
    await textIs(page, '#result-count', '42 / 42');
    await page.locator('#category').selectOption('Markets');
    await textIs(page, '#result-count', '14 / 42');
    await page.locator('#lang').selectOption('zo');
    await textIs(page, '#category option[value="Markets"]', 'Sumbuk');
    assert.notEqual(await page.locator('#search').getAttribute('placeholder'), 'Search by name, city, or address');
    assert.equal(await page.locator('#category').inputValue(), 'Markets');
    await page.locator('#category').selectOption('Restaurants');
    await textIs(page, '#result-count', '8 / 42');
    await page.locator('#reset').click();
    await page.locator('#search').fill('Asian Star Market');
    await textIs(page, '#result-count', '1 / 42');
    await page.locator('#search').fill('no such business 123');
    await page.locator('#empty').waitFor({ state: 'visible' });
    await page.reload();
    assert.equal(await page.locator('html').getAttribute('lang'), 'ctd');
    await page.locator('#lang').selectOption('en');
    await textIs(page, '#category option[value="Markets"]', 'Markets');
  });
});

test('public pages have no automated WCAG A/AA violations', async () => {
  await withPage(desktop, async page => {
    const failures = [];
    for (const file of pages) {
      await open(page, file);
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      failures.push(...result.violations.map(v => `${file}: ${v.id} (${v.nodes.map(n => n.target.join(' ')).join(', ')})`));
    }
    assert.deepEqual(failures, []);
  });
});

test('church and village directories return correct search results', async () => {
  await withPage(desktop, async page => {
    for (const [file, input, count, expected, query, result, empty] of [
      ['churches.html', '#church-search', '#church-count', '18 / 18', 'Bethel EBC', '1 / 18', '#church-empty'],
      ['villages.html', '#village-search', '#village-count', '49 / 49', 'Buanli', '1 / 49', '#village-empty']
    ]) {
      await open(page, file);
      await textIs(page, count, expected);
      await page.locator(input).fill(query);
      await textIs(page, count, result);
      await page.locator(input).fill('no matching record 123');
      await page.locator(empty).waitFor({ state: 'visible' });
      await page.locator(input).fill('');
      await textIs(page, count, expected);
    }
  });
});

test('leadership term switching and homepage dialog keyboard controls', async () => {
  await withPage(desktop, async page => {
    await open(page, 'leadership.html');
    assert.equal(await page.locator('#members article').count(), 14);
    await page.locator('#tab26').click();
    await page.locator('#term26').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#tab26').getAttribute('aria-selected'), 'true');
    await page.keyboard.press('ArrowLeft');
    await page.locator('#term24').waitFor({ state: 'visible' });
    await open(page, 'index.html');
    const trigger = page.locator('#join button');
    await trigger.click();
    await page.locator('#joinpanel').waitFor({ state: 'visible' });
    await page.keyboard.press('Escape');
    await page.locator('#joinpanel').waitFor({ state: 'hidden' });
    assert.equal(await trigger.evaluate(el => document.activeElement === el), true);
  });
});

for (const [documentType, count] of [['constitution', 9], ['bylaws', 12]]) {
  test(`${documentType}: page navigation, zoom and PDF download`, async () => {
    await withPage(mobile, async page => {
      await open(page, `reader.html?doc=${documentType}`);
      await imageLoaded(page);
      assert.equal(await page.locator('#prev').isDisabled(), true);
      await page.locator('#next').click();
      await textIs(page, '#page-number', `2 / ${count}`);
      await imageLoaded(page);
      await page.locator('#page-select').selectOption(String(count));
      await textIs(page, '#page-number', `${count} / ${count}`);
      await imageLoaded(page);
      assert.equal(await page.locator('#next').isDisabled(), true);
      await page.locator('#zoom-in').click();
      await textIs(page, '#zoom-level', '125%');
      await page.locator('#fit').click();
      await textIs(page, '#zoom-level', '100%');
      const download = await page.request.get(new URL(await page.locator('#download').getAttribute('href'), page.url()).href);
      assert.equal(download.status(), 200);
      assert.equal((await download.body()).subarray(0, 4).toString(), '%PDF');
    });
  });
}
