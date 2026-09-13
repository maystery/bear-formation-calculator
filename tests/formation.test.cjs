'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateFormation, TROOP_KEYS } = require('../calculator-core.js');
const example = {
  troops: { inf: 281850, cav: 292799, arc: 566040 },
  ratios: { inf: 10, cav: 10, arc: 80 },
  marchCount: 5,
  leaders: ['chenko', 'yeonwoo', 'amane'],
  squadCapacity: 98900,
  baseCapacity: 139310,
  valoraLevel: 10,
  bisonLevel: 10,
  bisonEnabled: false,
  strategy: 'equal',
};

test('complete formation matches the documented mixed-capacity example', () => {
  const before = structuredClone(example);
  const result = calculateFormation(example);
  assert.equal(result.valid, true);
  assert.deepEqual(result.marchTotals, [169310, 169310, 169310, 98900, 98900]);
  assert.deepEqual(result.totals, { inf: 70573, cav: 70573, arc: 564584 });
  assert.equal(result.totalTroops, 705730);
  assert.deepEqual(result.capacityUsage, { hero: true, squad: true });
  assert.equal(result.bottlenecks.capacity, true);
  assert.deepEqual(result.bottlenecks.troops, []);
  assert.deepEqual(example, before, 'calculation must not mutate settings');
});

test('sequential formation fills leaders first and reports troop bottlenecks', () => {
  const result = calculateFormation({
    ...example,
    strategy: 'sequential',
    troops: { inf: 30000, cav: 30000, arc: 240000 },
  });
  assert.deepEqual(result.marchTotals, [169310, 130690, 0, 0, 0]);
  assert.deepEqual(
    result.bottlenecks.troops.map((x) => x.key),
    TROOP_KEYS,
  );
  assert.equal(result.bottlenecks.capacity, false);
});

test('active skill levels affect hero caps, while benched heroes do not add marches', () => {
  const result = calculateFormation({
    ...example,
    marchCount: 2,
    valoraLevel: 3,
    bisonLevel: 4,
    bisonEnabled: true,
  });
  assert.deepEqual(result.marchCaps, [154310, 154310]);
  assert.equal(result.capacityBuffs.appliedBisonBonus, 6000);
  assert.deepEqual(result.capacityUsage, { hero: true, squad: false });
  const noHeroes = calculateFormation({ ...example, leaders: [], bisonEnabled: true });
  assert.deepEqual(noHeroes.marchCaps, Array(5).fill(98900));
  assert.deepEqual(noHeroes.capacityUsage, { hero: false, squad: true });
});

test('zero caps mean unlimited and zero ratio components consume no troops', () => {
  const result = calculateFormation({
    ...example,
    baseCapacity: 0,
    squadCapacity: 0,
    ratios: { inf: 0, cav: 0, arc: 1 },
  });
  assert.equal(result.totalTroops, 566040);
  assert.deepEqual(result.totals, { inf: 0, cav: 0, arc: 566040 });
  assert.equal(result.totalCapacity, Infinity);
  assert.equal(result.bottlenecks.capacity, false);
  assert.equal(calculateFormation({ ...example, ratios: { inf: 0, cav: 0, arc: 0 } }).valid, false);
});

test('both strategies conserve whole troops across small stocks, ratios and march counts', () => {
  for (const strategy of ['equal', 'sequential']) {
    for (let count = 1; count <= 7; count++) {
      for (let stock = 0; stock <= 35; stock++) {
        const troops = { inf: stock, cav: stock * 2, arc: stock * 3 };
        const result = calculateFormation({
          ...example,
          troops,
          strategy,
          marchCount: count,
          ratios: { inf: 1, cav: 2, arc: 7 },
          squadCapacity: 13,
          baseCapacity: 0,
        });
        assert.equal(result.rows.length, count);
        assert.equal(
          result.totalTroops,
          result.marchTotals.reduce((a, b) => a + b, 0),
        );
        result.rows.forEach((row, i) => {
          assert.equal(
            TROOP_KEYS.reduce((sum, key) => sum + row[key], 0),
            result.marchTotals[i],
          );
          assert.ok(result.marchTotals[i] <= result.marchCaps[i]);
        });
        for (const key of TROOP_KEYS) {
          assert.ok(Number.isInteger(result.totals[key]) && result.totals[key] >= 0);
          assert.ok(result.totals[key] <= troops[key]);
        }
      }
    }
  }
});
