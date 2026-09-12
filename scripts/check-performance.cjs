'use strict';

const assert = require('node:assert/strict');
const {chromium, webkit} = require('playwright');
const server = require('./browser-server.cjs')();
const viewport = {width:390, height:844};
const nextPaint = page => page.evaluate(() => new Promise(resolve =>
  requestAnimationFrame(() => requestAnimationFrame(resolve))));

async function check(browser, url, engine){
  const page = await browser.newPage({viewport, isMobile:true, hasTouch:true});
  const requests = [];
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if(/\/heroes\/[^/]+\.webp$/.test(request.url())) requests.push(request.url());
  });
  try{
    await page.goto(url);
    await page.evaluate(() => {
      window.loadedPortraits = [];
      document.querySelectorAll('.hero-card__image').forEach(image => {
        image.addEventListener('load', () => window.loadedPortraits.push(image.getAttribute('href')));
      });
    });
    await nextPaint(page);
    assert.equal(await page.locator('.hero-card__image[href]').count(), 0);
    assert.equal(requests.length, 0, 'off-screen portraits must not download on startup');
    assert.equal(await page.evaluate(() => document.getAnimations().filter(animation =>
      ['hero-card-pulse','hero-border-sweep'].includes(animation.animationName)
      && animation.playState === 'running').length), 0);
    const card = page.locator('[data-hero="weeWoo"]');
    const originalSize = await card.evaluate(element => ({width:element.offsetWidth, height:element.offsetHeight}));
    const firstTop = await card.evaluate(element => element.getBoundingClientRect().top + scrollY);
    await page.evaluate(top => scrollTo(0, top - innerHeight - 200), firstTop);
    await page.waitForFunction(() => window.loadedPortraits.includes('assets/heroes/weeandwoo.webp'));
    assert.ok(await card.evaluate(element => element.getBoundingClientRect().top > innerHeight),
      'portrait should preload before reaching the visible viewport');
    assert.equal(await card.evaluate(element => getComputedStyle(element).animationPlayState), 'paused');
    assert.equal(await page.locator('[data-hero="hilde"] .hero-card__image').getAttribute('href'), null);
    assert.deepEqual(await card.evaluate(element => ({width:element.offsetWidth, height:element.offsetHeight})), originalSize);
    await card.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-hero="weeWoo"]')).animationPlayState === 'running');
    assert.equal(await card.evaluate(element => getComputedStyle(element, '::before').animationPlayState), 'running');
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-hero="weeWoo"]')).animationPlayState === 'paused');
    await card.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-hero="weeWoo"]')).animationPlayState === 'running');
    assert.equal(requests.filter(request => request.endsWith('/weeandwoo.webp')).length, 1);
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await card.evaluate(element => getComputedStyle(element).animationName), 'none');
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {configurable:true, value:true});
      document.dispatchEvent(new Event('visibilitychange'));
    });
    assert.equal(await card.evaluate(element => getComputedStyle(element).animationPlayState), 'paused');
    await page.evaluate(() => {
      delete document.hidden;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-hero="weeWoo"]')).animationPlayState === 'running');
    console.log(`PASS: ${engine} portrait preloading, no duplicate downloads or layout shift, visibility and reduced motion`);

    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForFunction(() => document.querySelectorAll('.herocard.is-visible').length === 0);
    await page.evaluate(() => {
      window.uiMutations = {heroes:0, buffs:0, valora:0, bison:0};
      for(const [key, id] of [['heroes','heroGrid'], ['buffs','capacityBuffsTitle'],
        ['valora','valoraSkillMenu'], ['bison','bisonSkillMenu']]){
        const node = key === 'buffs' ? document.getElementById(id).closest('section') : document.getElementById(id);
        new MutationObserver(records => window.uiMutations[key] += records.length)
          .observe(node, {subtree:true, childList:true, attributes:true, characterData:true});
      }
    });
    await page.locator('#sa').fill('700k');
    await nextPaint(page);
    await page.locator('#ri').fill('20');
    await nextPaint(page);
    assert.deepEqual(await page.evaluate(() => window.uiMutations), {heroes:0, buffs:0, valora:0, bison:0});
    await page.evaluate(() => {
      const marches = document.getElementById('n');
      marches.value = '7';
      marches.dispatchEvent(new Event('input', {bubbles:true}));
    });
    await nextPaint(page);
    assert.equal(await page.locator('#pill-ava').innerText(), 'March 7');
    assert.ok(await page.evaluate(() => window.uiMutations.heroes > 0));
    await page.evaluate(() => document.getElementById('amaOn').click());
    await nextPaint(page);
    assert.equal(await page.locator('#pill-amadeus').innerText(), 'March 2');
    assert.equal(await page.locator('#pill-ava').innerText(), 'No march');
    await page.evaluate(() => {
      const skill = document.getElementById('valoraSkill');
      skill.value = '5';
      skill.dispatchEvent(new Event('input', {bubbles:true}));
    });
    await nextPaint(page);
    assert.equal(await page.locator('#valoraBonusCard').innerText(), '+15k');
    assert.ok(await page.evaluate(() => window.uiMutations.valora > 0));
    assert.equal(await page.evaluate(() => window.uiMutations.bison), 0);
    await page.evaluate(() => {
      window.uiMutations = {heroes:0, buffs:0, valora:0, bison:0};
      document.getElementById('bisonBuff').click();
    });
    await nextPaint(page);
    assert.equal(await page.locator('#bisonBuff').getAttribute('aria-checked'), 'true');
    assert.ok(await page.evaluate(() => window.uiMutations.buffs > 0));
    assert.equal(await page.evaluate(() => window.uiMutations.heroes + window.uiMutations.valora + window.uiMutations.bison), 0);
    await page.evaluate(() => { document.getElementById('capacityEdit').open = true; });
    await page.locator('#cap').fill('invalid');
    await nextPaint(page);
    assert.equal(await page.locator('#capacityBaseValue').innerText(), '–');
    await page.locator('#cap').fill('0');
    await nextPaint(page);
    assert.equal(await page.locator('#tCap').innerText(), '∞');
    assert.equal(await page.locator('#capacityBaseValue').innerText(), '0');
    await page.locator('#cap').fill('160k');
    await nextPaint(page);
    assert.equal(await page.locator('#tCap').innerText(), '190k');
    console.log(`PASS: ${engine} unchanged controls have zero mutations; hero, march and capacity changes still refresh correctly`);

    await page.evaluate(() => {
      window.scrollWork = {queries:0, frames:0};
      const query = document.querySelectorAll.bind(document);
      document.querySelectorAll = selector => { window.scrollWork.queries++; return query(selector); };
      const frame = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = callback => { window.scrollWork.frames++; return frame(callback); };
    });
    const closedWork = await page.evaluate(() => {
      window.scrollWork = {queries:0, frames:0};
      for(let i = 0; i < 20; i++){
        window.dispatchEvent(new Event('scroll'));
        window.dispatchEvent(new Event('resize'));
      }
      return {...window.scrollWork};
    });
    assert.deepEqual(closedWork, {queries:0, frames:0});
    const picker = page.locator('#valoraSkillTrigger');
    await picker.scrollIntoViewIfNeeded();
    await nextPaint(page);
    await picker.tap();
    assert.equal(await page.locator('#valoraSkillMenu').isVisible(), true);
    await page.evaluate(() => window.dispatchEvent(new Event('scroll')));
    assert.equal(await page.locator('#valoraSkillMenu').isVisible(), false);
    const trigger = page.locator('[data-hero="weeWoo"] .hero-stat--attack.hero-stat--interactive');
    await trigger.scrollIntoViewIfNeeded();
    await nextPaint(page);
    await trigger.tap();
    await nextPaint(page);
    assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
    const openWork = await page.evaluate(() => {
      window.scrollWork = {queries:0, frames:0};
      for(let i = 0; i < 20; i++) window.dispatchEvent(new Event('scroll'));
      return {...window.scrollWork};
    });
    assert.deepEqual(openWork, {queries:0, frames:1});
    await nextPaint(page);
    await page.touchscreen.tap(5, 5);
    assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
    console.log(`PASS: ${engine} closed popups do no scroll work; open tooltip positioning batches into one frame`);
    assert.deepEqual(errors, []);
  }finally{ await page.close(); }

  for(const fallback of [false, true]){
    const page = await browser.newPage({viewport, isMobile:true, hasTouch:true});
    try{
      await page.addInitScript(fallback => {
        localStorage.setItem('bearcalc.v1', JSON.stringify({foldHeroes:false}));
        if(fallback) delete window.IntersectionObserver;
      }, fallback);
      await page.goto(url);
      await nextPaint(page);
      assert.equal(await page.locator('.hero-card__image[href]').count(), fallback ? 9 : 0);
      await page.locator('#foldHeroes > summary').tap();
      await page.waitForFunction(() => document.querySelector('.hero-card__image[href]'));
      if(!fallback){
        await page.locator('[data-hero="hilde"]').scrollIntoViewIfNeeded();
        await page.waitForFunction(() => document.querySelector('[data-hero="hilde"] .hero-card__image').hasAttribute('href'));
        await page.locator('#foldHeroes > summary').tap();
        await page.waitForFunction(() => document.querySelectorAll('.herocard.is-visible').length === 0);
      }
    }finally{ await page.close(); }
  }
  console.log(`PASS: ${engine} collapsed heroes load on expansion; missing IntersectionObserver falls back to eager artwork`);
}

async function main(){
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/`;
  for(const [engine, browserType] of [['chromium',chromium], ['webkit',webkit]]){
    const browser = await browserType.launch({headless:true});
    try{ await check(browser, url, engine); }
    finally{ await browser.close(); }
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; })
  .finally(() => server.close());
