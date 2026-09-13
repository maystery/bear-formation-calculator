'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { browserSuite, nextPaint, tap, fitsViewport } = require('./helpers/browser-suite.cjs');
const screenshots = process.argv.includes('--screenshots');
const output = path.resolve(__dirname, '../artifacts/browser/mobile');
if (screenshots) fs.mkdirSync(output, { recursive: true });
const viewports = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 844, height: 390 },
];

async function captureViewport(page, selector, filename) {
  // Tall element screenshots resize the emulated device and can change its pointer media query.
  await page
    .locator(selector)
    .evaluate((element) => window.scrollTo(0, element.getBoundingClientRect().top + scrollY - 16));
  await nextPaint(page);
  await page.waitForFunction(() =>
    [...document.querySelectorAll('.hero-card__image')].every((image) => {
      const rect = image.closest('.herocard').getBoundingClientRect();
      return rect.bottom <= 0 || rect.top >= innerHeight || image.hasAttribute('href');
    }),
  );
  await page.evaluate(async () => {
    const visible = [...document.querySelectorAll('.hero-card__image[href]')].filter((image) => {
      const rect = image.closest('.herocard').getBoundingClientRect();
      return rect.bottom > 0 && rect.top < innerHeight;
    });
    await Promise.all(
      visible.map(async (image) => {
        const decoded = new Image();
        decoded.src = image.getAttribute('href');
        await decoded.decode();
      }),
    );
  });
  await page.screenshot({ path: path.join(output, filename) });
  assert.equal(await page.evaluate(() => matchMedia('(pointer:coarse)').matches), true);
}

