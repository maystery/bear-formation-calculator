'use strict';
const assert = require('node:assert/strict');
const { browserSuite, nextPaint, fitsViewport } = require('./helpers/browser-suite.cjs');

for (const engine of ['chromium', 'webkit']) {
  browserSuite(`Season selector: ${engine}`, { engine }, (test) => {
    test('filters cards, priority and assignments cumulatively while preserving saved hero choices', async ({
      page,
      url,
    }) => {
      await page.goto(url + '?setup=1&n=7&lunaOn=1');
      const trigger = page.locator('.season-selector-trigger');
      const menu = page.locator('#heroSeasonSelector-menu');
      assert.match(await trigger.innerText(), /Season 8/);
      const choose = async (season) => {
        await trigger.click();
        await menu.waitFor({ state: 'visible' });
        await menu.locator(`[data-season="${season}"]`).click();
        await nextPaint(page);
        assert.equal(await menu.isVisible(), false);
        assert.equal(await page.locator('#foldHeroes').evaluate((el) => el.open), true);
      };
      const names = () =>
        page.locator('.hero-card-shell:not([hidden]) .heroname').allTextContents();
      await choose(1);
      assert.deepEqual(await names(), ['Amadeus', 'Chenko', 'Yeonwoo', 'Amane']);
      assert.deepEqual(
        await page.locator('.hero-priority-chip:not([hidden]) > b').allTextContents(),
        ['1', '2', '3', '4'],
      );
      assert.deepEqual(
        await page.locator('.hero-priority-chip:not([hidden]) > span').allTextContents(),
        await names(),
      );
      assert.deepEqual(await page.locator('#rows tbody .leadcell span').allTextContents(), [
        'Chenko',
        'Yeonwoo',
        'Amane',
        'No hero',
        'No hero',
        'No hero',
        'No hero',
      ]);
      assert.equal(await page.locator('#lunaOn').isChecked(), true);
      assert.equal(await page.locator('#heroSum').textContent(), '3/4 enabled · 3 assigned');
      await choose(3);
      assert.deepEqual(await names(), ['Amadeus', 'Chenko', 'Yeonwoo', 'Amane', 'Hilde']);
      await choose(4);
      assert.deepEqual(await names(), ['Amadeus', 'Chenko', 'Yeonwoo', 'Amane', 'Margot', 'Hilde']);
      await page.waitForFunction(
        () => JSON.parse(localStorage.getItem('bearcalc.v1')).selectedSeason === '4',
      );
      // Reload without the shared link, which has no season and would apply season 8.
      await page.goto(url);
      assert.match(await trigger.innerText(), /Season 4/);
      assert.equal((await names()).length, 6);
      await choose(8);
      assert.equal((await names()).length, 10);
      assert.equal(await page.locator('#pill-luna').textContent(), 'March 6');
      await page.goto(url + '?setup=1&selectedSeason=1');
      assert.match(await trigger.innerText(), /Season 1/);
      assert.equal((await names()).length, 4);
      await page.locator('#reset').click();
      await page.waitForFunction(() => document.getElementById('selectedSeason')?.value === '8');
    });

    test('keyboard navigation, dismissal and header folding are independent', async ({
      page,
      url,
    }) => {
      await page.goto(url);
      const trigger = page.locator('.season-selector-trigger');
      const menu = page.locator('#heroSeasonSelector-menu');
      const activeSeason = () => page.evaluate(() => document.activeElement.dataset.season);
      await trigger.focus();
      await page.keyboard.press('Enter');
      await menu.waitFor({ state: 'visible' });
      assert.equal(await activeSeason(), '8');
      assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
      await page.keyboard.press('Home');
      assert.equal(await activeSeason(), '1');
      await page.keyboard.press('ArrowDown');
      assert.equal(await activeSeason(), '5');
      await page.keyboard.press('ArrowRight');
      assert.equal(await activeSeason(), '6');
      await page.keyboard.press('Space');
      await nextPaint(page);
      assert.match(await trigger.innerText(), /Season 6/);
      assert.equal(await trigger.evaluate((el) => el === document.activeElement), true);
      await page.keyboard.press('ArrowDown');
      await menu.waitFor({ state: 'visible' });
      await page.keyboard.press('End');
      await page.keyboard.press('ArrowUp');
      assert.equal(await activeSeason(), '4');
      await page.keyboard.press('Escape');
      assert.equal(await menu.isVisible(), false);
      assert.equal(await trigger.evaluate((el) => el === document.activeElement), true);
      assert.match(await trigger.innerText(), /Season 6/);
      await trigger.click();
      await menu.waitFor({ state: 'visible' });
      await trigger.click();
      assert.equal(await menu.isVisible(), false);
      await trigger.click();
      await menu.waitFor({ state: 'visible' });
      await page.locator('#heroPriority').click();
      await nextPaint(page);
      assert.equal(await menu.isVisible(), false);
      assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
      await trigger.focus();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Tab');
      assert.equal(await menu.isVisible(), false);
      assert.equal(await trigger.evaluate((el) => el === document.activeElement), false);
      await page.locator('#foldHeroes > summary .sectitle').click();
      assert.equal(await page.locator('#foldHeroes').evaluate((el) => el.open), false);
      await trigger.click();
      await menu.waitFor({ state: 'visible' });
      await menu.locator('[data-season="1"]').click();
      await nextPaint(page);
      assert.equal(await page.locator('#foldHeroes').evaluate((el) => el.open), false);
      assert.equal(await page.locator('#heroSum').textContent(), '3/4 enabled · 3 assigned');
      await page.locator('#foldHeroes > summary .sectitle').click();
      await trigger.click();
      await page.locator('#foldHeroes').evaluate((el) => {
        el.open = false;
      });
      await menu.waitFor({ state: 'hidden' });
    });

    test('works without the Popover API', async ({ page, url }) => {
      await page.addInitScript(() => {
        delete HTMLElement.prototype.showPopover;
        delete HTMLElement.prototype.hidePopover;
        delete HTMLElement.prototype.togglePopover;
      });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(url);
      const trigger = page.locator('.season-selector-trigger');
      const menu = page.locator('#heroSeasonSelector-menu');
      assert.equal(await menu.isVisible(), false);
      await trigger.click();
      await menu.waitFor({ state: 'visible' });
      assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
      assert.equal(
        await menu.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length),
        4,
      );
      await menu.locator('[data-season="4"]').click();
      await nextPaint(page);
      assert.equal(await menu.isVisible(), false);
      assert.match(await trigger.innerText(), /Season 4/);
      await trigger.click();
      await menu.waitFor({ state: 'visible' });
      await page.keyboard.press('Escape');
      assert.equal(await menu.isVisible(), false);
      await trigger.click();
      await menu.waitFor({ state: 'visible' });
      await page.locator('#heroPriority').click();
      assert.equal(await menu.isVisible(), false);
      assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
      assert.deepEqual(errors, []);
    });

    for (const width of [1280, 900, 390]) {
      test(`hero cards share one size at ${width}px, whatever their skill count`, async ({
        page,
        url,
      }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(url);
        const sizes = () =>
          page.$$eval('.hero-card-shell:not([hidden]) .herocard', (cards) => [
            ...new Set(
              cards.map((card) => {
                const { width, height } = card.getBoundingClientRect();
                return `${Math.round(width)}x${Math.round(height)}`;
              }),
            ),
          ]);
        const [twoSkillSize] = await sizes();
        assert.deepEqual(await sizes(), [twoSkillSize]);
        // Season 1 has no two-skill heroes, so cards drop the reserved row.
        await page.locator('.season-selector-trigger').click();
        await page.locator('#heroSeasonSelector-menu [data-season="1"]').click();
        await nextPaint(page);
        const oneSkill = await sizes();
        assert.equal(oneSkill.length, 1);
        assert.ok(parseInt(oneSkill[0].split('x')[1]) <= parseInt(twoSkillSize.split('x')[1]));
      });
    }

    test('hero changes keep a pinned skill popover open', async ({ page, url }) => {
      await page.goto(url);
      const card = page.locator('[data-hero="luna"]');
      await card.locator('.hero-stat--interactive').click();
      const popover = page.locator('#skill-popover-luna-attack');
      await popover.waitFor({ state: 'visible' });
      // Keyboard slider changes re-render the hero cards without a dismissing pointer event.
      await page.locator('#n').evaluate((el) => {
        el.value = '3';
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await nextPaint(page);
      assert.equal(await popover.isVisible(), true);
    });

    for (const width of [320, 390, 844]) {
      test(
        `touch layout at ${width}px stays inside viewport without shifting cards`,
        async ({ page, url }) => {
          await page.goto(url);
          const trigger = page.locator('.season-selector-trigger');
          const menu = page.locator('#heroSeasonSelector-menu');
          await trigger.scrollIntoViewIfNeeded();
          await nextPaint(page);
          const before = await page.locator('#heroGrid').boundingBox();
          await trigger.tap();
          await menu.waitFor({ state: 'visible' });
          assert.deepEqual(await page.locator('#heroGrid').boundingBox(), before);
          await fitsViewport(page, '#heroSeasonSelector-menu');
          assert.equal(
            await menu.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length),
            width <= 420 ? 2 : 4,
          );
          assert.equal(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
            true,
          );
          const option = menu.locator('[data-season="1"]');
          await option.tap();
          await nextPaint(page);
          assert.match(await trigger.innerText(), /Season 1/);
          assert.equal(await page.locator('#foldHeroes').evaluate((el) => el.open), true);
        },
        {
          viewport: { width, height: width === 844 ? 390 : 844 },
          isMobile: true,
          hasTouch: true,
          reducedMotion: 'reduce',
        },
      );
    }
  });
}
