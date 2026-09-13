(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BearCalcCore = api;
})(globalThis, function () {
  'use strict';

  /** @type {import('./types').TroopKey[]} */
  const TROOP_KEYS = ['inf', 'cav', 'arc'];

  /** @param {unknown} v
   * @returns {import('./types').ParsedNumber} */
  function parseAmount(v) {
    const raw = String(v).trim().toLowerCase();
    if (!raw) return { valid: false, value: 0 };

    const suffix = /[kmb]$/.test(raw) ? raw.slice(-1) : '';
    const body = suffix ? raw.slice(0, -1).trim() : raw;
    let numberText;
    if (/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(body)) {
      numberText = body;
    } else if (/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(body)) {
      numberText = body.replace(/,/g, '');
    } else if (/^\d{1,3}(?:\s+\d{3})+(?:\.\d+)?$/.test(body)) {
      numberText = body.replace(/\s/g, '');
    } else {
      return { valid: false, value: 0 };
    }

    const value = Number(numberText) * ({ k: 1e3, m: 1e6, b: 1e9 }[suffix] || 1);
    return Number.isFinite(value) && value <= Number.MAX_SAFE_INTEGER
      ? { valid: true, value: Math.floor(value) }
      : { valid: false, value: 0 };
  }

  /** @param {unknown} v
   * @returns {import('./types').ParsedNumber} */
  function parseRatio(v) {
    const raw = String(v).trim();
    if (!raw) return { valid: false, value: 0 };
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0
      ? { valid: true, value }
      : { valid: false, value: 0 };
  }

  /** @param {number} total
   * @param {number[]} caps
   * @returns {number[]} */
  function allocateEvenly(total, caps) {
    const count = caps.length;
    const allocation = new Array(count).fill(0);
    let remaining = total;
    let active = caps.map((_, i) => i);
    while (active.length > 0 && remaining > 1e-9) {
      const share = remaining / active.length;
      const capped = active.filter((i) => caps[i] < share);
      if (capped.length === 0) {
        active.forEach((i) => (allocation[i] += share));
        remaining = 0;
        break;
      }
      capped.forEach((i) => {
        allocation[i] = caps[i];
        remaining -= caps[i];
      });
      active = active.filter((i) => !capped.includes(i));
    }

    const integers = allocation.map(Math.floor);
    let left = Math.floor(total) - integers.reduce((a, b) => a + b, 0);
    for (let i = 0; i < count && left > 0; i++) {
      if (integers[i] < caps[i]) {
        integers[i]++;
        left--;
      }
    }
    return integers;
  }

  /** @param {number} total
   * @param {number[]} caps
   * @param {number[]} [priorities]
   * @returns {number[]} */
  function allocate(total, caps, priorities) {
    if (priorities === undefined) return allocateEvenly(total, caps);
    if (priorities.length !== caps.length) {
      throw new RangeError('Each march cap needs a matching priority');
    }

    const allocation = new Array(caps.length).fill(0);
    let remaining = Math.floor(total);
    const tiers = [...new Set(priorities)].sort((a, b) => b - a);

    for (const tier of tiers) {
      if (remaining <= 0) break;
      const indices = priorities
        .map((priority, i) => (priority === tier ? i : -1))
        .filter((i) => i >= 0);
      const tierCaps = indices.map((i) => caps[i]);
      const tierCap = tierCaps.reduce((sum, cap) => sum + cap, 0);
      const tierAllocation = allocateEvenly(Math.min(remaining, tierCap), tierCaps);
      tierAllocation.forEach((amount, i) => {
        allocation[indices[i]] = amount;
        remaining -= amount;
      });
    }
    return allocation;
  }

  /** @param {number} total
   * @param {number[]} caps
   * @returns {number[]} */
  function allocateSequentially(total, caps) {
    const allocation = new Array(caps.length).fill(0);
    let remaining = Math.floor(total);
    for (let i = 0; i < caps.length && remaining > 0; i++) {
      allocation[i] = Math.min(remaining, caps[i]);
      remaining -= allocation[i];
    }
    return allocation;
  }

  /** @param {number} total
   * @param {import('./types').Troops} ratio
   * @returns {import('./types').Troops} */
  function splitByRatio(total, ratio) {
    const raw = Object.fromEntries(TROOP_KEYS.map((k) => [k, total * ratio[k]]));
    const output = { inf: Math.floor(raw.inf), cav: Math.floor(raw.cav), arc: Math.floor(raw.arc) };
    let left = total - TROOP_KEYS.reduce((sum, k) => sum + output[k], 0);
    const byRemainder = [...TROOP_KEYS].sort((a, b) => raw[b] - output[b] - (raw[a] - output[a]));
    for (let i = 0; left > 0; i++, left--) output[byRemainder[i % TROOP_KEYS.length]]++;
    return output;
  }

  /** @param {number[]} totals
   * @param {import('./types').Troops} ratio
   * @returns {import('./types').Troops[]} */
  function splitMarches(totals, ratio) {
    const rows = totals.map((total) => splitByRatio(total, ratio));
    const desired = splitByRatio(
      totals.reduce((a, b) => a + b, 0),
      ratio,
    );
    const actual = Object.fromEntries(
      TROOP_KEYS.map((k) => [k, rows.reduce((sum, row) => sum + row[k], 0)]),
    );

    while (TROOP_KEYS.some((k) => actual[k] !== desired[k])) {
      /** @type {{i: number, from: import('./types').TroopKey, to: import('./types').TroopKey, cost: number} | null} */
      let best = null;
      for (const from of TROOP_KEYS) {
        if (actual[from] <= desired[from]) continue;
        for (const to of TROOP_KEYS) {
          if (actual[to] >= desired[to]) continue;
          for (const [i, row] of rows.entries()) {
            if (row[from] <= 0) continue;
            const rawFrom = totals[i] * ratio[from];
            const rawTo = totals[i] * ratio[to];
            const before = Math.abs(row[from] - rawFrom) + Math.abs(row[to] - rawTo);
            const after = Math.abs(row[from] - 1 - rawFrom) + Math.abs(row[to] + 1 - rawTo);
            const cost = after - before;
            if (!best || cost < best.cost) best = { i, from, to, cost };
          }
        }
      }
      if (!best) throw new Error('Unable to reconcile march rounding');
      rows[best.i][best.from]--;
      rows[best.i][best.to]++;
      actual[best.from]--;
      actual[best.to]++;
    }
    return rows;
  }

  /** @param {number} value
   * @returns {number} */
  function wholeTroops(value) {
    if (!Number.isFinite(value)) return Infinity;
    const nearest = Math.round(value);
    const tolerance = Math.min(1e-6, Math.max(1, Math.abs(value)) * Number.EPSILON * 8);
    return Math.abs(value - nearest) <= tolerance ? nearest : Math.floor(value);
  }

  /** @param {import('./types').TroopLimit[]} troopLimits
   * @param {number} capTotal
   * @param {number} total */
  function findBottlenecks(troopLimits, capTotal, total) {
    return {
      troops: troopLimits.filter((x) => wholeTroops(x.ceiling) === total),
      capacity: Number.isFinite(capTotal) && wholeTroops(capTotal) === total,
    };
  }

  /** @param {number | null} baseCapacity
   * @param {boolean} isBisonBuffEnabled
   * @param {{valoraBonus?: number, bisonRecordedBonus?: number}} [options]
   * @returns {import('./types').CapacitySummary} */
  function capacityBuffSummary(baseCapacity, isBisonBuffEnabled, options = {}) {
    const valoraBonus = options.valoraBonus ?? 30000;
    const bisonRecordedBonus = options.bisonRecordedBonus ?? 15000;
    const base = Number(baseCapacity);
    const validBase = Number.isFinite(base) && base >= 0 ? base : 0;
    return Object.freeze({
      baseCapacity: validBase,
      valoraBonus,
      bisonRecordedBonus,
      isBisonBuffEnabled: Boolean(isBisonBuffEnabled),
      appliedBisonBonus: isBisonBuffEnabled ? bisonRecordedBonus : 0,
      total: validBase + valoraBonus + (isBisonBuffEnabled ? bisonRecordedBonus : 0),
    });
  }

  const MAX_MARCHES = 7;
  const CAPACITY_SKILLS = Object.freeze({
    valora: Object.freeze({ min: 1, max: 10, bonusPerLevel: 3000 }),
    bison: Object.freeze({ min: 1, max: 10, bonusPerLevel: 1500 }),
  });

  /** @param {unknown} value
   * @param {import('./types').Skill} skill
   * @returns {number} */
  function skillLevel(value, skill) {
    const { min, max } = CAPACITY_SKILLS[skill];
    return Math.min(max, Math.max(min, Math.floor(Number(value) || min)));
  }

  // Accepts parsed troop counts and non-negative ratio weights. UI validation and
  // formatting belong to the caller; this function never reads or mutates the DOM.
  /** @param {import('./types').FormationSettings} settings
   * @returns {import('./types').FormationResult} */
  function calculateFormation({
    troops: availableTroops,
    ratios,
    marchCount: requestedMarchCount,
    leaders: requestedLeaders,
    squadCapacity,
    baseCapacity,
    valoraLevel,
    bisonLevel,
    bisonEnabled,
    strategy = 'equal',
  }) {
    const marchCount = Math.min(
      MAX_MARCHES,
      Math.max(1, Math.floor(Number(requestedMarchCount) || 1)),
    );
    const leaders = [...requestedLeaders];
    const troops = { ...availableTroops };
    const capacityBuffs = capacityBuffSummary(baseCapacity, bisonEnabled, {
      valoraBonus: skillLevel(valoraLevel, 'valora') * CAPACITY_SKILLS.valora.bonusPerLevel,
      bisonRecordedBonus: skillLevel(bisonLevel, 'bison') * CAPACITY_SKILLS.bison.bonusPerLevel,
    });
    const heroCapacity = baseCapacity > 0 ? capacityBuffs.total : Infinity;
    const squadCapacityLimit = squadCapacity > 0 ? squadCapacity : Infinity;
    const ratioSum = TROOP_KEYS.reduce((sum, key) => sum + ratios[key], 0);
    const capacity = { capacityBuffs, heroCapacity, squadCapacityLimit, ratioSum };
    if (ratioSum <= 0 || !Number.isFinite(ratioSum)) return { valid: false, ...capacity };
    const ratio = {
      inf: ratios.inf / ratioSum,
      cav: ratios.cav / ratioSum,
      arc: ratios.arc / ratioSum,
    };
    const troopLimits = TROOP_KEYS.filter((key) => ratio[key] > 0).map((key) => ({
      key,
      ceiling: troops[key] / ratio[key],
    }));
    const troopMax = Math.min(...troopLimits.map((limit) => limit.ceiling));
    const marchCaps = Array.from({ length: marchCount }, (_, i) =>
      leaders[i] ? heroCapacity : squadCapacityLimit,
    );
    const totalCapacity = marchCaps.reduce((sum, cap) => sum + cap, 0);
    const capacityUsage = {
      hero: marchCaps.some((_, i) => Boolean(leaders[i])) && Number.isFinite(heroCapacity),
      squad: marchCaps.some((_, i) => !leaders[i]) && Number.isFinite(squadCapacityLimit),
    };
    const total = wholeTroops(Math.min(troopMax, totalCapacity));
    const bottlenecks = findBottlenecks(troopLimits, totalCapacity, total);
    const marchTotals =
      strategy === 'sequential'
        ? allocateSequentially(total, marchCaps)
        : allocate(total, marchCaps);
    const rows = splitMarches(marchTotals, ratio);
    const totals = {
      inf: rows.reduce((sum, row) => sum + row.inf, 0),
      cav: rows.reduce((sum, row) => sum + row.cav, 0),
      arc: rows.reduce((sum, row) => sum + row.arc, 0),
    };
    const totalTroops = TROOP_KEYS.reduce((sum, key) => sum + totals[key], 0);
    return {
      valid: true,
      ...capacity,
      marchCount,
      ratio,
      troops,
      leaders,
      strategy,
      marchCaps,
      totalCapacity,
      capacityUsage,
      bottlenecks,
      marchTotals,
      rows,
      totals,
      totalTroops,
    };
  }

  /**
   * Compare a march with a normalized formation ratio. Tolerance is in percentage
   * points and is inclusive. A zero-troop march has no verdict.
   * @param {import('./types').Troops} troops
   * @param {import('./types').Troops} ratio
   * @param {number} tolerance
   * @returns {import('./types').MarchCheck | null}
   */
  function checkMarch(troops, ratio, tolerance) {
    const total = TROOP_KEYS.reduce((sum, key) => sum + troops[key], 0);
    if (total <= 0) return null;
    const ideal = splitByRatio(total, ratio);
    const actual = {
      inf: (troops.inf / total) * 100,
      cav: (troops.cav / total) * 100,
      arc: (troops.arc / total) * 100,
    };
    const differences = {
      inf: actual.inf - ratio.inf * 100,
      cav: actual.cav - ratio.cav * 100,
      arc: actual.arc - ratio.arc * 100,
    };
    let worstKey = TROOP_KEYS[0];
    for (const key of TROOP_KEYS) {
      if (Math.abs(differences[key]) > Math.abs(differences[worstKey])) worstKey = key;
    }
    const outside = {
      inf: Math.abs(differences.inf) > tolerance,
      cav: Math.abs(differences.cav) > tolerance,
      arc: Math.abs(differences.arc) > tolerance,
    };
    return {
      total,
      ideal,
      actual,
      differences,
      outside,
      worstKey,
      worstDifference: differences[worstKey],
      adjustment: Math.abs(troops[worstKey] - ideal[worstKey]),
      matches: !outside[worstKey],
    };
  }

  return Object.freeze({
    TROOP_KEYS,
    MAX_MARCHES,
    CAPACITY_SKILLS,
    skillLevel,
    calculateFormation,
    checkMarch,
    parseAmount,
    parseRatio,
    allocate,
    allocateSequentially,
    splitByRatio,
    splitMarches,
    wholeTroops,
    findBottlenecks,
    capacityBuffSummary,
  });
});
