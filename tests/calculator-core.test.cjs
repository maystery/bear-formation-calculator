'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseAmount,
  parseRatio,
  allocate,
  splitByRatio,
  splitMarches,
  wholeTroops,
  findBottlenecks
} = require('../calculator-core.js');

test('parseAmount accepts supported formats', () => {
  assert.deepEqual(parseAmount('566k'), {valid:true, value:566000});
  assert.deepEqual(parseAmount('1.2m'), {valid:true, value:1200000});
  assert.deepEqual(parseAmount('281,850'), {valid:true, value:281850});
  assert.deepEqual(parseAmount('281 850'), {valid:true, value:281850});
  assert.deepEqual(parseAmount('.5k'), {valid:true, value:500});
});

test('parseAmount rejects malformed and unsafe values', () => {
  for(const value of ['', '1..2k', '1,2m', '-1', '12foo', '1e20', '99999999999999999999']){
    assert.equal(parseAmount(value).valid, false, value);
  }
});

test('parseRatio accepts finite non-negative numbers only', () => {
  assert.deepEqual(parseRatio('12.5'), {valid:true, value:12.5});
  assert.deepEqual(parseRatio('0'), {valid:true, value:0});
  for(const value of ['', '-1', 'nope', 'Infinity']){
    assert.equal(parseRatio(value).valid, false, value);
  }
});

test('allocate water-fills marches without exceeding caps', () => {
  assert.deepEqual(allocate(705730, [169310,169310,169310,98900,98900]),
    [169310,169310,169310,98900,98900]);
  assert.deepEqual(allocate(300000, [169310,169310,98900]), [100550,100550,98900]);
});

test('allocate fills higher-priority hero rallies before no-hero rallies', () => {
  assert.deepEqual(
    allocate(300000, [169310,169310,98900], [1,1,0]),
    [150000,150000,0]
  );
  assert.deepEqual(
    allocate(400000, [169310,169310,98900], [1,1,0]),
    [169310,169310,61380]
  );
});

test('allocate still water-fills evenly within each priority tier', () => {
  assert.deepEqual(
    allocate(250000, [80000,169310,98900,98900], [1,1,0,0]),
    [80000,169310,345,345]
  );
});

test('splitByRatio always sums to its requested total', () => {
  const split = splitByRatio(2, {inf:.25, cav:.25, arc:.5});
  assert.equal(split.inf + split.cav + split.arc, 2);
  assert.deepEqual(split, {inf:1, cav:0, arc:1});
});

test('splitMarches reconciles global stock rounding', () => {
  const totals = [313,313,312,312];
  const rows = splitMarches(totals, {inf:.1, cav:.1, arc:.8});
  assert.deepEqual(rows.map(row => row.inf + row.cav + row.arc), totals);
  assert.equal(rows.reduce((sum, row) => sum + row.arc, 0), 1000);
  assert.equal(rows.reduce((sum, row) => sum + row.inf, 0), 125);
  assert.equal(rows.reduce((sum, row) => sum + row.cav, 0), 125);
});

test('wholeTroops protects integral floating-point ceilings', () => {
  assert.equal(wholeTroops(999.9999999999999), 1000);
  assert.equal(wholeTroops(999.75), 999);
  assert.equal(wholeTroops(Infinity), Infinity);
});

test('findBottlenecks returns troop and capacity ties', () => {
  const limits = [
    {key:'inf', ceiling:1500.7},
    {key:'cav', ceiling:1700},
    {key:'arc', ceiling:1800}
  ];
  const tied = findBottlenecks(limits, 1500.2, 1500);
  assert.deepEqual(tied.troops.map(x => x.key), ['inf']);
  assert.equal(tied.capacity, true);
});