for (const engine of ['chromium', 'webkit'].filter(
  (name) => !process.env.MOBILE_TEST_BROWSER || process.env.MOBILE_TEST_BROWSER === name,
)) {
  browserSuite(
    `Mobile: ${engine}`,
    {
      engine,
      context: {
        viewport: { width: 390, height: 844 },
        colorScheme: 'dark',
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        reducedMotion: 'reduce',
      },
    },
    (test) => {
      for (const viewport of viewports) {
        for (const theme of ['light', 'dark']) {
          test(
            `${viewport.width}×${viewport.height} ${theme} layout`,
            async ({ page, url }) => {
              await page.goto(url);
              const issues = await page.evaluate(() => {
                const issues = [];
                if (document.documentElement.scrollWidth > innerWidth)
                  issues.push('Page scrolls horizontally');
                for (const control of document.querySelectorAll('.ratio-control')) {
                  const bounds = control.getBoundingClientRect();
                  const stepper = control.querySelector('.ratio-stepper').getBoundingClientRect();
                  if (stepper.left < bounds.left - 1 || stepper.right > bounds.right + 1) {
                    issues.push('Ratio stepper overlaps its neighboring control');
                  }
                }
                for (const card of document.querySelectorAll('.herocard')) {
                  const bounds = card.getBoundingClientRect();
                  for (const element of card.querySelectorAll(
                    '.heroinfo,.hero-skill-details,.pill',
                  )) {
                    const rect = element.getBoundingClientRect();
                    if (
                      rect.bottom > bounds.bottom + 1 ||
                      rect.right > bounds.right + 1 ||
                      rect.left < bounds.left - 1
                    ) {
                      issues.push(`${card.dataset.hero}: ${element.className} escapes its card`);
                    }
                  }
                  for (const text of card.querySelectorAll(
                    '.hero-stat__label,.hero-card__skill-name',
                  )) {
                    if (
                      text.scrollWidth > text.clientWidth + 1 ||
                      text.scrollHeight > text.clientHeight + 1
                    ) {
                      issues.push(
                        `${card.dataset.hero}: truncated skill label ${text.textContent}`,
                      );
                    }
                  }
                }
                for (const field of document.querySelectorAll(
                  'input[type=text],input[type=number],select',
                )) {
                  if (parseFloat(getComputedStyle(field).fontSize) < 16)
                    issues.push(`${field.id}: input text smaller than 16px`);
                }
                for (const target of document.querySelectorAll(
                  '[data-ratio-adjust],.hero-stat--interactive,.capacity-buff-level-trigger',
                )) {
                  const rect = target.getBoundingClientRect();
                  if (rect.width < 44 || rect.height < 44)
                    issues.push(`${target.id || target.className}: touch target smaller than 44px`);
                }
                for (const input of document.querySelectorAll('.ratio-stepper input')) {
                  if (input.getBoundingClientRect().width < 44)
                    issues.push(`${input.id}: ratio value is squeezed`);
                }
                for (const image of document.images) {
                  if (!image.complete || !image.naturalWidth)
                    issues.push(`Broken image: ${image.src}`);
                }
                return issues;
              });
              assert.deepEqual(issues, [], `${engine} ${viewport.width}px ${theme}`);
              assert.equal(await page.locator('#rows tbody tr').count(), 5);
              if (screenshots && [320, 390, 844].includes(viewport.width)) {
                for (const [name, selector] of [
                  ['setup', '.formation-section'],
                  ['ratios', '.formation-ratio'],
                  ['heroes', '[data-hero="weeWoo"]'],
                  ['hilde', '[data-hero="hilde"]'],
                  ['buffs', '.capacity-buffs-section'],
                  ['results', '.result-section'],
                ]) {
                  await captureViewport(
                    page,
                    selector,
                    `${engine}-${viewport.width}-${theme}-${name}.png`,
                  );
                }
              }
              await tap(page, '#valoraSkillTrigger');
              assert.equal(await page.locator('#valoraSkillMenu').isVisible(), true);
              await fitsViewport(page, '#valoraSkillMenu');
              if (screenshots && viewport.width === 320) {
                await page.screenshot({
                  path: path.join(output, `${engine}-320-${theme}-picker.png`),
                });
              }
              await page.touchscreen.tap(5, 5);
              await nextPaint(page);
              assert.equal(await page.locator('#valoraSkillMenu').isVisible(), false);
            },
            { viewport, colorScheme: theme },
          );
        }
      }
      test('ratio controls, march slider and filling strategy', async ({ page, url }) => {
        await page.goto(url);
        await tap(page, '[data-ratio-adjust="ri"][data-ratio-step="1"]');
        assert.equal(await page.locator('#ri').inputValue(), '11');
        await tap(page, '#the');
        assert.equal(await page.locator('#ri').inputValue(), '10');
        await page.locator('#sa').fill('700k');
        await nextPaint(page);
        await page.locator('#n').scrollIntoViewIfNeeded();
        await nextPaint(page);
        const slider = await page.locator('#n').boundingBox();
        await page.touchscreen.tap(slider.x + slider.width - 10, slider.y + slider.height / 2);
        await nextPaint(page);
        assert.equal(await page.locator('#rows tbody tr').count(), 7);
        await tap(page, '.strategy-option:has(input[value="sequential"])');
        assert.equal(await page.locator('input[value="sequential"]').isChecked(), true);
      });
      test('capacity edits, skill pickers and Bison toggle', async ({ page, url }) => {
        await page.goto(url + '');
        await tap(page, '#capacityEdit > summary');
        await page.locator('#cap').fill('160k');
        await nextPaint(page);
        assert.equal(await page.locator('#baseCapacityDisplay').innerText(), '160,000');
        await tap(page, '#valoraSkillTrigger');
        assert.equal(await page.locator('#valoraSkillMenu').isVisible(), true);
        await fitsViewport(page, '#valoraSkillMenu');
        for (const option of await page.locator('#valoraSkillMenu [role=option]').all()) {
          const rect = await option.boundingBox();
          assert.ok(rect.width >= 44 && rect.height >= 44);
        }
        await page.locator('#valoraSkillMenu [data-level="5"]').tap();
        await nextPaint(page);
        assert.equal(await page.locator('#valoraBonusCard').innerText(), '+15k');
        await tap(page, '#valoraSkillTrigger');
        await page.touchscreen.tap(5, 5);
        await nextPaint(page);
        assert.equal(await page.locator('#valoraSkillMenu').isVisible(), false);
        await tap(page, '#bisonBuff');
        assert.equal(await page.locator('#bisonBuff').getAttribute('aria-checked'), 'true');
        await tap(page, '#bisonSkillTrigger');
        await page.locator('#bisonSkillMenu [data-level="4"]').tap();
        await nextPaint(page);
        assert.equal(await page.locator('#bisonBuff').getAttribute('aria-checked'), 'true');
        assert.equal(await page.locator('#bisonBonusCard').innerText(), '+6,000');
      });
      test('hero selection, popovers and rotation', async ({ page, url }) => {
        await page.goto(url + '');
        await tap(page, '[data-hero="amadeus"] .heroname');
        assert.equal(await page.locator('#amaOn').isChecked(), true);
        const trigger = '[data-hero="weeWoo"] .hero-stat--attack.hero-stat--interactive';
        const popover = '#skill-popover-weeWoo-attack';
        await tap(page, trigger);
        assert.equal(await page.locator(popover).isVisible(), true);
        assert.equal(await page.locator('#weeWooOn').isChecked(), true);
        await fitsViewport(page, popover);
        if (screenshots)
          await page.screenshot({ path: path.join(output, `${engine}-touch-popover.png`) });
        await page.touchscreen.tap(5, 5);
        await nextPaint(page);
        assert.equal(await page.locator(trigger).getAttribute('aria-expanded'), 'false');
        await tap(page, trigger);
        await page.setViewportSize({ width: 844, height: 390 });
        await nextPaint(page);
        await fitsViewport(page, popover);
        await page.touchscreen.tap(5, 5);
        await page.setViewportSize({ width: 390, height: 844 });
        await nextPaint(page);
      });
      test('march checker, validation and horizontal tables', async ({ page, url }) => {
        await page.goto(url + '');
        const before = await page.locator('#rows').innerText();
        await page.locator('#ci').fill('100');
        await page.locator('#cc').fill('100');
        await page.locator('#ca').fill('800');
        await nextPaint(page);
        assert.match(await page.locator('#verdict').innerText(), /Matches the ratio/);
        assert.equal(await page.locator('#rows').innerText(), before);
        for (const selector of ['.result-section .tablewrap', '.check-results']) {
          const scrolled = await page.locator(selector).evaluate((element) => {
            element.scrollLeft = element.scrollWidth;
            return (
              element.scrollLeft > 0 &&
              element.scrollLeft + element.clientWidth >= element.scrollWidth - 1
            );
          });
          assert.equal(scrolled, true, `${selector}: final columns must be reachable`);
        }
        if (screenshots) {
          await captureViewport(page, '.check-section', `${engine}-checker.png`);
          await captureViewport(page, '#verdict', `${engine}-checker-verdict.png`);
        }
        await page.locator('#tol').fill('invalid');
        await nextPaint(page);
        assert.equal(await page.locator('#tol').getAttribute('aria-invalid'), 'true');
        await page.locator('#tol').fill('3');
        await nextPaint(page);
        assert.equal(await page.locator('#tol').getAttribute('aria-invalid'), null);
      });
      test('copy, persistence, shared setup and reset', async ({ page, url }) => {
        await page.goto(url + '?setup=1&sa=700k&n=7&bisonSkill=4');
        await page.evaluate(() => {
          Object.defineProperty(navigator.clipboard, 'writeText', {
            configurable: true,
            value: async (text) => {
              window.copied = text;
            },
          });
        });
        await tap(page, '#copyFormation');
        assert.match(await page.evaluate(() => window.copied), /March 7/);
        await tap(page, '#copySetup');
        const sharedUrl = await page.evaluate(() => window.copied);
        assert.equal(new URL(sharedUrl).searchParams.get('sa'), '700k');
        await page.reload();
        assert.equal(await page.locator('#sa').inputValue(), '700k');
        assert.equal(await page.locator('#bisonSkill').inputValue(), '4');
        await tap(page, '#foldHeroes > summary');
        assert.equal(await page.locator('#heroGrid').isVisible(), false);
        await tap(page, '#foldHeroes > summary');
        assert.equal(await page.locator('#heroGrid').isVisible(), true);
        await page.goto(sharedUrl);
        assert.equal(await page.locator('#sharedNotice').isVisible(), true);
        await page.locator('#reset').tap();
        await page.waitForFunction(() => document.getElementById('sa')?.value === '566.04k');
        assert.equal(new URL(page.url()).searchParams.has('setup'), false);
      });
    },
  );
}
