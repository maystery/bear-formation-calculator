'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  SEASON_BADGE_BY_SEASON,
  HEROES,
  HERO_SLOTS,
  seasonBadge,
  heroCard,
  renderHeroCards
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
    ['amadeus','chenko','yeonwoo','amane','margot','hilde']);
  assert.deepEqual(
    Object.fromEntries(HERO_SLOTS.map(({key}) => [key, HEROES[key].season])),
    {amadeus:1, chenko:1, yeonwoo:1, amane:1, margot:4, hilde:2}
  );
  assert.deepEqual(
    Object.fromEntries(HERO_SLOTS.map(({key}) => [key, HEROES[key].requiredExpSkillLevel])),
    {amadeus:null, chenko:4, yeonwoo:4, amane:4, margot:4, hilde:5}
  );
});

test('hero cards compose separate portrait, badge, requirement and status layers', () => {
  const html = renderHeroCards();
  assert.equal((html.match(/class="herocard /g) || []).length, HERO_SLOTS.length);
  assert.equal((html.match(/class="hero-card__portrait"/g) || []).length, HERO_SLOTS.length);
  assert.equal((html.match(/class="hero-card__pattern"/g) || []).length, HERO_SLOTS.length);
  assert.equal((html.match(/class="hero-card__art-glow"/g) || []).length, HERO_SLOTS.length);
  assert.equal((html.match(/class="hero-card__art-fade"/g) || []).length, HERO_SLOTS.length);
  assert.equal((html.match(/class="season-badge"/g) || []).length, HERO_SLOTS.length);
  assert.equal((html.match(/class="pill"/g) || []).length, HERO_SLOTS.length);
  assert.equal((html.match(/style="--hero-art-scale:/g) || []).length, HERO_SLOTS.length);

  for(const slot of HERO_SLOTS){
    const hero = HEROES[slot.key];
    assert.equal(fs.existsSync(path.join(projectRoot, hero.portrait)), true, hero.portrait);
    assert.equal(fs.existsSync(path.join(projectRoot, hero.avatar)), true, hero.avatar);
    assert.deepEqual(Object.keys(hero.art), ['scale','x','y']);
    assert.match(html, new RegExp(`data-hero="${slot.key}"`));
    assert.match(html, new RegExp(`id="pill-${slot.key}"`));
  }
});

test('card defaults remain checkbox-driven and Amadeus starts disabled', () => {
  const amadeus = heroCard(HERO_SLOTS[0]);
  const chenko = heroCard(HERO_SLOTS[1]);
  assert.match(amadeus, /id="amaOn" class="sr-only"/);
  assert.doesNotMatch(amadeus, /class="sr-only" checked/);
  assert.match(chenko, /id="chenkoOn" class="sr-only" checked/);
  assert.doesNotMatch(amadeus, /class="heroreq"/);
  assert.match(chenko, /Exp\. Skill 1 &ge; Lv\./);
});
