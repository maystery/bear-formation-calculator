'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  SEASON_BADGE_BY_SEASON,
  STAT_TYPES,
  MIN_LEVEL_ICON,
  RECOMMENDED_STAT_VALUES,
  HERO_ARTBOARD,
  HEROES,
  HERO_SLOTS,
  seasonBadge,
  statType,
  skillLevelRows,
  renderStatLegend,
  makePortraitClipPath,
  heroCard,
  renderHeroCards,
  renderHeroPriority
} = require('../hero-ui.js');

const projectRoot = path.resolve(__dirname, '..');

test('season badge renderer supports all seven season assets', () => {
  assert.deepEqual(Object.keys(SEASON_BADGE_BY_SEASON), ['1','2','3','4','5','6','7']);
  for(let season = 1; season <= 7; season++){
    const asset = SEASON_BADGE_BY_SEASON[season];
    assert.equal(fs.existsSync(path.join(projectRoot, asset)), true, asset);
    assert.match(seasonBadge(season), new RegExp(`aria-label="Season ${season}"`));
    assert.match(seasonBadge(season), new RegExp(`src="${asset}"`));
  }
});

test('hero presentation data preserves priority, seasons and skill requirements', () => {
  assert.deepEqual(HERO_SLOTS.map(hero => hero.key),
    ['weeWoo','amadeus','chenko','yeonwoo','amane','margot','vivian','ava','hilde']);
  assert.deepEqual(
    Object.fromEntries(HERO_SLOTS.map(({key}) => [key, HEROES[key].season])),
    {amadeus:1, chenko:1, yeonwoo:1, amane:1, margot:4, vivian:5, ava:7, weeWoo:7, hilde:2}
  );
  assert.deepEqual(
    Object.fromEntries(HERO_SLOTS.map(({key}) => [key, HEROES[key].requiredExpSkillLevel])),
    {amadeus:null, chenko:4, yeonwoo:4, amane:4, margot:4, vivian:4, ava:4, weeWoo:4, hilde:5}
  );
  assert.deepEqual(
    Object.fromEntries(['vivian','ava','weeWoo'].map(key => [key, HEROES[key].variant])),
    {vivian:'gold', ava:'gold', weeWoo:'gold'}
  );
  assert.deepEqual(
    Object.fromEntries(HERO_SLOTS.map(({key}) => [key, HEROES[key].expeditionSkill.name])),
    {
      amadeus:'Battle Ready', chenko:'Stand of Arms', yeonwoo:'On Guard',
      amane:'Tri-Phalanx', margot:'Warbringer', vivian:'Crouching Tiger',
      ava:'Dissolution', weeWoo:'Artillerymen', hilde:'Noble Path'
    }
  );
  assert.deepEqual(
    Object.fromEntries(HERO_SLOTS.map(({key}) => [key, HEROES[key].expeditionSkill.minLevel])),
    {amadeus:4, chenko:4, yeonwoo:4, amane:5, margot:5, vivian:5, ava:5, weeWoo:2, hilde:5}
  );
  assert.deepEqual(HEROES.ava.expeditionSkill.effects[0].values, [-5,-10,-15,-20,-25]);
  assert.deepEqual(HEROES.weeWoo.expeditionSkill.effects.map(effect => effect.stat),
    ['attack','lethality']);
  assert.deepEqual(HEROES.hilde.expeditionSkill.effects.map(effect => effect.stat),
    ['attack','defense']);
  assert.deepEqual(
    Object.fromEntries(HERO_SLOTS.map(({key}) => [key, HEROES[key].art.strength])),
    {
      amadeus:'subtle', chenko:'subtle', yeonwoo:'strong', amane:'strong', margot:'subtle',
      vivian:'strong', ava:'strong', weeWoo:'medium', hilde:'subtle'
    }
  );
});

test('visible assignment priority is rendered from the deployment order', () => {
  assert.equal(renderHeroPriority(),
    '<span>Assignment priority</span>Wee &amp; Woo <b>&rarr;</b> Amadeus <b>&rarr;</b> Chenko <b>&rarr;</b> Yeonwoo <b>&rarr;</b> Amane <b>&rarr;</b> Margot <b>&rarr;</b> Vivian <b>&rarr;</b> Ava <b>&rarr;</b> Hilde');
});

