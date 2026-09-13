'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { capacityBuffSummary } = require('../calculator-core.js');

const projectRoot = path.resolve(__dirname, '..');

test('active Bison applies its recorded bonus to squad capacity', () => {
  const result = capacityBuffSummary(150210, true);
  assert.equal(result.total, 195210);
  assert.equal(result.appliedBisonBonus, 15000);
});

test('inactive Bison preserves but does not apply its recorded bonus', () => {
  const off = capacityBuffSummary(150210, false);
  const onAgain = capacityBuffSummary(off.baseCapacity, true, {
    valoraBonus: off.valoraBonus,
    bisonRecordedBonus: off.bisonRecordedBonus,
  });
  assert.equal(off.total, 180210);
  assert.equal(off.appliedBisonBonus, 0);
  assert.equal(off.bisonRecordedBonus, 15000);
  assert.equal(onAgain.bisonRecordedBonus, 15000);
  assert.equal(onAgain.total, 195210);
});

test('Bison skill levels scale the recorded capacity bonus', () => {
  for (const [level, bonus] of [
    [1, 1500],
    [5, 7500],
    [10, 15000],
  ]) {
    const result = capacityBuffSummary(150210, true, {
      valoraBonus: 30000,
      bisonRecordedBonus: level * 1500,
    });
    assert.equal(result.bisonRecordedBonus, bonus);
    assert.equal(result.total, 180210 + bonus);
  }
});

test('capacity buff artwork exists', () => {
  for (const asset of ['assets/buffs/valora.webp', 'assets/buffs/mighty-bison.webp']) {
    assert.equal(fs.existsSync(path.join(projectRoot, asset)), true, asset);
  }
});
