'use strict';

// Optional integration checks: install Playwright and Chromium as described in README.md.
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const server = require('./browser-server.cjs')();

async function main(){
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({headless:true});
  try{
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      window.saves = [];
      window.feedback = [];
      const setItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value){
        if(key === 'bearcalc.v1') window.saves.push(JSON.parse(value));
        return setItem.call(this, key, value);
      };
      const animate = Element.prototype.animate;
      Element.prototype.animate = function(...args){
        window.feedback.push(this.id);
        return animate.apply(this, args);
      };
      window.edit = (id, value) => {
        const field = document.getElementById(id);
        field.value = value;
        field.dispatchEvent(new Event('input', {bubbles:true}));
        field.dispatchEvent(new Event('change', {bubbles:true}));
      };
      window.nextPaint = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    await page.goto(url);
    await page.waitForTimeout(350);
    assert.equal(await page.locator('#rows tbody tr').count(), 5);
    assert.equal(await page.evaluate(() => [...document.scripts].filter(script => script.src).every(script => script.defer)), true);
    assert.deepEqual(await page.evaluate(() => [...document.images].filter(image => !image.complete || !image.naturalWidth).map(image => image.src)), []);

    await page.evaluate(() => {
      window.rowUpdates = 0;
      window.heroUpdates = 0;
      new MutationObserver(records => window.rowUpdates += records.length)
        .observe(document.getElementById('rows'), {childList:true});
      new MutationObserver(records => window.heroUpdates += records.length)
        .observe(document.getElementById('heroGrid'), {subtree:true, childList:true, attributes:true});
      window.saves = [];
      for(let n = 1; n <= 10; n++) window.edit('sa', `${600 + n}k`);
    });
    await page.evaluate(() => window.nextPaint());
    assert.equal(await page.evaluate(() => window.rowUpdates), 1);
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => window.saves.length), 1);
    assert.equal(await page.evaluate(() => window.saves[0].sa), '610k');
    console.log('PASS: rapid input/change events produce one render and one debounced save');

    await page.evaluate(() => {
      window.rowUpdates = window.heroUpdates = 0;
      window.edit('ci', '100'); window.edit('cc', '100'); window.edit('ca', '800');
    });
    await page.evaluate(() => window.nextPaint());
    assert.equal(await page.evaluate(() => window.rowUpdates), 0);
    assert.equal(await page.evaluate(() => window.heroUpdates), 0);
    assert.match(await page.locator('#verdict').innerText(), /Matches the ratio/);
    await page.evaluate(() => { window.edit('tol', '0'); window.edit('ri', '20'); });
    await page.evaluate(() => window.nextPaint());
    assert.equal(await page.evaluate(() => window.rowUpdates), 1);
    assert.match(await page.locator('#verdict').innerText(), /Ratio needs adjustment/);
    console.log('PASS: checker edits leave formation and heroes untouched; mixed edits use the latest ratio');

    await page.evaluate(() => { window.feedback = []; window.edit('si', 'bad'); });
    await page.evaluate(() => window.nextPaint());
    await page.evaluate(() => window.edit('si', 'still bad'));
    await page.evaluate(() => window.nextPaint());
    assert.equal(await page.evaluate(() => window.feedback.filter(id => id === 'si').length), 1);
    assert.equal(await page.locator('#rows tbody tr').count(), 0);
    await page.evaluate(() => window.edit('ci', '200'));
    await page.evaluate(() => window.nextPaint());
    assert.equal(await page.locator('#checkRows tr').count(), 0);
    await page.evaluate(() => window.edit('si', '300k'));
    await page.evaluate(() => window.nextPaint());
    assert.equal(await page.locator('#si').getAttribute('aria-invalid'), null);
    assert.equal(await page.locator('#rows tbody tr').count(), 5);
    console.log('PASS: invalid inputs animate once and recover without stale checker results');

    await page.evaluate(() => {
      window.edit('sa', '720k');
      Object.defineProperty(navigator.clipboard, 'writeText', {configurable:true,
        value:async text => { window.copied = text; }});
      document.getElementById('copyFormation').click();
    });
    const copied = await page.evaluate(() => window.copied);
    const archerTotal = copied.split('\n').filter(line => /^(Total:|Left at home:)/.test(line))
      .reduce((sum, line) => sum + Number(line.match(/([\d,]+) archers/)[1].replaceAll(',', '')), 0);
    assert.equal(archerTotal, 720000);
    await page.evaluate(() => {
      window.saves = [];
      window.edit('sa', '730k');
      window.dispatchEvent(new PageTransitionEvent('pagehide'));
    });
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('bearcalc.v1')).sa), '730k');
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => window.saves.length), 1);
    await page.reload();
    assert.equal(await page.locator('#sa').inputValue(), '730k');
    console.log('PASS: copying flushes pending rendering and leaving flushes pending storage');

    await page.evaluate(() => {
      localStorage.setItem('bearcalc.v1', JSON.stringify({theme:'dark', sa:'730k'}));
    });
    await page.route('**/app.js', async route => {
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
    await page.waitForTimeout(350);
    assert.equal(await page.locator('html').getAttribute('data-theme'), null);
    assert.notEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('bearcalc.v1') || '{}').sa), '999k');
    console.log('PASS: saved theme applies before app.js and reset cancels pending saves');

    await page.goto(`${url}?setup=1&sa=810k&ri=20&rc=20&ra=60&fillStrategy=sequential&bison=1`);
    assert.equal(await page.locator('#sa').inputValue(), '810k');
    assert.equal(await page.locator('#bisonBuff').getAttribute('aria-checked'), 'true');
    assert.equal(await page.locator('#sharedNotice').isVisible(), true);
    await page.locator('#valoraSkillTrigger').scrollIntoViewIfNeeded();
    await page.evaluate(() => window.nextPaint());
    await page.locator('#valoraSkillTrigger').click();
    await page.locator('#valoraSkillMenu [data-level="5"]').click();
    await page.evaluate(() => window.nextPaint());
    assert.equal(await page.locator('#valoraBonusCard').innerText(), '+15k');
    await page.locator('#bisonBuff').click();
    await page.evaluate(() => window.nextPaint());
    assert.equal(await page.locator('#bisonBuff').getAttribute('aria-checked'), 'false');
    await page.evaluate(() => document.getElementById('amaOn').click());
    await page.evaluate(() => window.nextPaint());
    assert.match(await page.locator('#pill-amadeus').innerText(), /March/);
    await page.selectOption('#unit', 'full');
    await page.evaluate(() => window.nextPaint());
    assert.doesNotMatch(await page.locator('#tTotal').innerText(), /[km]/);
    console.log('PASS: shared setups, skill pickers, buff switches, hero checkboxes and units');

    await page.emulateMedia({reducedMotion:'reduce'});
    await page.evaluate(() => {
      window.feedback = [];
      window.edit('si', 'invalid');
      document.getElementById('theme').click();
    });
    await page.evaluate(() => window.nextPaint());
    assert.deepEqual(await page.evaluate(() => window.feedback), []);
    assert.deepEqual(errors, []);
    console.log('PASS: reduced motion disables feedback; no browser errors');
  }finally{
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; })
  .finally(() => server.close());
