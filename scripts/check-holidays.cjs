'use strict';

const assert = require('node:assert/strict');
const { browserSuite, nextPaint, fitsViewport } = require('./helpers/browser-suite.cjs');

for (const engine of ['chromium', 'webkit']) {
  browserSuite(`Holiday themes: ${engine}`, { engine }, (test) => {
    test('Valora and Mighty Bison costumes switch and fall back without affecting capacity', async ({
      page,
      url,
    }) => {
      await page.clock.setFixedTime(new Date('2026-10-16T12:00:00Z'));
      await page.goto(url);
      await page.locator('#bisonBuff').click();
      await nextPaint(page);
      const capacity = await page.locator('#tCap').innerText();
      const formation = await page.locator('#rows').innerText();
      for (const choice of ['default', 'halloween']) {
        await page.locator('#holidayTheme').selectOption(choice);
        await nextPaint(page);
        for (const [key, file] of [
          ['valora', 'valora'],
          ['bison', 'mighty-bison'],
        ]) {
          const base = choice === 'halloween' ? 'assets/holidays/halloween/buffs' : 'assets/buffs';
          const portrait = page.locator(`[data-buff-asset="${key}"]`);
          assert.equal(await portrait.getAttribute('src'), `${base}/${file}.webp`);
          await portrait.evaluate((element) => element.decode());
        }
        assert.equal(await page.locator('#tCap').innerText(), capacity);
        assert.equal(await page.locator('#rows').innerText(), formation);
        assert.equal(await page.locator('#bisonBuff').getAttribute('aria-checked'), 'true');
      }
      const bison = page.locator('[data-buff-asset="bison"]');
      await bison.evaluate((element) => element.dispatchEvent(new Event('error')));
      assert.equal(await bison.getAttribute('src'), 'assets/buffs/mighty-bison.webp');
    });

    test('scene effects pause off-screen, while hidden, by choice, and with reduced motion', async ({
      page,
      url,
    }) => {
      await page.clock.setFixedTime(new Date('2026-10-16T12:00:00Z'));
      await page.goto(url);
      const effects = '.holiday-effects .holiday-motion';
      const states = () =>
        page
          .locator(effects)
          .evaluateAll((elements) =>
            elements.map((element) => getComputedStyle(element).animationPlayState),
          );
      await page.waitForFunction(() =>
        document.getElementById('holidayBanner').classList.contains('is-visible'),
      );
      assert.ok((await states()).every((state) => state === 'running'));
      const dimensions = await page.locator('#holidayBanner').boundingBox();
      await page.locator(effects).evaluateAll((elements) =>
        elements.forEach((element) =>
          element.getAnimations().forEach((animation) => {
            animation.currentTime = 5000;
          }),
        ),
      );
      assert.deepEqual(await page.locator('#holidayBanner').boundingBox(), dimensions);
      await page.locator('#holidayMotion').uncheck();
      assert.ok((await states()).every((state) => state === 'paused'));
      await page.waitForFunction(
        () => JSON.parse(localStorage.getItem('bearcalc.v1') || '{}').holidayMotion === false,
      );
      await page.reload();
      assert.equal(await page.locator('#holidayMotion').isChecked(), false);
      assert.ok((await states()).every((state) => state === 'paused'));
      await page.locator('#holidayMotion').check();
      await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
      await page.waitForFunction(
        () => !document.getElementById('holidayBanner').classList.contains('is-visible'),
      );
      assert.ok((await states()).every((state) => state === 'paused'));
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForFunction(() =>
        document.getElementById('holidayBanner').classList.contains('is-visible'),
      );
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      assert.ok((await states()).every((state) => state === 'paused'));
      await page.evaluate(() => {
        delete document.hidden;
        document.dispatchEvent(new Event('visibilitychange'));
      });
      assert.ok((await states()).every((state) => state === 'running'));
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.ok(
        (
          await page
            .locator(effects)
            .evaluateAll((elements) =>
              elements.map((element) => getComputedStyle(element).animationName),
            )
        ).every((name) => name === 'none'),
      );
      assert.equal(await page.locator('.holiday-motion-control').isVisible(), false);
      await page.locator('#holidayTheme').selectOption('default');
      assert.equal(await page.locator('#holidayBanner').isVisible(), false);
    });

    test('switches all artwork without changing formations, preserves choices and restores Classic', async ({
      page,
      url,
    }) => {
      await page.clock.setFixedTime(new Date('2026-10-16T12:00:00Z'));
      await page.goto(url);
      assert.equal(await page.locator('html').getAttribute('data-holiday'), 'halloween');
      assert.equal(await page.locator('#holidayBanner').isVisible(), true);
      const formation = await page.locator('#rows').innerText();
      await page.locator('#holidayTheme').selectOption('default');
      await nextPaint(page);
      assert.equal(await page.locator('#holidayBanner').isVisible(), false);
      assert.equal(await page.locator('#rows').innerText(), formation);
      assert.equal(
        await page.locator('[data-hero="luna"] .hero-card__image').getAttribute('data-src'),
        'assets/heroes/luna.webp',
      );
      await page.locator('#holidayTheme').selectOption('halloween');
      await nextPaint(page);
      const deferred = page.locator('[data-hero="luna"] .hero-card__image');
      assert.equal(
        await deferred.getAttribute('data-src'),
        'assets/holidays/halloween/heroes/luna.webp',
      );
      assert.equal(
        await deferred.getAttribute('href'),
        null,
        'switching preserves deferred loading',
      );
      await page.locator('#heroGrid').scrollIntoViewIfNeeded();
      await page.waitForFunction(() =>
        [...document.querySelectorAll('.hero-card__image')].every((el) => el.hasAttribute('href')),
      );
      for (const element of await page.locator('[data-hero-asset]').all()) {
        const kind = await element.getAttribute('data-asset-kind');
        assert.match(
          await element.getAttribute(kind === 'portrait' ? 'href' : 'src'),
          /assets\/holidays\/halloween\//,
        );
      }
      const portrait = page.locator('[data-hero="chenko"] .hero-card__image');
      await portrait.evaluate((element) => element.dispatchEvent(new Event('error')));
      assert.equal(await portrait.getAttribute('href'), 'assets/heroes/chenko.webp');
      await page.locator('#holidayTheme').selectOption('default');
      await page.locator('#holidayTheme').selectOption('halloween');
      assert.equal(await page.locator('#rows').innerText(), formation);
      await page.waitForFunction(
        () => JSON.parse(localStorage.getItem('bearcalc.v1')).holidayTheme === 'halloween',
      );
      await page.reload();
      assert.equal(await page.locator('#holidayTheme').inputValue(), 'halloween');
      assert.equal(await page.locator('html').getAttribute('data-holiday'), 'halloween');
      await page.locator('#holidayTheme').selectOption('default');
      await page.waitForFunction(
        () => JSON.parse(localStorage.getItem('bearcalc.v1')).holidayTheme === 'default',
      );
      await page.goto(url + '?setup=1&selectedSeason=1&holidayTheme=halloween');
      assert.equal(await page.locator('#holidayTheme').inputValue(), 'default');
      assert.equal(await page.locator('#selectedSeason').inputValue(), '1');
      await page.locator('#reset').click();
      await page.waitForFunction(() => document.getElementById('holidayTheme')?.value === 'auto');
      assert.equal(await page.locator('html').getAttribute('data-holiday'), 'halloween');
    });

    test('Auto follows the calendar and manual Halloween works outside its dates on mobile', async ({
      page,
      url,
    }) => {
      await page.clock.setFixedTime(new Date('2027-07-10T12:00:00Z'));
      await page.goto(url);
      assert.equal(await page.locator('html').getAttribute('data-holiday'), 'default');
      assert.equal(await page.locator('#holidayBanner').isVisible(), false);
      for (const width of [320, 390, 768]) {
        await page.setViewportSize({ width, height: 844 });
        await page.locator('#holidayTheme').selectOption('halloween');
        await page.evaluate(() => scrollTo(0, 0));
        await fitsViewport(page, '#holidayTheme');
        await fitsViewport(page, '#theme');
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          true,
        );
        await page.locator('#holidayTheme').selectOption('auto');
        assert.equal(await page.locator('html').getAttribute('data-holiday'), 'default');
      }
      await page.locator('#holidayTheme').selectOption('halloween');
      await page.clock.setFixedTime(new Date('2027-10-31T12:00:00Z'));
      await page.locator('#holidayTheme').selectOption('auto');
      assert.equal(await page.locator('html').getAttribute('data-holiday'), 'halloween');
      await page.locator('#theme').click();
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
      assert.equal(await page.locator('html').getAttribute('data-holiday'), 'halloween');
    });
  });
}