test('hero cards compose one clipped SVG portrait with separate chrome and content', () => {
  const html = renderHeroCards();
  const effectCount = HERO_SLOTS.reduce((total, {key}) =>
    total + HEROES[key].expeditionSkill.effects.length, 0);
  assert.equal((html.match(/class="herocard /g) || []).length, HERO_SLOTS.length);
  assert.equal((html.match(/class="hero-card-shell"/g) || []).length, HERO_SLOTS.length);
  assert.equal((html.match(/class="hero-card__surface"/g) || []).length, HERO_SLOTS.length);
  assert.equal((html.match(/class="hero-card__border"/g) || []).length, HERO_SLOTS.length);
  assert.equal((html.match(/class="hero-card__background"/g) || []).length, HERO_SLOTS.length);
  assert.equal((html.match(/class="hero-card__art"/g) || []).length, HERO_SLOTS.length);
  assert.equal((html.match(/class="hero-card__image"/g) || []).length, HERO_SLOTS.length);
  assert.equal((html.match(/<clipPath /g) || []).length, HERO_SLOTS.length);
  assert.equal((html.match(/class="hero-card__clip-shape"/g) || []).length, HERO_SLOTS.length);
  assert.equal((html.match(/<rect /g) || []).length, 0);
  assert.equal((html.match(/class="hero-card__pattern"/g) || []).length, HERO_SLOTS.length);
  assert.equal((html.match(/class="hero-card__art-glow"/g) || []).length, HERO_SLOTS.length);
  assert.equal((html.match(/class="hero-card__art-fade"/g) || []).length, HERO_SLOTS.length);
  assert.equal((html.match(/class="hero-card__info-bg"/g) || []).length, HERO_SLOTS.length);
  assert.equal((html.match(/class="season-badge"/g) || []).length, HERO_SLOTS.length);
  assert.equal((html.match(/class="pill"/g) || []).length, HERO_SLOTS.length);
  assert.equal((html.match(/class="hero-skill-details"/g) || []).length, HERO_SLOTS.length);
  assert.equal((html.match(/hero-stat--interactive/g) || []).length, effectCount);
  assert.equal((html.match(/class="hero-skill-popover /g) || []).length, effectCount);
  assert.equal((html.match(/class="hero-skill-min"/g) || []).length, HERO_SLOTS.length);
  assert.equal((html.match(/Requires Lv\./g) || []).length, HERO_SLOTS.length);
  assert.doesNotMatch(html, /Exp\. Skill 1|Lv\. [1-5] \/ 5|progress-dot/);
  assert.doesNotMatch(html, /portrait-base|portrait-breakout|corner-protector/);
  assert.match(html, /class="hero-card__surface"[\s\S]*class="hero-card__border"[\s\S]*class="hero-card__art"[\s\S]*class="hero-card__art-fade"[\s\S]*class="hero-card__info-bg"[\s\S]*class="hero-card__content"/);

  for(const slot of HERO_SLOTS){
    const hero = HEROES[slot.key];
    assert.equal(fs.existsSync(path.join(projectRoot, hero.portrait)), true, hero.portrait);
    assert.equal(fs.existsSync(path.join(projectRoot, hero.avatar)), true, hero.avatar);
    assert.deepEqual(Object.keys(hero.art), ['strength','breakout','x','y','width','height']);
    assert.equal(['subtle','medium','strong'].includes(hero.art.strength), true);
    assert.deepEqual(Object.keys(hero.art.breakout),
      ['start','end','height','shoulder','unrestricted','allowLeft']);
    if(hero.art.breakout.unrestricted){
      assert.equal(['amane','ava'].includes(slot.key), true);
      assert.equal(hero.art.breakout.start, 0);
      assert.equal(hero.art.breakout.end, HERO_ARTBOARD.width);
    }else{
      assert.equal(hero.art.breakout.start >= HERO_ARTBOARD.radius, true,
        `${slot.key} must preserve the rounded corner`);
      assert.equal(hero.art.breakout.end <= HERO_ARTBOARD.width - HERO_ARTBOARD.radius, true);
      assert.equal(hero.art.breakout.start + hero.art.breakout.shoulder
        < hero.art.breakout.end - hero.art.breakout.shoulder, true);
    }
    assert.equal(-hero.art.y < hero.art.breakout.height, true,
      `${slot.key} image box must remain below the breakout ceiling`);
    assert.match(html, new RegExp(`data-hero="${slot.key}"`));
    assert.match(html, new RegExp(`id="pill-${slot.key}"`));
    const card = heroCard(slot);
    const portraitSources = [...card.matchAll(/class="hero-card__image" href="([^"]+)"/g)]
      .map(match => match[1]);
    assert.deepEqual(portraitSources, [hero.portrait]);
    assert.match(card, new RegExp(`id="hero-art-clip-${slot.key}"`));
    assert.match(card, new RegExp(`clip-path="url\\(#hero-art-clip-${slot.key}\\)"`));
    if(hero.art.breakout.unrestricted){
      assert.match(card, /<path class="hero-card__clip-shape" d="M 0 -50 L 420 -50/);
    }else{
      assert.match(card, /<path class="hero-card__clip-shape" d="M 16 0 L /);
    }
    const png = fs.readFileSync(path.join(projectRoot, hero.portrait));
    assert.equal([4,6].includes(png[25]), true, `${hero.portrait} must contain an alpha channel`);
  }
  assert.equal(HEROES.amane.art.breakout.unrestricted, true);
  assert.equal(HEROES.ava.art.breakout.unrestricted, true);
  assert.deepEqual(
    HERO_SLOTS.filter(({key}) => HEROES[key].art.breakout.allowLeft).map(({key}) => key),
    ['weeWoo','yeonwoo','amane','vivian','ava']
  );
});

test('stat metadata uses supplied assets and reusable stat markup', () => {
  assert.deepEqual(Object.keys(STAT_TYPES),
    ['attack','lethality','defense','enemyDamageTaken','enemyDefense']);
  for(const [key, type] of Object.entries(STAT_TYPES)){
    assert.equal(fs.existsSync(path.join(projectRoot, type.icon)), true, type.icon);
    assert.match(statType(key), new RegExp(`data-stat="${key}"`));
    assert.match(statType(key), new RegExp(`src="${type.icon}"`));
    assert.match(statType(key), new RegExp(type.label));
  }
  assert.equal(fs.existsSync(path.join(projectRoot, MIN_LEVEL_ICON)), true);
  const legend = renderStatLegend();
  assert.equal((legend.match(/class="stat-legend__item"/g) || []).length, 5);
  assert.doesNotMatch(legend, /stat-legend__description/);
  assert.match(legend, /title="Increases Squad Attack\."/);
});

test('skill progression rows show signed values, changes, and the minimum row', () => {
  const positive = skillLevelRows({values:[5,10,15,20,25]}, 3);
  assert.match(positive, /Lv\. 3<\/span><strong>\+15%/);
  assert.match(positive, /class="skill-level-row is-minimum" aria-label="minimum required level"><span>Lv\. 3/);
  assert.equal((positive.match(/&#9650; \+5%/g) || []).length, 4);
  const negative = skillLevelRows({values:[-5,-10,-15,-20,-25]}, 1);
  assert.match(negative, /<strong>&minus;5%<\/strong>/);
  assert.equal((negative.match(/&#9660; &minus;5%/g) || []).length, 4);
  const selected = skillLevelRows({values:[5,10,15,20,25]}, 2, 4);
  assert.match(selected, /class="skill-level-row is-selected" aria-label="selected level"><span>Lv\. 4/);
  const cappedSelected = skillLevelRows({values:[5,10,15,20,25]}, 2, 10);
  assert.match(cappedSelected, /class="skill-level-row is-selected" aria-label="selected level"><span>Lv\. 5/);
  const recommended = skillLevelRows({values:[5,10,15,20,25]}, 1, null, 20);
  assert.match(recommended,
    /class="skill-level-row is-recommended" aria-label="recommended value"><span>Lv\. 4/);
  assert.deepEqual(RECOMMENDED_STAT_VALUES, {lethality:20, attack:25});
  const unavailable = skillLevelRows({values:[3,6,9,12,15]}, 2, null, 25);
  assert.doesNotMatch(unavailable, /is-recommended/);
});

test('portrait clip path uses curved shoulders without a rectangular notch', () => {
  const d = makePortraitClipPath({start:20, end:300, height:34, shoulder:36});
  assert.match(d, /^M 16 0 L 20 0 C /);
  assert.equal((d.match(/ C /g) || []).length, 2);
  assert.equal((d.match(/ Q /g) || []).length, 4);
  assert.doesNotMatch(d, /L 20 -34/);
  assert.match(d, /Z$/);
});

test('unrestricted portrait clip opens the full top canvas', () => {
  const d = makePortraitClipPath({
    start:0, end:420, height:50, shoulder:0, unrestricted:true
  });
  assert.match(d, /^M 0 -50 L 420 -50/);
  assert.doesNotMatch(d, / C /);
  assert.match(d, /Q 420 260 404 260/);
  assert.match(d, /Z$/);
});

test('left breakout opens the side canvas without opening the bottom', () => {
  const d = makePortraitClipPath({
    start:22, end:285, height:28, shoulder:34, allowLeft:true
  });
  assert.match(d, /M -50 -50 L 3 -50 L 3 260 L -50 260 Z$/);
  assert.doesNotMatch(d, /-50 261/);
});

test('SVG clip architecture replaces duplicate portraits and CSS breakout masks', () => {
  const css = fs.readFileSync(path.join(projectRoot, 'styles.css'), 'utf8');
  const app = fs.readFileSync(path.join(projectRoot, 'app.js'), 'utf8');
  const index = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
  assert.match(css, /\.herocard\{[\s\S]*?overflow:visible;[\s\S]*?\}/);
  assert.match(css, /\.hero-card__surface\{[^}]*overflow:hidden;/);
  assert.match(css, /\.hero-card__border\{[^}]*z-index:2;[^}]*border:1px solid var\(--hero-border-color\)/);
  assert.match(css, /\.herocard::after\{[^}]*z-index:6;[^}]*height:18px;[^}]*border:1px solid var\(--hero-border-color\);border-top:0;/);
  assert.match(css, /\.hero-card__art\{[^}]*z-index:3;[^}]*overflow:visible;/);
  assert.match(css, /\.hero-card__art-fade\{[^}]*z-index:4;/);
  assert.match(css, /\.hero-card__info-bg\{[^}]*z-index:4;[^}]*inset:1px 1px 1px 42%;/);
  assert.match(css, /\.hero-card__content\{[^}]*z-index:5;/);
  assert.match(css, /\.hero-card__content\{[^}]*width:48%;[^}]*margin-left:52%;/);
  assert.match(css, /\.season-badge\{[^}]*position:absolute;[^}]*top:0;left:50%;width:74px;height:74px;/);
  assert.doesNotMatch(css, /\.season-badge::after/);
  assert.match(css, /@media\(max-width:640px\)\{\s*\.hero-grid\{row-gap:28px\}/);
  assert.match(css, /@media\(max-width:450px\)\{\s*\.hero-grid\{[^}]*row-gap:28px\}/);
  assert.doesNotMatch(css, /portrait-breakout|portrait-base|corner-protector|corner-mask|mask-mode/);
  assert.match(index, /class="hero-skill-portal" id="heroSkillPortal"/);
  assert.match(app, /skillPortal\.appendChild\(popover\)/);
  assert.match(app, /getBoundingClientRect\(\)/);
  assert.match(app, /placement = 'right'/);
  assert.match(app, /placement = 'left'/);
  assert.match(app, /placement = 'above'/);
  assert.match(css, /\.hero-skill-popover\{[^}]*position:fixed;[^}]*overflow-y:auto;/);
  assert.doesNotMatch(css, /hero-skill-popover--dual/);
  assert.match(app, /event\.target\.closest\('\.hero-stat--interactive'\)/);
});

test('card defaults remain checkbox-driven and Amadeus starts disabled', () => {
  const amadeus = heroCard(HERO_SLOTS.find(({key}) => key === 'amadeus'));
  const chenko = heroCard(HERO_SLOTS.find(({key}) => key === 'chenko'));
  assert.match(amadeus, /id="amaOn" class="sr-only"/);
  assert.doesNotMatch(amadeus, /class="sr-only" checked/);
  assert.match(chenko, /id="chenkoOn" class="sr-only" checked/);
  assert.match(amadeus, /Battle Ready/);
  assert.match(chenko, /Stand of Arms/);
  assert.match(chenko,
    /aria-expanded="false" aria-controls="skill-popover-chenko-lethality"/);
  for(const key of ['amane','vivian','ava','weeWoo']){
    assert.match(heroCard(HERO_SLOTS.find(slot => slot.key === key)), /hero-card--nudge-skill/);
  }
  assert.doesNotMatch(chenko, /hero-card--nudge-skill/);
  const hilde = heroCard(HERO_SLOTS.find(({key}) => key === 'hilde'));
  assert.match(hilde, /aria-controls="skill-popover-hilde-attack"/);
  assert.match(hilde, /aria-controls="skill-popover-hilde-defense"/);
  assert.equal((hilde.match(/class="hero-skill-popover /g) || []).length, 2);
});
