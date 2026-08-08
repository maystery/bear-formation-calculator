(function(root, factory){
  const api = factory();
  if(typeof module === 'object' && module.exports) module.exports = api;
  else root.BearCalcCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';

  const TROOP_KEYS = ['inf','cav','arc'];

  function parseAmount(v){
    const raw = String(v).trim().toLowerCase();
    if(!raw) return {valid:false, value:0};

    const suffix = /[kmb]$/.test(raw) ? raw.slice(-1) : '';
    const body = suffix ? raw.slice(0, -1).trim() : raw;
    let numberText;
    if(/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(body)){
      numberText = body;
    } else if(/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(body)){
      numberText = body.replace(/,/g, '');
    } else if(/^\d{1,3}(?:\s+\d{3})+(?:\.\d+)?$/.test(body)){
      numberText = body.replace(/\s/g, '');
    } else {
      return {valid:false, value:0};
    }

    const value = Number(numberText) * ({k:1e3, m:1e6, b:1e9}[suffix] || 1);
    return Number.isFinite(value) && value <= Number.MAX_SAFE_INTEGER
      ? {valid:true, value:Math.floor(value)}
      : {valid:false, value:0};
  }

  function parseRatio(v){
    const raw = String(v).trim();
    if(!raw) return {valid:false, value:0};
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0
      ? {valid:true, value}
      : {valid:false, value:0};
  }

  function allocateEvenly(total, caps){
    const count = caps.length;
    const allocation = new Array(count).fill(0);
    let remaining = total;
    let active = caps.map((_, i) => i);
    while(active.length > 0 && remaining > 1e-9){
      const share = remaining / active.length;
      const capped = active.filter(i => caps[i] < share);
      if(capped.length === 0){
        active.forEach(i => allocation[i] += share);
        remaining = 0;
        break;
      }
      capped.forEach(i => {
        allocation[i] = caps[i];
        remaining -= caps[i];
      });
      active = active.filter(i => !capped.includes(i));
    }

    const integers = allocation.map(Math.floor);
    let left = Math.floor(total) - integers.reduce((a, b) => a + b, 0);
    for(let i = 0; i < count && left > 0; i++){
      if(integers[i] < caps[i]){
        integers[i]++;
        left--;
      }
    }
    return integers;
  }

  function allocate(total, caps, priorities){
    if(priorities === undefined) return allocateEvenly(total, caps);
    if(priorities.length !== caps.length){
      throw new RangeError('Each march cap needs a matching priority');
    }

    const allocation = new Array(caps.length).fill(0);
    let remaining = Math.floor(total);
    const tiers = [...new Set(priorities)].sort((a, b) => b - a);

    for(const tier of tiers){
      if(remaining <= 0) break;
      const indices = priorities
        .map((priority, i) => priority === tier ? i : -1)
        .filter(i => i >= 0);
      const tierCaps = indices.map(i => caps[i]);
      const tierCap = tierCaps.reduce((sum, cap) => sum + cap, 0);
      const tierAllocation = allocateEvenly(Math.min(remaining, tierCap), tierCaps);
      tierAllocation.forEach((amount, i) => {
        allocation[indices[i]] = amount;
        remaining -= amount;
      });
    }
    return allocation;
  }

  function splitByRatio(total, ratio){
    const raw = Object.fromEntries(TROOP_KEYS.map(k => [k, total * ratio[k]]));
    const output = Object.fromEntries(TROOP_KEYS.map(k => [k, Math.floor(raw[k])]));
    let left = total - TROOP_KEYS.reduce((sum, k) => sum + output[k], 0);
    const byRemainder = [...TROOP_KEYS]
      .sort((a, b) => (raw[b] - output[b]) - (raw[a] - output[a]));
    for(let i = 0; left > 0; i++, left--) output[byRemainder[i % TROOP_KEYS.length]]++;
    return output;
  }

  function splitMarches(totals, ratio){
    const rows = totals.map(total => splitByRatio(total, ratio));
    const desired = splitByRatio(totals.reduce((a, b) => a + b, 0), ratio);
    const actual = Object.fromEntries(
      TROOP_KEYS.map(k => [k, rows.reduce((sum, row) => sum + row[k], 0)])
    );

    while(TROOP_KEYS.some(k => actual[k] !== desired[k])){
      let best = null;
      for(const from of TROOP_KEYS){
        if(actual[from] <= desired[from]) continue;
        for(const to of TROOP_KEYS){
          if(actual[to] >= desired[to]) continue;
          rows.forEach((row, i) => {
            if(row[from] <= 0) return;
            const rawFrom = totals[i] * ratio[from];
            const rawTo = totals[i] * ratio[to];
            const before = Math.abs(row[from] - rawFrom) + Math.abs(row[to] - rawTo);
            const after = Math.abs(row[from] - 1 - rawFrom) + Math.abs(row[to] + 1 - rawTo);
            const cost = after - before;
            if(!best || cost < best.cost) best = {i, from, to, cost};
          });
        }
      }
      if(!best) throw new Error('Unable to reconcile march rounding');
      rows[best.i][best.from]--;
      rows[best.i][best.to]++;
      actual[best.from]--;
      actual[best.to]++;
    }
    return rows;
  }

  function wholeTroops(value){
    if(!Number.isFinite(value)) return Infinity;
    const nearest = Math.round(value);
    const tolerance = Math.min(1e-6, Math.max(1, Math.abs(value)) * Number.EPSILON * 8);
    return Math.abs(value - nearest) <= tolerance ? nearest : Math.floor(value);
  }

  function findBottlenecks(troopLimits, capTotal, total){
    return {
      troops: troopLimits.filter(x => wholeTroops(x.ceiling) === total),
      capacity: Number.isFinite(capTotal) && wholeTroops(capTotal) === total
    };
  }

  return Object.freeze({
    TROOP_KEYS,
    parseAmount,
    parseRatio,
    allocate,
    splitByRatio,
    splitMarches,
    wholeTroops,
    findBottlenecks
  });
});
