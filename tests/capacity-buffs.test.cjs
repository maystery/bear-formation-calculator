'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {capacityBuffSummary} = require('../calculator-core.js');

const projectRoot = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(projectRoot, 'app.js'), 'utf8');
const styles = fs.readFileSync(path.join(projectRoot, 'styles.css'), 'utf8');

test('active Bison applies its recorded bonus to squad capacity', () => {
  const result = capacityBuffSummary(150210, true);
  assert.equal(result.total, 195210);
  assert.equal(result.appliedBisonBonus, 15000);
});

test('inactive Bison preserves but does not apply its recorded bonus', () => {
  const off = capacityBuffSummary(150210, false);
  const onAgain = capacityBuffSummary(off.baseCapacity, true, {
    valoraBonus:off.valoraBonus,
    bisonRecordedBonus:off.bisonRecordedBonus
  });
  assert.equal(off.total, 180210);
  assert.equal(off.appliedBisonBonus, 0);
  assert.equal(off.bisonRecordedBonus, 15000);
  assert.equal(onAgain.bisonRecordedBonus, 15000);
  assert.equal(onAgain.total, 195210);
});

test('Bison skill levels scale the recorded capacity bonus', () => {
  for(const [level, bonus] of [[1, 1500], [5, 7500], [10, 15000]]){
    const result = capacityBuffSummary(150210, true, {
      valoraBonus:30000,
      bisonRecordedBonus:level * 1500
    });
    assert.equal(result.bisonRecordedBonus, bonus);
    assert.equal(result.total, 180210 + bonus);
  }
});

test('Mighty Bison uses a full-card native button as an accessible keyboard toggle', () => {
  assert.match(index, /<button class="capacity-buff-toggle" id="bisonBuff" type="button" role="switch"/);
  assert.match(index, /aria-checked="false"/);
  assert.match(app, /\$\('bisonBuff'\)\.addEventListener\('click'/);
  assert.match(app, /setAttribute\('aria-checked', String\(isBisonBuffEnabled\)\)/);
  assert.doesNotMatch(index, /type="checkbox"[^>]*bison|class="[^"]*toggle-switch/i);
  assert.match(styles, /\.capacity-buff-toggle:hover,.capacity-buff-toggle:focus-visible\{background:transparent\}/);
});

test('skill levels are selectable independently and scale both recorded bonuses', () => {
  assert.match(index, /data-capacity-skill-picker data-input="valoraSkill"/);
  assert.match(index, /data-capacity-skill-picker data-input="bisonSkill"/);
  assert.match(index, /id="valoraSkillMenu" role="listbox"/);
  assert.match(index, /id="bisonSkillMenu" role="listbox"/);
  assert.match(index, /<input id="valoraSkill" type="hidden" value="10">/);
  assert.match(index, /<input id="bisonSkill" type="hidden" value="10">/);
  assert.match(app, /const VALORA_BONUS_PER_LEVEL = 3000/);
  assert.match(app, /const BISON_BONUS_PER_LEVEL = 1500/);
  assert.match(app, /valoraSkillLevel \* VALORA_BONUS_PER_LEVEL/);
  assert.match(app, /bisonSkillLevel \* BISON_BONUS_PER_LEVEL/);
  assert.match(app, /'cap','valoraSkill','bisonSkill'/);
  assert.match(app, /picker\.addEventListener\('click', event => event\.stopPropagation\(\)\)/);
  assert.match(app, /event\.key === 'ArrowDown'/);
  assert.match(app, /event\.key === 'Escape'/);
});

test('Bison enabled state persists independently and no Add Hero slot is rendered', () => {
  assert.match(app, /o\.bisonBuffEnabled = isBisonBuffEnabled/);
  assert.match(app, /typeof o\.bisonBuffEnabled === 'boolean'/);
  assert.match(app, /bisonRecordedBonus\n\s*\}\)/);
  assert.match(app, /const capHero = baseCap > 0 \? capacityBuffs\.total : Infinity/);
  assert.match(app, /url\.searchParams\.set\('bison', isBisonBuffEnabled \? '1' : '0'\)/);
  assert.doesNotMatch(index, /Add Hero/i);
});

test('capacity buff artwork exists and the obsolete Valora slider is gone', () => {
  for(const asset of ['assets/buffs/valora.webp','assets/buffs/mighty-bison.webp']){
    assert.equal(fs.existsSync(path.join(projectRoot, asset)), true, asset);
    assert.match(index, new RegExp(asset.replaceAll('/','\\/')));
  }
  assert.doesNotMatch(index, /id="sav"/);
});
