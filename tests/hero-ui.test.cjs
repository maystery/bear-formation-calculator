'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  SEASON_BADGE_BY_SEASON,
  STAT_TYPES,
  RECOMMENDED_LEVEL_ICON,
  RECOMMENDED_STAT_VALUES,
  HERO_ARTBOARD,
  HEROES,
  HERO_SLOTS,
  makePortraitClipPath,
} = require('../hero-ui.js');

const projectRoot = path.resolve(__dirname, '..');

test('season badge renderer supports all seven season assets', () => {
  assert.deepEqual(Object.keys(SEASON_BADGE_BY_SEASON), ['1', '2', '3', '4', '5', '6', '7']);
  for (let season = 1; season <= 7; season++) {
    const asset = SEASON_BADGE_BY_SEASON[season];
    assert.equal(fs.existsSync(path.join(projectRoot, asset)), true, asset);
  }
});

test('hero presentation data preserves priority, seasons and skill recommendations', () => {
  assert.deepEqual(
    HERO_SLOTS.map((hero) => hero.key),
    ['weeWoo', 'amadeus', 'chenko', 'yeonwoo', 'amane', 'margot', 'vivian', 'ava', 'hilde'],
  );
  assert.deepEqual(Object.fromEntries(HERO_SLOTS.map(({ key }) => [key, HEROES[key].season])), {
    amadeus: 1,
    chenko: 1,
    yeonwoo: 1,
    amane: 1,
    margot: 4,
    vivian: 5,
    ava: 7,
    weeWoo: 7,
    hilde: 2,
  });
  assert.deepEqual(
    Object.fromEntries(['vivian', 'ava', 'weeWoo'].map((key) => [key, HEROES[key].variant])),
    { vivian: 'gold', ava: 'gold', weeWoo: 'gold' },
  );
  assert.deepEqual(
    Object.fromEntries(HERO_SLOTS.map(({ key }) => [key, HEROES[key].expeditionSkill.name])),
    {
      amadeus: 'Battle Ready',
      chenko: 'Stand of Arms',
      yeonwoo: 'On Guard',
      amane: 'Tri-Phalanx',
      margot: 'Warbringer',
      vivian: 'Crouching Tiger',
      ava: 'Dissolution',
      weeWoo: 'Artillerymen',
      hilde: 'Noble Path',
    },
  );
  assert.deepEqual(
    Object.fromEntries(
      HERO_SLOTS.map(({ key }) => [key, HEROES[key].expeditionSkill.recommendedLevel]),
    ),
    {
      amadeus: 4,
      chenko: 4,
      yeonwoo: 4,
      amane: 5,
      margot: 5,
      vivian: 5,
      ava: 5,
      weeWoo: 2,
      hilde: 5,
    },
  );
  assert.deepEqual(HEROES.ava.expeditionSkill.effects[0].values, [-5, -10, -15, -20, -25]);
  assert.deepEqual(
    HEROES.weeWoo.expeditionSkill.effects.map((effect) => effect.stat),
    ['attack', 'lethality'],
  );
  assert.deepEqual(
    HEROES.hilde.expeditionSkill.effects.map((effect) => effect.stat),
    ['attack', 'defense'],
  );
  assert.deepEqual(
    Object.fromEntries(HERO_SLOTS.map(({ key }) => [key, HEROES[key].art.strength])),
    {
      amadeus: 'subtle',
      chenko: 'subtle',
      yeonwoo: 'strong',
      amane: 'strong',
      margot: 'subtle',
      vivian: 'strong',
      ava: 'strong',
      weeWoo: 'medium',
      hilde: 'subtle',
    },
  );
});

test('hero artwork preserves transparency and valid breakout geometry', () => {
  for (const slot of HERO_SLOTS) {
    const hero = HEROES[slot.key];
    assert.equal(fs.existsSync(path.join(projectRoot, hero.portrait)), true, hero.portrait);
    assert.equal(fs.existsSync(path.join(projectRoot, hero.avatar)), true, hero.avatar);
    assert.deepEqual(Object.keys(hero.art), ['strength', 'breakout', 'x', 'y', 'width', 'height']);
    assert.equal(['subtle', 'medium', 'strong'].includes(hero.art.strength), true);
    assert.deepEqual(Object.keys(hero.art.breakout), [
      'start',
      'end',
      'height',
      'shoulder',
      'unrestricted',
      'allowLeft',
    ]);
    if (hero.art.breakout.unrestricted) {
      assert.equal(['amane', 'ava'].includes(slot.key), true);
      assert.equal(hero.art.breakout.start, 0);
      assert.equal(hero.art.breakout.end, HERO_ARTBOARD.width);
    } else {
      assert.equal(
        hero.art.breakout.start >= HERO_ARTBOARD.radius,
        true,
        `${slot.key} must preserve the rounded corner`,
      );
      assert.equal(hero.art.breakout.end <= HERO_ARTBOARD.width - HERO_ARTBOARD.radius, true);
      assert.equal(
        hero.art.breakout.start + hero.art.breakout.shoulder <
          hero.art.breakout.end - hero.art.breakout.shoulder,
        true,
      );
    }
    assert.equal(
      -hero.art.y < hero.art.breakout.height,
      true,
      `${slot.key} image box must remain below the breakout ceiling`,
    );
    const webp = fs.readFileSync(path.join(projectRoot, hero.portrait));
    assert.equal(webp.toString('ascii', 0, 4), 'RIFF');
    assert.equal(webp.toString('ascii', 8, 16), 'WEBPVP8X');
    assert.equal(Boolean(webp[20] & 0x10), true, `${hero.portrait} must contain an alpha channel`);
  }
});

test('stat icons and recommended values use available assets', () => {
  for (const stat of Object.values(STAT_TYPES))
    assert.ok(fs.existsSync(path.join(projectRoot, stat.icon)));
  assert.ok(fs.existsSync(path.join(projectRoot, RECOMMENDED_LEVEL_ICON)));
  assert.deepEqual(RECOMMENDED_STAT_VALUES, { lethality: 20, attack: 25 });
});

test('portrait clip path uses curved shoulders without a rectangular notch', () => {
  const d = makePortraitClipPath({ start: 20, end: 300, height: 34, shoulder: 36 });
  assert.match(d, /^M 16 0 L 20 0 C /);
  assert.equal((d.match(/ C /g) || []).length, 2);
  assert.equal((d.match(/ Q /g) || []).length, 4);
  assert.doesNotMatch(d, /L 20 -34/);
  assert.match(d, /Z$/);
});

test('unrestricted portrait clip opens the full top canvas', () => {
  const d = makePortraitClipPath({
    start: 0,
    end: 420,
    height: 50,
    shoulder: 0,
    unrestricted: true,
  });
  assert.match(d, /^M 0 -50 L 420 -50/);
  assert.doesNotMatch(d, / C /);
  assert.match(d, /Q 420 260 404 260/);
  assert.match(d, /Z$/);
});

test('left breakout opens the side canvas without opening the bottom', () => {
  const d = makePortraitClipPath({
    start: 22,
    end: 285,
    height: 28,
    shoulder: 34,
    allowLeft: true,
  });
  assert.match(d, /M -50 -50 L 3 -50 L 3 260 L -50 260 Z$/);
  assert.doesNotMatch(d, /-50 261/);
});
