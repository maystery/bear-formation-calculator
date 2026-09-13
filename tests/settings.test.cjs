'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const settings = require('../settings.js');

const saved = {
  si: '566k',
  cap: 139310,
  amaOn: false,
  chenkoOn: true,
  bisonBuffEnabled: true,
  bisonSkill: '4',
  valoraSkill: '8',
  n: '7',
  fillStrategy: 'sequential',
  unit: 'full',
  theme: 'dark',
  foldHeroes: false,
  ci: 'bad draft',
};

test('existing saved settings keep their types, drafts and independent preferences', () => {
  assert.deepEqual(settings.decodeSettings(saved), { ...saved, cap: '139310' });
  for (const value of [null, [], 'text', 42]) assert.deepEqual(settings.decodeSettings(value), {});
  assert.deepEqual(
    settings.decodeSettings({
      si: { value: 1 },
      cap: null,
      amaOn: 'false',
      bisonBuffEnabled: 1,
      unit: 'invalid',
      fillStrategy: 'invalid',
      theme: 'invalid',
      foldCap: 'true',
      unknown: 'value',
    }),
    {},
  );
});

test('shared setups round-trip formation fields and exclude local preferences and checker drafts', () => {
  const url = new URL(settings.setupUrl('https://example.test/?old=value#fragment', saved));
  assert.equal(url.hash, '');
  assert.equal(url.searchParams.get('setup'), '1');
  assert.equal(url.searchParams.get('bison'), '1');
  assert.equal(url.searchParams.get('amaOn'), '0');
  assert.equal(url.searchParams.has('theme'), false);
  assert.equal(url.searchParams.has('foldHeroes'), false);
  assert.equal(url.searchParams.has('ci'), false);
  const formation = { ...saved };
  delete formation.theme;
  delete formation.foldHeroes;
  delete formation.ci;
  assert.deepEqual(settings.sharedSettings(url.search), { ...formation, cap: '139310' });
  assert.deepEqual(settings.sharedSettings('?si=5'), {});
});

test('partial shared setups override only recognized correctly typed fields', () => {
  const shared = settings.sharedSettings('?setup=1&si=900k&bison=0&amaOn=no&theme=light&unit=no');
  assert.deepEqual(shared, { si: '900k', bisonBuffEnabled: false });
  const merged = { ...settings.decodeSettings(saved), ...shared };
  assert.equal(merged.theme, 'dark');
  assert.equal(merged.si, '900k');
  assert.equal(merged.amaOn, false);
  assert.equal(merged.bisonSkill, '4');
});

test('reset removes current and legacy setup parameters while preserving unrelated URL data', () => {
  const url = new URL(
    settings.resetUrl('https://example.test/?setup=1&bison=1&sav=10&si=5&campaign=a#help'),
  );
  assert.equal(url.search, '?campaign=a');
  assert.equal(url.hash, '#help');
});

test('schema validation accepts shorthand and decimal tolerance and bounds skill and march levels', () => {
  assert.deepEqual(settings.parseField('si', '1.2m'), { valid: true, value: 1200000 });
  assert.equal(settings.parseField('ri', '-1').valid, false);
  assert.deepEqual(settings.parseField('tol', '0,5'), { valid: true, value: 0.5 });
  for (const value of ['', 'bad', 'Infinity', '-1'])
    assert.equal(settings.parseField('tol', value).valid, false);
  assert.equal(settings.parseField('valoraSkill', 99).value, 10);
  assert.equal(settings.parseField('bisonSkill', -1).value, 1);
  assert.equal(settings.parseField('n', 10).value, 7);
});
