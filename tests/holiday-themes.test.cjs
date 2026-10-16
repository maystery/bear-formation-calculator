'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const holidays = require('../holiday-themes.js');
const settings = require('../settings.js');
const { HERO_SLOTS, HEROES } = require('../hero-ui.js');

test('automatic holidays follow inclusive local dates each year, with explicit overrides', () => {
  for (const year of [2026, 2027, 2030]) {
    for (const [month, day, expected] of [
      [8, 30, 'default'],
      [9, 1, 'halloween'],
      [9, 31, 'halloween'],
      [10, 2, 'halloween'],
      [10, 3, 'default'],
      [11, 25, 'default'],
    ]) {
      const date = new Date(year, month, day, 23, 59);
      assert.equal(holidays.resolve('auto', date), expected);
      assert.equal(holidays.resolve('default', date), 'default');
      assert.equal(holidays.resolve('halloween', date), 'halloween');
      assert.equal(holidays.resolve('unknown', date), expected);
    }
  }
});

test('recurring holiday ranges can span New Year', () => {
  const winter = { start: 1220, end: 105 };
  for (const [month, day, expected] of [
    [11, 19, false],
    [11, 20, true],
    [11, 31, true],
    [0, 1, true],
    [0, 5, true],
    [0, 6, false],
    [6, 1, false],
  ])
    assert.equal(holidays.isInWindow(new Date(2026, month, day), winter), expected);
});

test('pre-paint initialization agrees with the registry and survives unavailable or corrupt storage', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const bootstrap = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  for (const date of [
    new Date(2026, 8, 30),
    new Date(2026, 9, 1),
    new Date(2026, 10, 2),
    new Date(2026, 10, 3),
  ]) {
    for (const preference of [...holidays.PREFERENCES, 'invalid', undefined]) {
      const dataset = {};
      const clock = class extends Date {
        constructor() {
          super(date);
        }
      };
      vm.runInNewContext(bootstrap, {
        Date: clock,
        document: { documentElement: { dataset } },
        localStorage: { getItem: () => JSON.stringify({ holidayTheme: preference }) },
      });
      assert.equal(dataset.holiday, holidays.resolve(preference, date));
    }
  }
  for (const getItem of [
    () => '{broken',
    () => {
      throw new Error('Storage unavailable');
    },
  ]) {
    const dataset = {};
    vm.runInNewContext(bootstrap, {
      document: { documentElement: { dataset } },
      localStorage: { getItem },
    });
    assert.equal(dataset.holiday, holidays.resolve());
  }
});

test('Halloween has separate portraits and avatars for the entire roster, with classic fallbacks', () => {
  const root = path.resolve(__dirname, '..');
  for (const { key } of HERO_SLOTS) {
    for (const kind of ['portrait', 'avatar']) {
      const original = HEROES[key][kind];
      const themed = holidays.asset(key, kind, original, 'halloween');
      assert.notEqual(themed, original);
      assert.ok(fs.existsSync(path.join(root, themed)), themed);
      assert.ok(fs.existsSync(path.join(root, original)), original);
      assert.equal(holidays.asset(key, kind, original, 'default'), original);
      assert.equal(holidays.asset(key, kind, original, 'future-holiday'), original);
    }
  }
  assert.equal(
    holidays.asset('none', 'avatar', HEROES.none.avatar, 'halloween'),
    HEROES.none.avatar,
  );
});

test('holiday preferences persist independently and stay out of shared formation links', () => {
  const saved = {
    holidayTheme: 'halloween',
    holidayMotion: false,
    theme: 'light',
    selectedSeason: '4',
    si: '600k',
  };
  assert.deepEqual(settings.decodeSettings(saved), saved);
  assert.deepEqual(settings.decodeSettings({ holidayTheme: 'invalid' }), {});
  const url = new URL(settings.setupUrl('https://example.test/', saved));
  assert.equal(url.searchParams.has('holidayTheme'), false);
  assert.equal(url.searchParams.has('holidayMotion'), false);
  assert.equal(url.searchParams.has('theme'), false);
  assert.equal(url.searchParams.get('selectedSeason'), '4');
  assert.equal(
    settings.sharedSettings('?setup=1&si=5&holidayTheme=default').holidayTheme,
    undefined,
  );
});

test('capacity buff costumes use separate retained assets and fall back to Classic', () => {
  const root = path.resolve(__dirname, '..');
  for (const [key, file] of [
    ['valora', 'valora'],
    ['bison', 'mighty-bison'],
  ]) {
    const original = `assets/buffs/${file}.webp`;
    const seasonal = holidays.buffAsset(key, original, 'halloween');
    assert.equal(seasonal, `assets/holidays/halloween/buffs/${file}.webp`);
    assert.ok(fs.existsSync(path.join(root, seasonal)));
    assert.ok(fs.existsSync(path.join(root, seasonal.replace('.webp', '.png'))));
    assert.ok(fs.existsSync(path.join(root, original)));
    assert.equal(holidays.buffAsset(key, original, 'default'), original);
    assert.equal(holidays.buffAsset(key, original, 'future-holiday'), original);
  }
  assert.equal(holidays.buffAsset('future-buff', 'original.webp', 'halloween'), 'original.webp');
});
