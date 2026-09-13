'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { browserSuite, nextPaint } = require('./helpers/browser-suite.cjs');

async function instrument(page) {
  await page.addInitScript(() => {
    window.saves = [];
    window.feedback = [];
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'bearcalc.v1') {
        try {
          window.saves.push(JSON.parse(value));
        } catch {
          window.saves.push(value);
        }
      }
      return setItem.call(this, key, value);
    };
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (...args) {
      window.feedback.push(this.id);
      return animate.apply(this, args);
    };
    window.edit = (id, value) => {
      const field = document.getElementById(id);
      field.value = value;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
    };
    window.nextPaint = () =>
      new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

async function observeUpdates(page) {
  await page.evaluate(() => {
    window.rowUpdates = window.heroUpdates = 0;
    new MutationObserver((records) => (window.rowUpdates += records.length)).observe(
      document.getElementById('rows'),
      { childList: true },
    );
    new MutationObserver((records) => (window.heroUpdates += records.length)).observe(
      document.getElementById('heroGrid'),
      { subtree: true, childList: true, attributes: true },
    );
  });
}

browserSuite('Desktop behavior', {}, (test) => {
  test('rapid input/change events produce one render and one debounced save', async ({
    page,
    url,
  }) => {
    await instrument(page);
    await page.goto(url);
    await page.waitForFunction(() =>
      [...document.images].every((image) => image.complete && image.naturalWidth),
    );
    assert.deepEqual(
      await page.evaluate(() =>
        BearSettings.FIELDS.filter((field) =>
          field.kind === 'radio'
            ? !document.querySelector(`input[name="${field.id}"]`)
            : !document.getElementById(field.id),
        ).map((field) => field.id),
      ),
      [],
    );
    assert.equal(await page.locator('#rows tbody tr').count(), 5);
    assert.equal(
      await page.evaluate(() =>
        [...document.scripts].filter((script) => script.src).every((script) => script.defer),
      ),
      true,
    );
    assert.deepEqual(
      await page.evaluate(() =>
        [...document.images]
          .filter((image) => !image.complete || !image.naturalWidth)
          .map((image) => image.src),
      ),
      [],
    );

    await page.evaluate(() => {
      window.rowUpdates = 0;
      window.heroUpdates = 0;
      new MutationObserver((records) => (window.rowUpdates += records.length)).observe(
        document.getElementById('rows'),
        { childList: true },
      );
      new MutationObserver((records) => (window.heroUpdates += records.length)).observe(
        document.getElementById('heroGrid'),
        { subtree: true, childList: true, attributes: true },
      );
      window.saves = [];
      for (let n = 1; n <= 10; n++) window.edit('sa', `${600 + n}k`);
    });
    await nextPaint(page);
    assert.equal(await page.evaluate(() => window.rowUpdates), 1);
    await page.waitForFunction(() => window.saves.length === 1 && window.saves[0].sa === '610k');
    assert.equal(await page.evaluate(() => window.saves.length), 1);
    assert.equal(await page.evaluate(() => window.saves[0].sa), '610k');
  });

  test('checker edits leave formation and heroes untouched; mixed edits use the latest ratio', async ({
    page,
    url,
  }) => {
    await instrument(page);
    await page.goto(url);
    await observeUpdates(page);

    await page.evaluate(() => {
      window.rowUpdates = window.heroUpdates = 0;
      window.edit('ci', '100');
      window.edit('cc', '100');
      window.edit('ca', '800');
    });
    await nextPaint(page);
    assert.equal(await page.evaluate(() => window.rowUpdates), 0);
    assert.equal(await page.evaluate(() => window.heroUpdates), 0);
    assert.match(await page.locator('#verdict').innerText(), /Matches the ratio/);
    await page.evaluate(() => {
      window.edit('tol', '0');
      window.edit('ri', '20');
    });
    await nextPaint(page);
    assert.equal(await page.evaluate(() => window.rowUpdates), 1);
    assert.match(await page.locator('#verdict').innerText(), /Ratio needs adjustment/);
  });

  test('invalid inputs animate once and recover without stale checker results', async ({
    page,
    url,
  }) => {
    await instrument(page);
    await page.goto(url);

    await page.evaluate(() => {
      window.feedback = [];
      window.edit('si', 'bad');
    });
    await nextPaint(page);
    await page.evaluate(() => window.edit('si', 'still bad'));
    await nextPaint(page);
    assert.equal(await page.evaluate(() => window.feedback.filter((id) => id === 'si').length), 1);
    assert.equal(await page.locator('#rows tbody tr').count(), 0);
    await page.evaluate(() => window.edit('ci', '200'));
    await nextPaint(page);
    assert.equal(await page.locator('#checkRows tr').count(), 0);
    await page.evaluate(() => window.edit('si', '300k'));
    await nextPaint(page);
    assert.equal(await page.locator('#si').getAttribute('aria-invalid'), null);
    assert.equal(await page.locator('#rows tbody tr').count(), 5);
  });

  test('copying flushes pending rendering and leaving flushes pending storage', async ({
    page,
    url,
  }) => {
    await instrument(page);
    await page.goto(url);

    await page.evaluate(() => {
      window.edit('sa', '720k');
      Object.defineProperty(navigator.clipboard, 'writeText', {
        configurable: true,
        value: async (text) => {
          window.copied = text;
        },
      });
      document.getElementById('copyFormation').click();
    });
    const copied = await page.evaluate(() => window.copied);
    const archerTotal = copied
      .split('\n')
      .filter((line) => /^(Total:|Left at home:)/.test(line))
      .reduce(
        (sum, line) => sum + Number(line.match(/([\d,]+) archers/)[1].replaceAll(',', '')),
        0,
      );
    assert.equal(archerTotal, 720000);
    await page.evaluate(() => {
      window.saves = [];
      window.edit('sa', '730k');
      window.dispatchEvent(new PageTransitionEvent('pagehide'));
    });
    assert.equal(
      await page.evaluate(() => JSON.parse(localStorage.getItem('bearcalc.v1')).sa),
      '730k',
    );
    // Observe beyond the debounce interval to catch an unwanted duplicate save.
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => window.saves.length), 1);
    await page.reload();
    assert.equal(await page.locator('#sa').inputValue(), '730k');
  });

  test('saved theme applies before app.js and reset cancels pending saves', async ({
    page,
    url,
  }) => {
    await instrument(page);
    await page.goto(url);

    await page.evaluate(() => {
      localStorage.setItem('bearcalc.v1', JSON.stringify({ theme: 'dark', sa: '730k' }));
    });
    await page.route('**/app.js', async (route) => {
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
      await route.continue();
    });
    await page.reload();
    await page.unroute('**/app.js');
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await page.evaluate(() => {
      window.edit('sa', '999k');
      document.getElementById('reset').click();
    });
    await page.waitForLoadState('load');
    await page.waitForFunction(() => document.getElementById('sa').value === '566.04k');
    // A stale pre-reset timer must not restore the discarded edit.
    await page.waitForTimeout(350);
    assert.equal(await page.locator('html').getAttribute('data-theme'), null);
    assert.notEqual(
      await page.evaluate(() => JSON.parse(localStorage.getItem('bearcalc.v1') || '{}').sa),
      '999k',
    );
  });

  test('shared setups, skill pickers, buff switches, hero checkboxes and units', async ({
    page,
    url,
  }) => {
    await instrument(page);
    await page.goto(url);

    await page.goto(`${url}?setup=1&sa=810k&ri=20&rc=20&ra=60&fillStrategy=sequential&bison=1`);
    assert.equal(await page.locator('#sa').inputValue(), '810k');
    assert.equal(await page.locator('#bisonBuff').getAttribute('aria-checked'), 'true');
    assert.equal(await page.locator('#sharedNotice').isVisible(), true);
    await page.locator('#valoraSkillTrigger').scrollIntoViewIfNeeded();
    await nextPaint(page);
    await page.locator('#valoraSkillTrigger').click();
    await page.locator('#valoraSkillMenu [data-level="5"]').click();
    await nextPaint(page);
    assert.equal(await page.locator('#valoraBonusCard').innerText(), '+15k');
    await page.locator('#bisonBuff').click();
    await nextPaint(page);
    assert.equal(await page.locator('#bisonBuff').getAttribute('aria-checked'), 'false');
    await page.evaluate(() => document.getElementById('amaOn').click());
    await nextPaint(page);
    assert.match(await page.locator('#pill-amadeus').innerText(), /March/);
    await page.selectOption('#unit', 'full');
    await nextPaint(page);
    assert.doesNotMatch(await page.locator('#tTotal').innerText(), /[km]/);
  });

  test('reduced motion disables feedback; no browser errors', async ({ page, url }) => {
    await instrument(page);
    await page.goto(url);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() => {
      window.feedback = [];
      window.edit('si', 'invalid');
      document.getElementById('theme').click();
    });
    await nextPaint(page);
    assert.deepEqual(await page.evaluate(() => window.feedback), []);
  });

  test('deferred controllers also initialize and calculate from a local file', async ({
    page,
    url,
  }) => {
    await instrument(page);
    await page.goto(url);

    await page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href);
    assert.equal(await page.locator('#rows tbody tr').count(), 5);
    await page.locator('#sa').fill('800k');
    await nextPaint(page);
    assert.equal(await page.locator('#copyFormation').isEnabled(), true);
  });

  for (const [label, stored] of [
    ['invalid JSON', '{broken'],
    ['array', '[]'],
    [
      'wrong field types',
      JSON.stringify({ theme: 'invalid', unit: 'bad', bisonBuffEnabled: 'true' }),
    ],
  ]) {
    test(`malformed saved settings: ${label}`, async ({ page, url }) => {
      await page.addInitScript((value) => localStorage.setItem('bearcalc.v1', value), stored);
      await page.goto(url);
      assert.equal(await page.locator('#rows tbody tr').count(), 5);
      assert.equal(await page.locator('#unit').inputValue(), 'k');
      assert.equal(await page.locator('#bisonBuff').getAttribute('aria-checked'), 'false');
    });
  }
});
