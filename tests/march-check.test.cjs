'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { checkMarch } = require('../calculator-core.js');

test('an empty march has no verdict', () => {
  assert.equal(checkMarch({ inf: 0, cav: 0, arc: 0 }, { inf: 0.1, cav: 0.1, arc: 0.8 }, 3), null);
});

test('exact composition matches with zero tolerance and preserves its inputs', () => {
  const troops = Object.freeze({ inf: 100, cav: 100, arc: 800 });
  const ratio = Object.freeze({ inf: 0.1, cav: 0.1, arc: 0.8 });
  const result = checkMarch(troops, ratio, 0);
  assert.equal(result.matches, true);
  assert.deepEqual(result.ideal, troops);
  assert.deepEqual(result.differences, { inf: 0, cav: 0, arc: 0 });
});

test('tolerance is inclusive and reports both positive and negative deviations', () => {
  const troops = { inf: 15, cav: 5, arc: 80 };
  const ratio = { inf: 0.1, cav: 0.1, arc: 0.8 };
  const boundary = checkMarch(troops, ratio, 5);
  assert.equal(boundary.matches, true);
  const outside = checkMarch(troops, ratio, 4.99);
  assert.equal(outside.matches, false);
  assert.deepEqual(outside.outside, { inf: true, cav: true, arc: false });
  assert.deepEqual(outside.differences, { inf: 5, cav: -5, arc: 0 });
  assert.equal(outside.worstKey, 'inf', 'ties follow troop display order');
  assert.equal(outside.adjustment, 5);
});

test('fractional ratios reconcile target counts and zero-share troops are flagged', () => {
  const result = checkMarch({ inf: 1, cav: 0, arc: 1 }, { inf: 0.25, cav: 0.25, arc: 0.5 }, 0);
  assert.deepEqual(result.ideal, { inf: 1, cav: 0, arc: 1 });
  assert.equal(result.matches, false, 'percentage tolerance is independent of rounded counts');
  assert.equal(result.adjustment, 0);
  const zeroShare = checkMarch({ inf: 1, cav: 0, arc: 99 }, { inf: 0, cav: 0, arc: 1 }, 0);
  assert.equal(zeroShare.outside.inf, true);
  assert.equal(zeroShare.worstDifference, 1);
});
