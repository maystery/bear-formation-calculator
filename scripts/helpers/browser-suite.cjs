'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');
const createServer = require('../browser-server.cjs');

/** A fresh browser context per case prevents saved state and instrumentation leaks. */
function browserSuite(name, options, define) {
  describe(name, { concurrency: false }, () => {
    let browser;
    let server;
    let url;
    before(async () => {
      server = createServer();
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
      url = `http://127.0.0.1:${server.address().port}/`;
      browser = await { chromium, webkit }[options.engine || 'chromium'].launch({ headless: true });
    });
    after(async () => {
      try {
        if (browser) await browser.close();
      } finally {
        if (server) await new Promise((resolve) => server.close(resolve));
      }
    });
    define((title, run, contextOptions = {}) => {
      it(title, { timeout: 90000 }, async () => {
        const context = await browser.newContext({ ...options.context, ...contextOptions });
        const errors = [];
        context.on('page', (page) => {
          page.setDefaultTimeout(10000);
          page.on('pageerror', (error) => errors.push(error.message));
          page.on('response', (response) => {
            if (response.status() >= 400 && !response.url().endsWith('/favicon.ico')) {
              errors.push(`${response.status()} ${response.url()}`);
            }
          });
          page.on('requestfailed', (request) => {
            const reason = request.failure()?.errorText || '';
            // Navigation can intentionally cancel in-flight artwork requests.
            if (!/aborted|cancelled|canceled|NS_BINDING_ABORTED/i.test(reason))
              errors.push(`${reason} ${request.url()}`);
          });
        });
        try {
          const page = await context.newPage();
          await run({ page, context, url, engine: options.engine || 'chromium' });
          assert.deepEqual(errors, [], 'browser errors and failed resources');
        } finally {
          await context.close();
        }
      });
    });
  });
}

const nextPaint = (page) =>
  page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );

async function tap(page, selector) {
  const target = page.locator(selector);
  await target.scrollIntoViewIfNeeded();
  await nextPaint(page);
  await target.tap();
  await nextPaint(page);
}

async function fitsViewport(page, selector) {
  const rect = await page.locator(selector).boundingBox();
  const viewport = page.viewportSize();
  assert.ok(
    rect &&
      rect.x >= 0 &&
      rect.y >= 0 &&
      rect.x + rect.width <= viewport.width + 1 &&
      rect.y + rect.height <= viewport.height + 1,
    `${selector} must fit the visible viewport`,
  );
}

module.exports = { browserSuite, nextPaint, tap, fitsViewport };
