'use strict';

// DOM validation and result presentation; arithmetic lives in calculator-core.js.
window.BearFormationView = Object.freeze({
  /** @param {{heroes: import('./types').HeroController, capacity: import('./types').CapacityController, feedback: import('./types').Feedback}} options
   * @returns {import('./types').FormationView} */
  create({ heroes, capacity, feedback }) {
    const $ = (id) => document.getElementById(id);
    const { calculateFormation, MAX_MARCHES, checkMarch } = BearCalcCore;
    const { HEROES } = BearHeroUI;
    const { idsFor, parseField, validationMessage } = BearSettings;
    const MAIN_AMOUNT_IDS = idsFor('amount', 'formation');
    const CHECK_AMOUNT_IDS = idsFor('amount', 'check');
    const RATIO_IDS = idsFor('ratio');
    let UNIT = 'k';
    /** @type {import('./types').ValidFormation | null} */
    let lastResult = null;
    const { setFieldValidity, setVal } = feedback;
    function fillStrategy() {
      return document.querySelector('input[name="fillStrategy"]:checked').value;
    }

    // keep slider fill, tick highlight and thumb labels in sync with values
    function syncSliders() {
      [['n', 1, MAX_MARCHES]].forEach(([id, min, max]) => {
        const el = $(id);
        const v = Math.min(max, Math.max(min, Math.floor(+el.value || min)));
        el.style.setProperty('--pct', ((v - min) / (max - min)) * 100 + '%');
        el.setAttribute('aria-valuetext', String(v));
      });
      const n = parseField('n', $('n').value).value;
      document.querySelectorAll('#nScale span').forEach((span, i) => {
        span.classList.toggle('on', i + 1 <= n);
        span.classList.toggle('is-current', i + 1 === n);
      });
    }

    function readFields(ids) {
      const values = {},
        invalid = [];
      ids.forEach((id) => {
        const parsed = parseField(id, $(id).value);
        setFieldValidity(id, parsed.valid, validationMessage(id));
        if (parsed.valid) values[id] = parsed.value;
        else invalid.push(id);
      });
      return { values, invalid };
    }

    const trim = (n) => n.toFixed(2).replace(/\.?0+$/, '');
    const fmt = (x) => {
      x = Math.round(x);
      if (UNIT === 'full' || Math.abs(x) < 1000) return x.toLocaleString('en-US');
      if (Math.abs(x) >= 1e6) return trim(x / 1e6) + 'm';
      return trim(x / 1e3) + 'k';
    };
    function leaderCell(key) {
      const hero = HEROES[key || 'none'];
      const cls = key ? 'leadcell' : 'leadcell leadnone';
      return `<div class="${cls}"><img src="${hero.avatar}" alt=""><span>${hero.name}</span></div>`;
    }
    const row = (a, lead, b, c, d, e, capacity, cls) =>
      `<tr class="${cls}"><th scope="row">${a}</th><td>${lead}</td><td>${b}</td><td>${c}</td><td>${d}</td><td><b>${e}</b></td><td>${capacity}</td></tr>`;

    function capacityUse(used, cap) {
      if (!Number.isFinite(cap)) {
        return `<div class="capacity-use unlimited">${fmt(used)} / ∞ · no limit</div>`;
      }
      const percent = cap > 0 ? (used / cap) * 100 : 0;
      const hasRoom = used < cap;
      const state =
        used > cap ? 'is-over' : used <= 0 ? 'is-empty' : hasRoom ? 'has-room' : 'is-full';
      return (
        `<div class="capacity-use ${state}">` +
        `<div>${fmt(used)} / ${fmt(cap)} · ${trim(percent)}%</div>` +
        `<div class="bar" aria-hidden="true"><i style="width:${Math.min(100, percent).toFixed(2)}%"></i></div></div>`
      );
    }

    function clearLimits() {
      ['tileInf', 'tileCav', 'tileArc', 'tileSquad', 'tileCap'].forEach((id) =>
        $(id).classList.remove('limit'),
      );
      $('tileLim').classList.remove('bn-troop', 'bn-cap', 'bn-mixed');
    }

    function clearResults(clearCapacity = false) {
      clearLimits();
      lastResult = null;
      $('copyFormation').disabled = true;
      setVal('tTotal', '–');
      $('totalUsage').textContent = '';
      setVal('tLim', '–');
      $('limHint').textContent = '';
      $('rows').innerHTML = '';
      $('leftoverValues').textContent = '';
      $('leftover').hidden = true;
      $('checkRows').innerHTML = '';
      $('checkError').textContent = '';
      $('verdict').innerHTML = '';
      if (clearCapacity) {
        setVal('tCap', '–');
        $('capBreak').textContent = '';
        $('capBreakLabels').textContent = '';
        setVal('tNoCap', '–');
        $('capSum').textContent = '';
      }
    }

    function calc() {
      UNIT = $('unit').value;
      syncSliders();
      const n = parseField('n', $('n').value).value;
      const strategy = fillStrategy();

      $('nOut').textContent = n;
      $('fillStrategyHint').textContent =
        strategy === 'sequential'
          ? 'Max March 1, then March 2, and continue in order.'
          : 'Spread available troops as evenly as capacity allows.';
      const order = heroes.leaderOrder();
      heroes.sync(order, n);

      const parsedRatios = readFields(RATIO_IDS);
      const parsedMain = readFields(MAIN_AMOUNT_IDS);
      [
        ['squad', 'squadCapacityDisplay'],
        ['cap', 'baseCapacityDisplay'],
      ].forEach(([inputId, outputId]) => {
        const invalid = parsedMain.invalid.includes(inputId);
        $(outputId).textContent = invalid ? 'Invalid value' : fullFmt(parsedMain.values[inputId]);
        if (invalid) {
          $('capacityEdit').open = true;
          $('foldCap').open = true;
        }
      });
      const capacityBase = parsedMain.invalid.includes('cap') ? null : parsedMain.values.cap;
      const capacityBuffs = capacity.sync(capacityBase);
      const summaryRatio = parsedRatios.invalid.length
        ? 'needs attention'
        : [parsedRatios.values.ri, parsedRatios.values.rc, parsedRatios.values.ra]
            .map(trim)
            .join(' / ');
      $('setupSummary').textContent =
        `Formation ${summaryRatio} · ${n} march${n === 1 ? '' : 'es'}`;
      const invalidCount = parsedRatios.invalid.length + parsedMain.invalid.length;
      if (invalidCount) {
        $('warn').textContent = parsedRatios.invalid.length
          ? 'Each ratio must be a finite percentage of zero or more.'
          : '';
        $('inputError').textContent =
          'Fix the highlighted number field' + (invalidCount > 1 ? 's' : '') + ' to calculate.';
        $('copySetup').disabled = true;
        clearResults(true);
        return false;
      }
      $('inputError').textContent = '';
      const V = parsedMain.values;
      const RV = parsedRatios.values;
      const result = calculateFormation({
        troops: { inf: V.si, cav: V.sc, arc: V.sa },
        ratios: { inf: RV.ri, cav: RV.rc, arc: RV.ra },
        marchCount: n,
        leaders: order,
        squadCapacity: V.squad,
        baseCapacity: V.cap,
        valoraLevel: $('valoraSkill').value,
        bisonLevel: $('bisonSkill').value,
        bisonEnabled: capacity.enabled,
        strategy,
      });
      const { heroCapacity: capHero, squadCapacityLimit: capNone, ratioSum: sum } = result;
      const baseCap = V.cap;
      setVal('tCap', isFinite(capHero) ? fmt(capHero) : '∞');
      $('capBreak').textContent = isFinite(capHero)
        ? `${fmt(baseCap)} + ${fmt(capacityBuffs.valoraBonus)}` +
          (capacity.enabled ? ` + ${fmt(capacityBuffs.bisonRecordedBonus)}` : '')
        : '';
      $('capBreakLabels').textContent = isFinite(capHero)
        ? 'Base + Valora' + (capacity.enabled ? ' + Bison' : '')
        : 'No base capacity limit';
      setVal('tNoCap', isFinite(capNone) ? fmt(capNone) : '∞');
      $('capSum').textContent =
        `squad ${isFinite(capNone) ? fmt(capNone) : '∞'}` +
        ` · march ${isFinite(capHero) ? fmt(capHero) : '∞'}`;

      $('warn').textContent =
        sum <= 0
          ? 'Set a ratio to split anything.'
          : sum === 100
            ? ''
            : `Sums to ${sum}% — normalising.`;
      // without a ratio there is nothing to show — blank it rather than leaving
      // the previous run's numbers sitting there looking valid
      if (!result.valid) {
        $('copySetup').disabled = true;
        clearResults();
        return false;
      }
      $('copySetup').disabled = false;
      const {
        ratio,
        troops,
        marchCaps,
        totalCapacity,
        capacityUsage,
        bottlenecks,
        marchTotals,
        rows,
        totals,
        totalTroops,
      } = result;
      const troopMeta = {
        inf: { label: 'Infantry', tile: 'tileInf' },
        cav: { label: 'Cavalry', tile: 'tileCav' },
        arc: { label: 'Archers', tile: 'tileArc' },
      };

      setVal('tTotal', fmt(totalTroops));
      const availableTroops = troops.inf + troops.cav + troops.arc;
      $('totalUsage').textContent =
        availableTroops > 0
          ? `${trim((totalTroops / availableTroops) * 100)}% of available troops`
          : 'No available troops';

      // Highlight every constraint that prevents one more whole troop from being
      // deployed, but only highlight capacity sources used by an active march.
      clearLimits();
      bottlenecks.troops.forEach((x) => $(troopMeta[x.key].tile).classList.add('limit'));
      if (bottlenecks.capacity) {
        if (capacityUsage.hero) $('tileCap').classList.add('limit');
        if (capacityUsage.squad) $('tileSquad').classList.add('limit');
      }

      const troopLabels = bottlenecks.troops.map((x) => troopMeta[x.key].label);
      const labels = [...troopLabels];
      if (bottlenecks.capacity) labels.push('Deployment capacity');
      setVal('tLim', labels.length === 1 ? labels[0] : 'Multiple');

      if (bottlenecks.troops.length && bottlenecks.capacity) {
        $('tileLim').classList.add('bn-mixed');
        $('limHint').textContent = troopLabels.join(' + ') + ' + capacity';
      } else if (bottlenecks.troops.length) {
        $('tileLim').classList.add('bn-troop');
        $('limHint').textContent =
          troopLabels.length === 1
            ? 'Out of ' + troopLabels[0].toLowerCase()
            : troopLabels.join(' + ');
      } else if (bottlenecks.capacity) {
        $('tileLim').classList.add('bn-cap');
        setVal('tLim', 'Capacity reached');
        $('limHint').textContent = 'One or more marches are at capacity.';
      } else {
        setVal('tLim', '—');
        $('limHint').textContent = '';
      }

      let h =
        '<thead><tr class="head"><th scope="col">March</th><th scope="col">Leader</th>' +
        '<th scope="col">Infantry</th><th scope="col">Cavalry</th><th scope="col">Archers</th>' +
        '<th scope="col">Total</th><th scope="col">Capacity used</th></tr></thead><tbody>';
      for (let i = 0; i < n; i++) {
        const x = rows[i];
        h += row(
          i + 1,
          leaderCell(order[i]),
          fmt(x.inf),
          fmt(x.cav),
          fmt(x.arc),
          fmt(marchTotals[i]),
          capacityUse(marchTotals[i], marchCaps[i]),
          order[i] ? 'line' : 'line no-hero-row',
        );
      }
      h +=
        '</tbody><tfoot>' +
        row(
          'Total',
          '',
          fmt(totals.inf),
          fmt(totals.cav),
          fmt(totals.arc),
          fmt(totalTroops),
          capacityUse(totalTroops, totalCapacity),
          'sumline',
        ) +
        '</tfoot>';
      $('rows').innerHTML = h;

      $('leftoverValues').innerHTML = [
        ['inf', 'infantry'],
        ['cav', 'cavalry'],
        ['arc', 'archers'],
      ]
        .map(
          ([key, label]) =>
            `<span class="remaining-troop"><i class="troop-icon troop-icon--${label}" aria-hidden="true"></i><span>${fmt(troops[key] - totals[key])} ${label}</span></span>`,
        )
        .join('');
      $('leftover').hidden = false;

      lastResult = result;
      $('copyFormation').disabled = false;

      check(ratio);
      return true;
    }

    function check(r) {
      const parsedCheck = readFields(CHECK_AMOUNT_IDS);
      const { valid: tolValid, value: tol } = parseField('tol', $('tol').value);
      setFieldValidity('tol', tolValid, validationMessage('tol'));
      if (parsedCheck.invalid.length || !tolValid || !Number.isFinite(tol)) {
        $('checkError').textContent =
          'Fix the highlighted number field' +
          (parsedCheck.invalid.length + (!tolValid ? 1 : 0) > 1 ? 's' : '') +
          ' to check this march.';
        $('checkRows').innerHTML = '';
        $('verdict').innerHTML = '';
        return;
      }
      $('checkError').textContent = '';
      const V = parsedCheck.values;
      const C = { inf: V.ci, cav: V.cc, arc: V.ca };
      const result = checkMarch(C, r, tol);
      if (!result) {
        $('checkRows').innerHTML = '';
        $('verdict').innerHTML = '';
        return;
      }
      const {
        total,
        ideal,
        actual,
        differences: delta,
        outside,
        worstKey,
        worstDifference: worst,
        adjustment,
        matches: ok,
      } = result;
      const NAMES = { inf: 'Infantry', cav: 'Cavalry', arc: 'Archers' };

      let h =
        '<thead><tr class="head"><th scope="col">Type</th><th scope="col">Actual %</th>' +
        '<th scope="col">Target %</th><th scope="col">Difference (pp)</th><th scope="col">Target count</th><th scope="col">Status</th></tr></thead><tbody>';
      for (const k of ['inf', 'cav', 'arc']) {
        const off = outside[k];
        const sign = delta[k] >= 0 ? '+' : '−';
        const type = NAMES[k].toLowerCase();
        h +=
          `<tr class="line check-troop--${type}"><th scope="row"><span class="check-type"><i class="troop-icon troop-icon--${type}" aria-hidden="true"></i>${NAMES[k]}</span></th>` +
          `<td><strong>${actual[k].toFixed(2)}%</strong><span class="check-composition-bar" aria-hidden="true"><span style="width:${Math.min(100, Math.max(0, actual[k]))}%"></span></span></td>` +
          `<td>${(r[k] * 100).toFixed(2)}%</td>` +
          `<td class="check-difference ${off ? 'is-outside' : 'is-within'}">${sign}${Math.abs(delta[k]).toFixed(2)}</td>` +
          `<td><strong>${fmt(ideal[k])}</strong><small class="check-tolerance">at ${fmt(total)} total</small></td>` +
          `<td><span class="check-status ${off ? 'is-outside' : 'is-within'}">${off ? '! Outside range' : '✓ Within range'}</span></td></tr>`;
      }
      $('checkRows').innerHTML = h + '</tbody>';

      if (ok) {
        $('verdict').innerHTML =
          `<div class="verdict ok"><div><div class="head2">Matches the ratio</div>` +
          `All three troop types are within ±${tol} pp of target across ${fmt(total)} troops.</div>` +
          `<div class="check-total"><span>Total troops</span><strong>${fmt(total)}</strong></div></div>`;
      } else {
        const dir = worst > 0 ? 'above' : 'below';
        const diff = adjustment;
        $('verdict').innerHTML =
          `<div class="verdict bad"><div><div class="head2">Ratio needs adjustment</div>` +
          `${NAMES[worstKey]} ${worstKey === 'arc' ? 'are' : 'is'} ${fmt(diff)} ${dir} target ` +
          `(${worst > 0 ? '+' : '−'}${Math.abs(worst).toFixed(2)} pp). ` +
          `Target composition at ${fmt(total)} troops: ${fmt(ideal.inf)} Infantry · ${fmt(ideal.cav)} Cavalry · ${fmt(ideal.arc)} Archers.</div>` +
          `<div class="check-total"><span>Total troops</span><strong>${fmt(total)}</strong></div></div>`;
      }
    }

    const fullFmt = (value) => Math.round(value).toLocaleString('en-US');

    function formationText() {
      if (!lastResult) return '';
      const { ratio, troops, leaders, strategy, marchTotals, rows, totals, totalTroops } =
        lastResult;
      const ratioLabel = [ratio.inf, ratio.cav, ratio.arc].map((x) => trim(x * 100)).join(' / ');
      const strategyLabel = strategy === 'sequential' ? 'Fill in order' : 'Balance marches';
      const lines = [`Bear formation · ${ratioLabel}`, `Filling: ${strategyLabel}`, ''];
      rows.forEach((march, i) => {
        const leader = HEROES[leaders[i] || 'none'].name;
        lines.push(
          `March ${i + 1} · ${leader}: ${fullFmt(march.inf)} infantry · ${fullFmt(march.cav)} cavalry · ${fullFmt(march.arc)} archers · ${fullFmt(marchTotals[i])} total`,
        );
      });
      lines.push(
        '',
        `Total: ${fullFmt(totals.inf)} infantry · ${fullFmt(totals.cav)} cavalry · ${fullFmt(totals.arc)} archers · ${fullFmt(totalTroops)} troops`,
      );
      lines.push(
        `Left at home: ${fullFmt(troops.inf - totals.inf)} infantry · ${fullFmt(troops.cav - totals.cav)} cavalry · ${fullFmt(troops.arc - totals.arc)} archers`,
      );
      return lines.join('\n');
    }

    return Object.freeze({
      calculate: calc,
      formationText,
      check() {
        if (lastResult) check(lastResult.ratio);
      },
      get result() {
        return lastResult;
      },
    });
  },
});
