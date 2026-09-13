'use strict';
const assert = require('node:assert/strict');
const { browserSuite, nextPaint, tap, fitsViewport } = require('./helpers/browser-suite.cjs');
const { releases, versionAnchor } = require('../release-history.js');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

for (const engine of ['chromium', 'webkit']) {
  browserSuite(`Rendered UI: ${engine}`, { engine }, (test) => {
    test('footer version navigates to release history and back without changing settings', async ({
      page,
      url,
    }) => {
      await page.goto(url);
      await page.locator('#si').fill('123k');
      const version = page.locator('#appVersion');
      assert.equal(await version.textContent(), `v${releases[0].version}`);
      assert.equal(await page.locator('.site-footer details, #releaseEntries').count(), 0);
      await version.focus();
      assert.equal(await version.evaluate((link) => getComputedStyle(link).outlineStyle), 'solid');
      await page.keyboard.press('Enter');
      await page.waitForURL(`${url}changelog/#${versionAnchor(releases[0].version)}`);
      assert.equal(await page.locator('h1').textContent(), 'Release history');
      assert.deepEqual(
        await page
          .locator('.release-entry')
          .evaluateAll((entries) => entries.map((entry) => entry.id)),
        releases.map((release) => versionAnchor(release.version)),
      );
      for (const release of releases) {
        const entry = page.locator(`#${versionAnchor(release.version)}`);
        assert.deepEqual(await entry.locator('li').allTextContents(), release.changes);
        assert.equal(await entry.locator('.release-entry__title').textContent(), release.title);
      }
      assert.equal(await page.locator('.release-entry__current').count(), 1);
      assert.equal(
        await page
          .locator('.release-entry')
          .first()
          .locator('.release-entry__current')
          .textContent(),
        'Current',
      );
      await page.getByRole('link', { name: '← Back to calculator' }).click();
      await page.waitForURL(`${url}index.html`);
      assert.equal(await page.locator('#si').inputValue(), '123k');
    });

    test('changelog supports direct routes, saved and system themes, and narrow layouts', async ({
      page,
      url,
    }) => {
      await page.goto(`${url}changelog/`);
      for (const theme of ['light', 'dark']) {
        const saved = JSON.stringify({ theme, si: '234k' });
        await page.evaluate((value) => localStorage.setItem('bearcalc.v1', value), saved);
        await page.emulateMedia({ colorScheme: theme === 'light' ? 'dark' : 'light' });
        for (const width of [320, 1180]) {
          await page.setViewportSize({ width, height: 900 });
          await page.goto(`${url}changelog`);
          await page.waitForURL(`${url}changelog/`);
          assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
          assert.equal(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
            true,
          );
          assert.equal(await page.evaluate(() => localStorage.getItem('bearcalc.v1')), saved);
          assert.ok((await page.locator('main').boundingBox()).width <= 800);
        }
      }
      await page.evaluate(() => localStorage.removeItem('bearcalc.v1'));
      await page.reload();
      assert.equal(await page.locator('html').getAttribute('data-theme'), null);
      assert.equal(
        await page.locator('html').evaluate((html) => getComputedStyle(html).colorScheme),
        'light dark',
      );
    });

    test('release links and version anchors work in direct file previews', async ({ page }) => {
      const calculatorUrl = pathToFileURL(path.resolve(__dirname, '../index.html')).href;
      if (engine === 'chromium') {
        await page.goto(calculatorUrl);
        await page.locator('#appVersion').click();
      } else {
        // WebKit blocks the calculator's existing SVG masks under file://.
        // Verify the standalone changelog offline; HTTP navigation is covered above.
        await page.goto(
          new URL(`changelog/index.html#${versionAnchor(releases[0].version)}`, calculatorUrl).href,
        );
      }
      assert.ok(page.url().endsWith(`/changelog/index.html#${versionAnchor(releases[0].version)}`));
      const lastId = versionAnchor(releases.at(-1).version);
      await page.goto(`${page.url().split('#')[0]}#${lastId}`);
      await page.reload();
      await fitsViewport(page, `#${lastId}`);
      const back = page.getByRole('link', { name: '← Back to calculator' });
      assert.equal(await back.evaluate((link) => link.href), calculatorUrl);
      if (engine === 'chromium') {
        await back.click();
        assert.equal(page.url(), calculatorUrl);
      }
    });

    test('hero cards and priority chips follow metadata and accessible relationships', async ({
      page,
      url,
    }) => {
      await page.goto(url);
      const issues = await page.evaluate(() => {
        const issues = [];
        const { HEROES, HERO_SLOTS } = BearHeroUI;
        const chips = [...document.querySelectorAll('.hero-priority-chip')];
        if (chips.length !== HERO_SLOTS.length)
          issues.push('Priority count differs from hero count');
        for (const [index, slot] of HERO_SLOTS.entries()) {
          const hero = HEROES[slot.key];
          const card = document.querySelector(`[data-hero="${slot.key}"]`);
          const input = document.getElementById(slot.id);
          if (card.htmlFor !== input.id || input.type !== 'checkbox')
            issues.push(`${slot.key}: missing checkbox label`);
          if (input.checked !== hero.defaultEnabled)
            issues.push(`${slot.key}: wrong default selection`);
          for (const id of input.getAttribute('aria-describedby').split(' ')) {
            if (!document.getElementById(id)) issues.push(`${slot.key}: broken description ${id}`);
          }
          const chip = chips[index];
          if (
            chip.querySelector('b').textContent !== String(index + 1) ||
            chip.querySelector('span').textContent !== hero.name ||
            chip.querySelector('img').getAttribute('src') !== hero.avatar
          )
            issues.push(`${slot.key}: wrong priority`);
          const portraits = card.querySelectorAll('.hero-card__image');
          const portrait = portraits[0];
          if (
            portraits.length !== 1 ||
            (portrait.getAttribute('href') || portrait.dataset.src) !== hero.portrait
          ) {
            issues.push(`${slot.key}: duplicate or incorrect portrait`);
          }
          const clipId = portrait.getAttribute('clip-path').slice(5, -1);
          if (
            !card.querySelector('clipPath') ||
            !document.getElementById(clipId)?.querySelector('path')
          ) {
            issues.push(`${slot.key}: missing SVG clip`);
          }
          if (
            card.querySelector('.season-badge').getAttribute('aria-label') !==
            `Season ${hero.season}`
          ) {
            issues.push(`${slot.key}: wrong season`);
          }
          if (
            !card
              .querySelector('.hero-skill-recommendation')
              .textContent.replace(/\s+/g, ' ')
              .includes(`Recommended Lv. ${hero.expeditionSkill.recommendedLevel}`)
          ) {
            issues.push(`${slot.key}: wrong recommendation`);
          }
          const triggers = [...card.querySelectorAll('.hero-stat--interactive')];
          if (triggers.length !== hero.expeditionSkill.effects.length)
            issues.push(`${slot.key}: missing skill trigger`);
          for (const trigger of triggers) {
            const popover = document.getElementById(trigger.getAttribute('aria-controls'));
            if (
              !popover ||
              popover.parentElement.id !== 'heroSkillPortal' ||
              popover.getAttribute('role') !== 'tooltip'
            ) {
              issues.push(`${slot.key}: broken popover relationship`);
            }
          }
        }
        return issues;
      });
      assert.deepEqual(issues, []);
    });

    test('hero artwork layers reserve geometry and keep controls above the portrait', async ({
      page,
      url,
    }) => {
      await page.goto(url);
      const layers = await page.locator('[data-hero="chenko"]').evaluate((card) => {
        const style = (selector) => getComputedStyle(card.querySelector(selector));
        const portrait = card.querySelector('.hero-card__art').getBoundingClientRect();
        const cardBounds = card.getBoundingClientRect();
        const content = card.querySelector('.hero-card__content').getBoundingClientRect();
        return {
          overflow: getComputedStyle(card).overflow,
          surfaceOverflow: style('.hero-card__surface').overflow,
          portraitOverflow: style('.hero-card__art').overflow,
          border: Number(style('.hero-card__border').zIndex),
          art: Number(style('.hero-card__art').zIndex),
          fade: Number(style('.hero-card__art-fade').zIndex),
          content: Number(style('.hero-card__content').zIndex),
          bottom: Number(getComputedStyle(card, '::after').zIndex),
          portraitExtendsAbove: portrait.top < cardBounds.top,
          contentFits: content.right <= cardBounds.right + 1 && content.left >= cardBounds.left,
          badgeWidth: parseFloat(style('.season-badge').width),
        };
      });
      assert.equal(layers.overflow, 'visible');
      assert.equal(layers.surfaceOverflow, 'hidden');
      assert.equal(layers.portraitOverflow, 'visible');
      assert.ok(
        layers.border < layers.art && layers.art < layers.fade && layers.fade < layers.content,
      );
      assert.ok(layers.bottom > layers.art);
      assert.ok(layers.portraitExtendsAbove && layers.contentFits);
      assert.equal(layers.badgeWidth, 74);
      assert.equal(await page.locator('.stat-legend__item').count(), 5);
    });

    test('skill progression identifies level, value, selection and negative effects', async ({
      page,
      url,
    }) => {
      await page.goto(url);
      // Parse renderer output in the browser instead of asserting serialized HTML.
      await page.evaluate(() => {
        const host = document.createElement('div');
        host.id = 'skill-render-test';
        host.innerHTML = BearHeroUI.skillLevelRows({ values: [5, 10, 15, 20, 25] }, 3, 5, 20);
        document.body.appendChild(host);
      });
      const host = page.locator('#skill-render-test');
      assert.equal(await host.locator('.skill-level-row').count(), 5);
      assert.match(await host.locator('[aria-label="recommended level"]').innerText(), /Lv\. 3/);
      assert.match(await host.locator('[aria-label="recommended value"]').innerText(), /Lv\. 4/);
      assert.match(await host.locator('[aria-label="selected level"]').innerText(), /Lv\. 5/);
      assert.equal(await host.locator('.skill-progression__step').count(), 1);
      assert.match(await host.locator('.skill-progression__step').innerText(), /\+5%\s*\/ level/);
      await host.evaluate((element) => {
        element.innerHTML = BearHeroUI.skillLevelRows({ values: [-5, -10, -15, -20, -25] }, 2, 10);
      });
      assert.match(await host.locator('[aria-label="selected level"]').innerText(), /Lv\. 5/);
      assert.match(await host.locator('.skill-progression__step').innerText(), /−5%\s*\/ level/);
      await host.evaluate((element) => {
        element.innerHTML = BearHeroUI.skillLevelRows({ values: [3, 6, 9, 12, 15] }, 2, null, 25);
      });
      assert.equal(await host.locator('.is-recommended-value').count(), 0);
      await host.evaluate((element) => {
        element.innerHTML = BearHeroUI.skillLevelRows({ values: [5, 10, 20, 35, 50] }, 4);
      });
      assert.equal(await host.locator('.skill-progression__step').count(), 0);
      assert.deepEqual(await host.locator('.skill-level-row strong').allTextContents(), [
        '+5%',
        '+10%',
        '+20%',
        '+35%',
        '+50%',
      ]);
    });

    test('capacity controls expose accessible semantics and keyboard selection', async ({
      page,
      url,
    }) => {
      await page.goto(url);
      const toggle = page.getByRole('switch');
      assert.equal(await toggle.evaluate((element) => element.tagName), 'BUTTON');
      assert.equal(await toggle.getAttribute('aria-checked'), 'false');
      await toggle.focus();
      await page.keyboard.press('Space');
      await nextPaint(page);
      assert.equal(await toggle.getAttribute('aria-checked'), 'true');
      for (const skill of ['valora', 'bison']) {
        const trigger = page.locator(`#${skill}SkillTrigger`);
        await trigger.focus();
        await page.keyboard.press('ArrowDown');
        const menu = page.locator(`#${skill}SkillMenu`);
        assert.equal(await menu.getAttribute('role'), 'listbox');
        assert.equal(await menu.getByRole('option').count(), 10);
        await page.keyboard.press('Home');
        await page.keyboard.press('Enter');
        await nextPaint(page);
        assert.equal(await page.locator(`#${skill}Skill`).inputValue(), '1');
        assert.equal(await menu.isVisible(), false);
      }
      assert.equal(await page.locator('#sav').count(), 0);
    });

    test(
      'narrow hero recommendations and popovers stay readable',
      async ({ page, url }) => {
        await page.goto(url);
        const trigger = '[data-hero="weeWoo"] .hero-stat--attack';
        await tap(page, trigger);
        const popover = '#skill-popover-weeWoo-attack';
        await fitsViewport(page, popover);
        assert.match(await page.locator(popover).innerText(), /Recommended: Lv\. 2/);
        assert.equal(
          await page.locator(popover).evaluate((element) => getComputedStyle(element).position),
          'fixed',
        );
        await page.keyboard.press('Escape');
        assert.equal(await page.locator(trigger).getAttribute('aria-expanded'), 'false');
      },
      {
        viewport: { width: 320, height: 568 },
        isMobile: true,
        hasTouch: true,
        reducedMotion: 'reduce',
      },
    );
  });
}
