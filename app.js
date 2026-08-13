  // runs before first paint so a forced theme doesn't flash the other one.
  // the key must stay in sync with STORE_KEY below.
  try{
    var saved = JSON.parse(localStorage.getItem('bearcalc.v1') || '{}');
    var t = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved.theme : null;
    if(t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  }catch(e){}
document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const {
    parseAmount,
    parseRatio,
    allocate,
    splitByRatio,
    splitMarches,
    wholeTroops,
    findBottlenecks
  } = BearCalcCore;
  const IDS = ['si','sc','sa','ri','rc','ra','n','squad','cap','sav',
               'amaOn','hildeOn','chenkoOn','yeonwooOn','amaneOn','unit','ci','cc','ca','tol'];
  const FOLDS = ['foldCap','foldHeroes'];
  const MAIN_AMOUNT_IDS = ['si','sc','sa','squad','cap'];
  const CHECK_AMOUNT_IDS = ['ci','cc','ca'];
  const RATIO_IDS = ['ri','rc','ra'];
  const SHARE_IDS = ['si','sc','sa','ri','rc','ra','n','squad','cap','sav',
                     'amaOn','hildeOn','chenkoOn','yeonwooOn','amaneOn','unit'];
  const SAVAGE_PER_LEVEL = 3000;
  const MAX_MARCHES = 6;
  let UNIT = 'k';
  let lastResult = null;

  function setFieldValidity(id, valid, message){
    const el = $(id);
    if(valid) el.removeAttribute('aria-invalid');
    else el.setAttribute('aria-invalid', 'true');
    el.setCustomValidity(valid ? '' : message);
  }

  function readAmounts(ids){
    const values = {}, invalid = [];
    ids.forEach(id => {
      const parsed = parseAmount($(id).value);
      setFieldValidity(id, parsed.valid,
        'Enter a non-negative number, optionally followed by k, m, or b.');
      if(parsed.valid) values[id] = parsed.value;
      else invalid.push(id);
    });
    return {values, invalid};
  }

  function readRatios(){
    const values = {}, invalid = [];
    RATIO_IDS.forEach(id => {
      const parsed = parseRatio($(id).value);
      setFieldValidity(id, parsed.valid, 'Enter a finite percentage of zero or more.');
      if(parsed.valid) values[id] = parsed.value;
      else invalid.push(id);
    });
    return {values, invalid};
  }

  const trim = n => n.toFixed(2).replace(/\.?0+$/,'');
  const fmt = x => {
    x = Math.round(x);
    if(UNIT === 'full' || Math.abs(x) < 1000) return x.toLocaleString('en-US');
    if(Math.abs(x) >= 1e6) return trim(x/1e6) + 'm';
    return trim(x/1e3) + 'k';
  };
  const HEROES = {
    none:    {name:'No hero', img:'heroes/none.png'},
    amadeus: {name:'Amadeus', img:'heroes/amadeus.png'},
    hilde:   {name:'Hilde',   img:'heroes/hilde.png'},
    chenko:  {name:'Chenko',  img:'heroes/chenko.png'},
    yeonwoo: {name:'Yeonwoo', img:'heroes/yeonwoo.png'},
    amane:   {name:'Amane',   img:'heroes/amane.png'}
  };
  // marches are handed out in this order; unticked heroes drop out of the queue
  // and their march falls back to the no-hero (squad) capacity
  const HERO_SLOTS = [
    {key:'amadeus', id:'amaOn'},
    {key:'chenko',  id:'chenkoOn'},
    {key:'yeonwoo', id:'yeonwooOn'},
    {key:'amane',   id:'amaneOn'},
    {key:'hilde',   id:'hildeOn'}
  ];
  function leaderOrder(){
    return HERO_SLOTS.filter(h => $(h.id).checked).map(h => h.key);
  }
  function syncHeroCards(order, n){
    let benched = 0;
    HERO_SLOTS.forEach(h => {
      const on = $(h.id).checked;
      const slot = order.indexOf(h.key);
      const leads = on && slot > -1 && slot < n;
      if(on && !leads) benched++;
      $(h.id).closest('.herocard').classList.toggle('on', on);
      $('pill-' + h.key).textContent = on ? (leads ? 'March ' + (slot + 1) : 'No march') : 'Disabled';
      $('role-' + h.key).textContent = on
        ? (leads ? 'Hero deploy cap' : 'Needs another march')
        : 'Left out of the split';
    });
    const led = Math.min(order.length, n);
    $('heroSum').textContent =
      `${order.length}/${HERO_SLOTS.length} heroes · Valora Lv ${$('sav').value}`;
    $('heroHint').textContent =
      led === 0 ? 'No hero leading — every march is held to the squad deployment capacity.'
      : benched > 0 ? `${benched} hero${benched > 1 ? 'es' : ''} left over — raise the march count to use them.`
      : n > led ? `${n - led} march${n - led > 1 ? 'es' : ''} without a hero, held to the squad deployment capacity.`
      : '';
  }
  function leaderCell(key){
    const hero = HEROES[key || 'none'];
    const cls = key ? 'leadcell' : 'leadcell leadnone';
    return `<div class="${cls}"><img src="${hero.img}" alt=""><span>${hero.name}</span></div>`;
  }
  const row = (a,lead,b,c,d,e,capacity,cls) =>
    `<tr class="${cls}"><th scope="row">${a}</th><td>${lead}</td><td>${b}</td><td>${c}</td><td>${d}</td><td><b>${e}</b></td><td>${capacity}</td></tr>`;

  function capacityUse(used, cap){
    if(!Number.isFinite(cap)){
      return `<span class="capacity-use unlimited">${fmt(used)} / ∞ · no limit</span>`;
    }
    const percent = cap > 0 ? Math.min(100, used / cap * 100) : 0;
    const hasRoom = used < cap;
    return `<span class="capacity-use ${hasRoom ? 'has-room' : 'is-full'}">`
      + `${fmt(used)} / ${fmt(cap)} · ${trim(percent)}%</span>`;
  }

  function clearLimits(){
    ['tileInf','tileCav','tileArc','tileSquad','tileCap']
      .forEach(id => $(id).classList.remove('limit'));
    $('tileLim').classList.remove('bn-troop','bn-cap','bn-mixed');
  }

  function clearResults(clearCapacity = false){
    clearLimits();
    lastResult = null;
    $('copyFormation').disabled = true;
    $('tTotal').textContent = '–';
    $('tLim').textContent = '–';
    $('limHint').textContent = '';
    $('rows').innerHTML = '';
    $('leftover').textContent = '';
    $('checkRows').innerHTML = '';
    $('checkError').textContent = '';
    $('verdict').innerHTML = '';
    if(clearCapacity){
      $('tCap').textContent = '–';
      $('capBreak').textContent = '';
      $('tNoCap').textContent = '–';
      $('capSum').textContent = '';
    }
  }

  function calc(){
    UNIT = $('unit').value;
    const n = Math.min(MAX_MARCHES, Math.max(1, Math.floor(+$('n').value||1)));

    const sav = Math.min(10, Math.max(0, Math.floor(+$('sav').value||0)));
    const savBonus = sav * SAVAGE_PER_LEVEL;
    $('nOut').textContent = n;
    $('savOut').textContent = sav;
    $('savBon').textContent = '+' + fmt(savBonus);
    const order = leaderOrder();
    syncHeroCards(order, n);

    const parsedRatios = readRatios();
    const parsedMain = readAmounts(MAIN_AMOUNT_IDS);
    const invalidCount = parsedRatios.invalid.length + parsedMain.invalid.length;
    if(invalidCount){
      $('warn').textContent = parsedRatios.invalid.length
        ? 'Each ratio must be a finite percentage of zero or more.' : '';
      $('inputError').textContent = 'Fix the highlighted number field' + (invalidCount > 1 ? 's' : '') + ' to calculate.';
      $('copySetup').disabled = true;
      clearResults(true);
      return false;
    }
    $('inputError').textContent = '';
    const V = parsedMain.values;
    const RV = parsedRatios.values;
    const P = {inf:RV.ri, cav:RV.rc, arc:RV.ra};
    const S = {inf:V.si, cav:V.sc, arc:V.sa};

    const squadCap = V.squad;
    const baseCap = V.cap;

    // a march led by a hero uses the base deploy cap (plus the Valora skill);
    // a march with no hero is limited to the squad deployment capacity
    const capHero = baseCap > 0 ? baseCap + savBonus : Infinity;
    const capNone = squadCap > 0 ? squadCap : Infinity;
    $('tCap').textContent = isFinite(capHero) ? fmt(capHero) : '∞';
    $('capBreak').textContent = (isFinite(capHero) && savBonus > 0)
      ? fmt(baseCap) + ' + ' + fmt(savBonus) : '';
    $('tNoCap').textContent = isFinite(capNone) ? fmt(capNone) : '∞';
    $('capSum').textContent = `squad ${isFinite(capNone) ? fmt(capNone) : '∞'}`
      + ` · march ${isFinite(capHero) ? fmt(capHero) : '∞'}`;

    const sum = P.inf + P.cav + P.arc;
    $('warn').textContent = sum <= 0 ? 'Set a ratio to split anything.'
      : sum === 100 ? '' : `Sums to ${sum}% — normalising.`;
    // without a ratio there is nothing to show — blank it rather than leaving
    // the previous run's numbers sitting there looking valid
    if(sum <= 0){
      $('copySetup').disabled = true;
      clearResults();
      return false;
    }
    $('copySetup').disabled = false;
    const r = {inf:P.inf/sum, cav:P.cav/sum, arc:P.arc/sum};

    const troopMeta = {
      inf:{label:'Infantry', tile:'tileInf'},
      cav:{label:'Cavalry', tile:'tileCav'},
      arc:{label:'Archers', tile:'tileArc'}
    };
    const troopLimits = ['inf','cav','arc']
      .filter(k => r[k] > 0)
      .map(k => ({key:k, ...troopMeta[k], ceiling:S[k] / r[k]}));
    const troopMax = troopLimits.length
      ? Math.min(...troopLimits.map(x => x.ceiling))
      : 0;

    const caps = Array.from({length:n}, (_, i) => order[i] ? capHero : capNone);
    const capTotal = caps.reduce((a, b) => a + b, 0);
    const capUsage = {
      hero: caps.some((_, i) => Boolean(order[i])) && Number.isFinite(capHero),
      squad: caps.some((_, i) => !order[i]) && Number.isFinite(capNone)
    };

    const T = wholeTroops(Math.min(troopMax, capTotal));
    const bottlenecks = findBottlenecks(troopLimits, capTotal, T);

    // Fill hero-led rallies first. Troops are water-filled evenly within the
    // hero tier, then any remainder is water-filled across no-hero rallies.
    const priorities = caps.map((_, i) => order[i] ? 1 : 0);
    const perMarch = allocate(T, caps, priorities);
    const rows = splitMarches(perMarch, r);
    const tot = {
      inf:rows.reduce((a, x) => a + x.inf, 0),
      cav:rows.reduce((a, x) => a + x.cav, 0),
      arc:rows.reduce((a, x) => a + x.arc, 0)
    };
    const grand = tot.inf + tot.cav + tot.arc;

    $('tTotal').textContent = fmt(grand);

    // Highlight every constraint that prevents one more whole troop from being
    // deployed, but only highlight capacity sources used by an active march.
    clearLimits();
    bottlenecks.troops.forEach(x => $(x.tile).classList.add('limit'));
    if(bottlenecks.capacity){
      if(capUsage.hero) $('tileCap').classList.add('limit');
      if(capUsage.squad) $('tileSquad').classList.add('limit');
    }

    const troopLabels = bottlenecks.troops.map(x => x.label);
    const labels = [...troopLabels];
    if(bottlenecks.capacity) labels.push('Deployment capacity');
    $('tLim').textContent = labels.length === 1 ? labels[0] : 'Multiple';

    if(bottlenecks.troops.length && bottlenecks.capacity){
      $('tileLim').classList.add('bn-mixed');
      $('limHint').textContent = troopLabels.join(' + ') + ' + capacity';
    } else if(bottlenecks.troops.length){
      $('tileLim').classList.add('bn-troop');
      $('limHint').textContent = troopLabels.length === 1
        ? 'Out of ' + troopLabels[0].toLowerCase()
        : troopLabels.join(' + ');
    } else if(bottlenecks.capacity){
      $('tileLim').classList.add('bn-cap');
      $('limHint').textContent = capUsage.hero && capUsage.squad
        ? 'Mixed march capacity'
        : capUsage.hero ? 'Hero march capacity' : 'Squad capacity';
    } else {
      $('tLim').textContent = '—';
      $('limHint').textContent = '';
    }

    let h = '<thead><tr class="head"><th scope="col">March</th><th scope="col">Leader</th>'
      + '<th scope="col">Infantry</th><th scope="col">Cavalry</th><th scope="col">Archers</th>'
      + '<th scope="col">Total</th><th scope="col">Capacity use</th></tr></thead><tbody>';
    for(let i = 0; i < n; i++){
      const x = rows[i];
      h += row(i+1, leaderCell(order[i]), fmt(x.inf), fmt(x.cav), fmt(x.arc),
        fmt(perMarch[i]), capacityUse(perMarch[i], caps[i]), 'line');
    }
    h += '</tbody><tfoot>' + row('Total', '', fmt(tot.inf), fmt(tot.cav), fmt(tot.arc),
      fmt(grand), capacityUse(grand, capTotal), 'sumline') + '</tfoot>';
    $('rows').innerHTML = h;

    $('leftover').textContent =
      `Left at home: ${fmt(S.inf-tot.inf)} infantry · ${fmt(S.cav-tot.cav)} cavalry · ${fmt(S.arc-tot.arc)} archers`;

    lastResult = {r, S, order, perMarch, rows, tot, grand};
    $('copyFormation').disabled = false;

    check(r);
    return true;
  }

  function check(r){
    const parsedCheck = readAmounts(CHECK_AMOUNT_IDS);
    const tolText = String($('tol').value).trim();
    const tolValid = /^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(tolText);
    const tol = tolValid ? Number(tolText.replace(',','.')) : 0;
    setFieldValidity('tol', tolValid && Number.isFinite(tol),
      'Enter a finite tolerance of zero or more.');
    if(parsedCheck.invalid.length || !tolValid || !Number.isFinite(tol)){
      $('checkError').textContent = 'Fix the highlighted number field' + (parsedCheck.invalid.length + (!tolValid ? 1 : 0) > 1 ? 's' : '') + ' to check this march.';
      $('checkRows').innerHTML = '';
      $('verdict').innerHTML = '';
      return;
    }
    $('checkError').textContent = '';
    const V = parsedCheck.values;
    const C = {inf:V.ci, cav:V.cc, arc:V.ca};
    const total = C.inf + C.cav + C.arc;

    if(total <= 0){
      $('checkRows').innerHTML = '';
      $('verdict').innerHTML = '';
      return;
    }

    const NAMES = {inf:'Infantry', cav:'Cavalry', arc:'Archers'};
    let worst = 0, worstKey = 'inf';
    const ideal = splitByRatio(total, r), delta = {}, actual = {};
    for(const k of ['inf','cav','arc']){
      actual[k] = C[k] / total * 100;
      delta[k] = actual[k] - r[k] * 100;
      if(Math.abs(delta[k]) > Math.abs(worst)){ worst = delta[k]; worstKey = k; }
    }

    let h = '<thead><tr class="head"><th scope="col">Type</th><th scope="col">Actual %</th>'
      + '<th scope="col">Target %</th><th scope="col">Should be</th></tr></thead><tbody>';
    for(const k of ['inf','cav','arc']){
      const off = Math.abs(delta[k]) > tol;
      const sign = delta[k] >= 0 ? '+' : '−';
      const tag = off
        ? `<span class="delta-bad">${sign}${Math.abs(delta[k]).toFixed(2)} pp</span>`
        : `<span class="delta-ok">within ±${tol} pp</span>`;
      h += `<tr class="line"><th scope="row">${NAMES[k]}</th>`
         + `<td>${actual[k].toFixed(2)}%</td>`
         + `<td>${(r[k]*100).toFixed(2)}%</td>`
         + `<td>${fmt(ideal[k])} &nbsp; ${tag}</td></tr>`;
    }
    $('checkRows').innerHTML = h + '</tbody>';

    const ok = Math.abs(worst) <= tol;
    if(ok){
      $('verdict').innerHTML =
        `<div class="verdict ok"><div class="head2">Matches the ratio</div>`
        + `All three types are within ±${tol} pp of target across ${fmt(total)} troops.</div>`;
    } else {
      const dir = worst > 0 ? 'too many' : 'too few';
      const diff = Math.abs(C[worstKey] - ideal[worstKey]);
      $('verdict').innerHTML =
        `<div class="verdict bad"><div class="head2">Off the ratio</div>`
        + `${NAMES[worstKey]} is the worst offender — ${dir} by ${fmt(diff)} `
        + `(${Math.abs(worst).toFixed(2)} pp). Adjust to the "should be" column to hit ${fmt(total)} on ratio.</div>`;
    }
  }

  const fullFmt = value => Math.round(value).toLocaleString('en-US');

  function formationText(){
    if(!lastResult) return '';
    const {r, S, order, perMarch, rows, tot, grand} = lastResult;
    const ratio = [r.inf, r.cav, r.arc].map(x => trim(x * 100)).join(' / ');
    const lines = [`Bear formation · ${ratio}`, ''];
    rows.forEach((march, i) => {
      const leader = HEROES[order[i] || 'none'].name;
      lines.push(`March ${i + 1} · ${leader}: ${fullFmt(march.inf)} infantry · ${fullFmt(march.cav)} cavalry · ${fullFmt(march.arc)} archers · ${fullFmt(perMarch[i])} total`);
    });
    lines.push('', `Total: ${fullFmt(tot.inf)} infantry · ${fullFmt(tot.cav)} cavalry · ${fullFmt(tot.arc)} archers · ${fullFmt(grand)} troops`);
    lines.push(`Left at home: ${fullFmt(S.inf - tot.inf)} infantry · ${fullFmt(S.cav - tot.cav)} cavalry · ${fullFmt(S.arc - tot.arc)} archers`);
    return lines.join('\n');
  }

  function setupUrl(){
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('setup', '1');
    SHARE_IDS.forEach(id => {
      const el = $(id);
      url.searchParams.set(id, el.type === 'checkbox' ? (el.checked ? '1' : '0') : el.value);
    });
    return url.href;
  }

  function loadSharedSetup(){
    const params = new URLSearchParams(window.location.search);
    if(params.get('setup') !== '1') return false;
    let loaded = false;
    SHARE_IDS.forEach(id => {
      if(!params.has(id)) return;
      const el = $(id);
      const value = params.get(id);
      if(el.type === 'checkbox'){
        if(value !== '0' && value !== '1') return;
        el.checked = value === '1';
      } else if(el.tagName === 'SELECT'){
        if(![...el.options].some(option => option.value === value)) return;
        el.value = value;
      } else {
        el.value = value;
      }
      loaded = true;
    });
    return loaded;
  }

  function fallbackCopy(text){
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.className = 'copy-fallback';
    document.body.appendChild(field);
    field.select();
    const copied = document.execCommand('copy');
    field.remove();
    if(!copied) throw new Error('Copy command was rejected');
  }

  async function copyText(text){
    if(navigator.clipboard && window.isSecureContext){
      try{
        await navigator.clipboard.writeText(text);
        return;
      }catch(e){}
    }
    fallbackCopy(text);
  }

  const copyTimers = new Map();
  function copyFeedback(button, message, ok){
    const original = button.dataset.label || button.textContent;
    button.dataset.label = original;
    button.textContent = message;
    button.classList.toggle('copied', ok);
    $('copyStatus').textContent = message;
    clearTimeout(copyTimers.get(button));
    copyTimers.set(button, setTimeout(() => {
      button.textContent = original;
      button.classList.remove('copied');
    }, 1600));
  }

  $('copyFormation').addEventListener('click', async () => {
    try{
      await copyText(formationText());
      copyFeedback($('copyFormation'), 'Formation copied', true);
    }catch(e){
      copyFeedback($('copyFormation'), 'Copy failed', false);
    }
  });

  $('copySetup').addEventListener('click', async () => {
    try{
      await copyText(setupUrl());
      copyFeedback($('copySetup'), 'Link copied', true);
    }catch(e){
      copyFeedback($('copySetup'), 'Copy failed', false);
    }
  });

  const STORE_KEY = 'bearcalc.v1';
  const store = {
    read(){
      try{
        const value = localStorage.getItem(STORE_KEY);
        if(!value) return null;
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
      }
      catch(e){ return null; }
    },
    write(obj){
      try{ localStorage.setItem(STORE_KEY, JSON.stringify(obj)); }catch(e){}
    },
    clear(){
      try{ localStorage.removeItem(STORE_KEY); }catch(e){}
    }
  };

  function saveState(){
    const o = {};
    IDS.forEach(id => {
      const el = $(id);
      o[id] = el.type === 'checkbox' ? el.checked : el.value;
    });
    FOLDS.forEach(id => { o[id] = $(id).open; });
    o.theme = theme;
    store.write(o);
  }

  function loadState(){
    const o = store.read();
    if(!o) return;
    IDS.forEach(id => {
      if(!(id in o)) return;
      const el = $(id);
      if(el.type === 'checkbox'){
        if(typeof o[id] === 'boolean') el.checked = o[id];
      } else if(el.tagName === 'SELECT'){
        const value = String(o[id]);
        if([...el.options].some(option => option.value === value)) el.value = value;
      } else if(typeof o[id] === 'string' || typeof o[id] === 'number'){
        el.value = String(o[id]);
      }
    });
    FOLDS.forEach(id => { if(typeof o[id] === 'boolean') $(id).open = o[id]; });
    if(o.theme) applyTheme(o.theme);
  }

  const THEMES = ['auto','light','dark'];
  const THEME_UI = {auto:{icon:'◐', label:'Auto', tip:'Theme: follows your system'},
                    light:{icon:'☀', label:'Light', tip:'Theme: always light'},
                    dark: {icon:'☾', label:'Dark',  tip:'Theme: always dark'}};
  let theme = 'auto';
  function applyTheme(t){
    theme = THEMES.includes(t) ? t : 'auto';
    if(theme === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    const ui = THEME_UI[theme];
    $('themeIcon').textContent = ui.icon;
    $('themeLabel').textContent = ui.label;
    $('theme').title = ui.tip;
  }
  $('theme').addEventListener('click', () => {
    applyTheme(THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]);
    saveState();
  });

  function update(){ calc(); saveState(); }

  IDS.forEach(i => { $(i).addEventListener('input', update); $(i).addEventListener('change', update); });
  FOLDS.forEach(i => $(i).addEventListener('toggle', saveState));

  $('the').addEventListener('click', () => {
    $('ri').value = 10; $('rc').value = 10; $('ra').value = 80;
    update();
  });

  $('reset').addEventListener('click', () => {
    store.clear();
    const url = new URL(window.location.href);
    const hasSharedSetup = url.searchParams.get('setup') === '1';
    url.searchParams.delete('setup');
    SHARE_IDS.forEach(id => url.searchParams.delete(id));
    if(hasSharedSetup) location.replace(url.href);
    else location.reload();
  });

  applyTheme(document.documentElement.dataset.theme || 'auto');
  loadState();
  const sharedSetupLoaded = loadSharedSetup();
  $('sharedNotice').hidden = !sharedSetupLoaded;
  const initialCalculationValid = calc();
  if(sharedSetupLoaded && initialCalculationValid) saveState();
});
