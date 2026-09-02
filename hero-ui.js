(function(root, factory){
  const api = factory();
  if(typeof module === 'object' && module.exports) module.exports = api;
  else root.BearHeroUI = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  const SEASON_BADGE_BY_SEASON = Object.freeze({
    1:'assets/seasons/s1.png',
    2:'assets/seasons/s2.png',
    3:'assets/seasons/s3.png',
    4:'assets/seasons/s4.png',
    5:'assets/seasons/s5.png',
    6:'assets/seasons/s6.png',
    7:'assets/seasons/s7.png'
  });

  const STAT_TYPES = Object.freeze({
    attack:Object.freeze({
      label:'Attack', icon:'assets/skills/attack.png', description:'Increases Squad Attack.'
    }),
    lethality:Object.freeze({
      label:'Lethality', icon:'assets/skills/leathality.png', description:'Increases Squad Lethality.'
    }),
    defense:Object.freeze({
      label:'Defense', icon:'assets/skills/def.png', description:'Increases Squad Defense.'
    }),
    enemyDamageTaken:Object.freeze({
      label:'Enemy DMG Taken', icon:'assets/skills/enemy_dmg_taken.png',
      description:'Increases damage taken by enemy squads.'
    }),
    enemyDefense:Object.freeze({
      label:'Enemy DEF', icon:'assets/skills/enemy_def.png',
      description:'Reduces enemy squad Defense.'
    })
  });

  const MIN_LEVEL_ICON = 'assets/skills/min_lvl.png';
  const RECOMMENDED_STAT_VALUES = Object.freeze({lethality:20, attack:25});

  const HERO_ARTBOARD = Object.freeze({
    width:420, height:260, breakoutCanvas:50, leftBreakoutCanvas:50, radius:16
  });

  const HEROES = Object.freeze({
    none: {
      name:'No hero', avatar:'assets/heroes/profile/none.png'
    },
    amadeus: {
      name:'Amadeus', portrait:'assets/heroes/amadeus.png', avatar:'assets/heroes/profile/amadeus.png', inputId:'amaOn',
      season:1, deployCap:'Hero deploy cap', requiredExpSkillLevel:null,
      expeditionSkill:{name:'Battle Ready', minLevel:4,
        effects:[{stat:'lethality', values:[5,10,15,20,25]}]},
      variant:'gold', defaultEnabled:false,
      art:{strength:'subtle', breakout:{start:24, end:210, height:9, shoulder:26, unrestricted:false, allowLeft:false},
        x:-8, y:-8, width:245, height:295}
    },
    chenko: {
      name:'Chenko', portrait:'assets/heroes/chenko.png', avatar:'assets/heroes/profile/chenko.png', inputId:'chenkoOn',
      season:1, deployCap:'Hero deploy cap', requiredExpSkillLevel:4,
      expeditionSkill:{name:'Stand of Arms', minLevel:4,
        effects:[{stat:'lethality', values:[5,10,15,20,25]}]},
      variant:'purple', defaultEnabled:true,
      art:{strength:'subtle', breakout:{start:26, end:220, height:8, shoulder:26, unrestricted:false, allowLeft:false},
        x:-4, y:-6, width:235, height:288}
    },
    yeonwoo: {
      name:'Yeonwoo', portrait:'assets/heroes/yeonwoo.png', avatar:'assets/heroes/profile/yeonwoo.png', inputId:'yeonwooOn',
      season:1, deployCap:'Hero deploy cap', requiredExpSkillLevel:4,
      expeditionSkill:{name:'On Guard', minLevel:4,
        effects:[{stat:'lethality', values:[5,10,15,20,25]}]},
      variant:'purple', defaultEnabled:true,
      art:{strength:'strong', breakout:{start:22, end:285, height:28, shoulder:34, unrestricted:false, allowLeft:true},
        x:-12, y:-22, width:260, height:315}
    },
    amane: {
      name:'Amane', portrait:'assets/heroes/amane.png', avatar:'assets/heroes/profile/amane.png', inputId:'amaneOn',
      season:1, deployCap:'Hero deploy cap', requiredExpSkillLevel:4,
      expeditionSkill:{name:'Tri-Phalanx', minLevel:5,
        effects:[{stat:'attack', values:[5,10,15,20,25]}]},
      variant:'purple', defaultEnabled:true, nudgeSkillName:true,
      art:{strength:'strong', breakout:{start:0, end:420, height:50, shoulder:0, unrestricted:true, allowLeft:true},
        x:-14, y:-26, width:260, height:320}
    },
    margot: {
      name:'Margot', portrait:'assets/heroes/margot.png', avatar:'assets/heroes/profile/margot.png', inputId:'margotOn',
      season:4, deployCap:'Hero deploy cap', requiredExpSkillLevel:4,
      expeditionSkill:{name:'Warbringer', minLevel:5,
        effects:[{stat:'attack', values:[5,10,15,20,25]}]},
      variant:'gold', defaultEnabled:true,
      art:{strength:'subtle', breakout:{start:25, end:215, height:8, shoulder:26, unrestricted:false, allowLeft:false},
        x:-5, y:-7, width:240, height:292}
    },
    vivian: {
      name:'Vivian', portrait:'assets/heroes/vivian.png', avatar:'assets/heroes/profile/vivian.png', inputId:'vivianOn',
      season:5, deployCap:'Hero deploy cap', requiredExpSkillLevel:4,
      expeditionSkill:{name:'Crouching Tiger', minLevel:5,
        effects:[{stat:'enemyDamageTaken', values:[5,10,15,20,25]}]},
      variant:'gold', defaultEnabled:true, nudgeSkillName:true,
      art:{strength:'strong', breakout:{start:20, end:270, height:34, shoulder:34, unrestricted:false, allowLeft:true},
        x:-14, y:-26, width:265, height:320}
    },
    ava: {
      name:'Ava', portrait:'assets/heroes/ava.png', avatar:'assets/heroes/profile/ava.png', inputId:'avaOn',
      season:7, deployCap:'Hero deploy cap', requiredExpSkillLevel:4,
      expeditionSkill:{name:'Dissolution', minLevel:5,
        effects:[{stat:'enemyDefense', values:[-5,-10,-15,-20,-25]}]},
      variant:'gold', defaultEnabled:true, nudgeSkillName:true,
      art:{strength:'strong', breakout:{start:0, end:420, height:50, shoulder:0, unrestricted:true, allowLeft:true},
        x:-20, y:-32, width:270, height:330}
    },
    weeWoo: {
      name:'Wee & Woo', portrait:'assets/heroes/weeandwoo.png', avatar:'assets/heroes/profile/wee-woo.png', inputId:'weeWooOn',
      season:7, deployCap:'Hero deploy cap', requiredExpSkillLevel:4,
      expeditionSkill:{name:'Artillerymen', minLevel:2, effects:[
        {stat:'attack', values:[3,6,9,12,15]},
        {stat:'lethality', values:[2,4,6,8,10]}
      ]},
      variant:'gold', defaultEnabled:true, nudgeSkillName:true,
      art:{strength:'medium', breakout:{start:22, end:255, height:20, shoulder:30, unrestricted:false, allowLeft:true},
        x:-10, y:-16, width:255, height:310}
    },
    hilde: {
      name:'Hilde', portrait:'assets/heroes/hilde.png', avatar:'assets/heroes/profile/hilde.png', inputId:'hildeOn',
      season:2, deployCap:'Hero deploy cap', requiredExpSkillLevel:5,
      expeditionSkill:{name:'Noble Path', minLevel:5, effects:[
        {stat:'attack', values:[3,6,9,12,15]},
        {stat:'defense', values:[2,4,6,8,10]}
      ]},
      variant:'gold', defaultEnabled:true,
      art:{strength:'subtle', breakout:{start:28, end:210, height:3, shoulder:24, unrestricted:false, allowLeft:false},
        x:-5, y:-1, width:235, height:280}
    }
  });

  // This remains the single source of truth for march assignment priority.
  const HERO_SLOTS = Object.freeze([
    'weeWoo','amadeus','chenko','yeonwoo','amane','margot','vivian','ava','hilde'
  ]
    .map(key => Object.freeze({key, id:HEROES[key].inputId})));

  function seasonBadge(season){
    const src = SEASON_BADGE_BY_SEASON[season];
    if(!src) return '';
    return `<span class="season-badge" role="img" aria-label="Season ${season}" title="Season ${season}">`
      + `<img src="${src}" alt="" aria-hidden="true"></span>`;
  }

  function statType(stat, interactive = false, attributes = ''){
    const type = STAT_TYPES[stat];
    if(!type) return '';
    return `<span class="hero-stat hero-stat--${stat}${interactive ? ' hero-stat--interactive' : ''}" data-stat="${stat}"`
      + `${attributes ? ` ${attributes}` : ''}>`
      + `<img class="hero-stat__icon" src="${type.icon}" alt="">`
      + `<span class="hero-stat__label">${type.label}</span>`
      + `${interactive ? '<span class="hero-stat__more" aria-hidden="true">&#8250;</span>' : ''}</span>`;
  }

  function skillLevelRows(effect, minimumLevel, selectedLevel = null, recommendedValue = null){
    const signedPercent = value => `${value < 0 ? '&minus;' : '+'}${Math.abs(value)}%`;
    const effectiveSelectedLevel = Number.isFinite(selectedLevel)
      ? Math.min(effect.values.length, Math.max(1, Math.trunc(selectedLevel))) : null;
    return effect.values.map((value, index) => {
      const level = index + 1;
      const increase = index ? value - effect.values[index - 1] : null;
      const states = [level === minimumLevel ? 'is-minimum' : '',
        level === effectiveSelectedLevel ? 'is-selected' : '', value === recommendedValue ? 'is-recommended' : '']
        .filter(Boolean).join(' ');
      const labels = [level === minimumLevel ? 'minimum required level' : '',
        level === effectiveSelectedLevel ? 'selected level' : '',
        value === recommendedValue ? 'recommended value' : ''].filter(Boolean).join(', ');
      return `<span class="skill-level-row${states ? ` ${states}` : ''}"`
        + `${labels ? ` aria-label="${labels}"` : ''}>`
        + `<span>Lv. ${level}</span><strong>${signedPercent(value)}</strong>`
        + `<span class="skill-level-delta">${increase === null ? ''
          : `${increase < 0 ? '&#9660;' : '&#9650;'} ${signedPercent(increase)}`}</span></span>`;
    }).join('');
  }

  function skillDetails(hero, key){
    const skill = hero.expeditionSkill;
    const triggers = skill.effects.map(effect => {
      const popoverId = `skill-popover-${key}-${effect.stat}`;
      const attributes = `role="button" tabindex="0" aria-haspopup="true" aria-expanded="false" `
        + `aria-controls="${popoverId}" `
        + `aria-label="View ${skill.name} ${STAT_TYPES[effect.stat].label} level details for ${hero.name}"`;
      return statType(effect.stat, true, attributes);
    }).join('');
    const popovers = skill.effects.map(effect => {
      const type = STAT_TYPES[effect.stat];
      const popoverId = `skill-popover-${key}-${effect.stat}`;
      const effectMarkup = `<span class="hero-skill-effect">`
        + `<span class="hero-skill-effect__title">${statType(effect.stat)}</span>`
        + `<span class="hero-skill-description">${type.description}</span>`
        + `<span class="skill-levels">${skillLevelRows(effect, skill.minLevel, skill.selectedLevel,
          RECOMMENDED_STAT_VALUES[effect.stat])}</span></span>`;
      return `<span class="hero-skill-popover hero-skill-popover--${hero.variant}" id="${popoverId}" `
        + `data-skill-owner="${key}" data-stat="${effect.stat}" role="tooltip" aria-hidden="true">`
        + `<strong class="hero-skill-popover__name">${skill.name}</strong>`
        + `<span class="hero-skill-popover__minimum"><img src="${MIN_LEVEL_ICON}" alt="">`
        + `<span>Requires: <strong>Lv. ${skill.minLevel}</strong></span></span>`
        + `<span class="hero-skill-effects">${effectMarkup}</span>`
        + `<span class="skill-popover-note">&#9733; Required &middot; Filled = recommended`
        + `${skill.selectedLevel ? ' &middot; &#9654; Selected' : ''}</span></span>`;
    }).join('');
    return `<span class="hero-skill-details">`
      + `<span class="hero-card__skill-name">${skill.name}</span>`
      + `<span class="hero-stats">${triggers}</span>`
      + `<span class="hero-skill-min"><img src="${MIN_LEVEL_ICON}" alt="">`
      + `<span>Requires Lv. <strong>${skill.minLevel}</strong></span></span>`
      + popovers + `</span>`;
  }

  function renderStatLegend(){
    const items = Object.entries(STAT_TYPES).map(([key, type]) =>
      `<span class="stat-legend__item" title="${type.description}" `
      + `aria-label="${type.label}: ${type.description}">${statType(key)}</span>`).join('');
    return `<aside class="stat-legend" aria-labelledby="stat-legend-title">`
      + `<strong class="stat-legend__title" id="stat-legend-title">Stat types</strong>`
      + `<span class="stat-legend__items">${items}</span></aside>`;
  }

  function makePortraitClipPath({start, end, height, shoulder, unrestricted = false, allowLeft = false}){
    const {width:W, height:H, radius:R, breakoutCanvas, leftBreakoutCanvas} = HERO_ARTBOARD;
    const leftOpening = allowLeft
      ? ` M ${-leftBreakoutCanvas} ${-breakoutCanvas} L 3 ${-breakoutCanvas} `
        + `L 3 ${H} L ${-leftBreakoutCanvas} ${H} Z`
      : '';
    if(unrestricted){
      return `M 0 ${-breakoutCanvas} L ${W} ${-breakoutCanvas} `
        + `L ${W} ${H - R} Q ${W} ${H} ${W - R} ${H} `
        + `L ${R} ${H} Q 0 ${H} 0 ${H - R} Z${leftOpening}`;
    }
    const leftShoulderLow = start + shoulder * .35;
    const leftShoulderHigh = start + shoulder * .65;
    const rightShoulderHigh = end - shoulder * .65;
    const rightShoulderLow = end - shoulder * .35;
    return `M ${R} 0 L ${start} 0 `
      + `C ${leftShoulderLow} 0 ${leftShoulderHigh} ${-height} ${start + shoulder} ${-height} `
      + `L ${end - shoulder} ${-height} `
      + `C ${rightShoulderHigh} ${-height} ${rightShoulderLow} 0 ${end} 0 `
      + `L ${W - R} 0 Q ${W} 0 ${W} ${R} `
      + `L ${W} ${H - R} Q ${W} ${H} ${W - R} ${H} `
      + `L ${R} ${H} Q 0 ${H} 0 ${H - R} L 0 ${R} Q 0 0 ${R} 0 Z${leftOpening}`;
  }

  function heroCard({key, id}){
    const hero = HEROES[key];
    const art = hero.art;
    const clipId = `hero-art-clip-${key}`;
    const describedBy = [`role-${key}`, `pill-${key}`].join(' ');
    const viewBoxHeight = HERO_ARTBOARD.height + HERO_ARTBOARD.breakoutCanvas;
    const viewBoxWidth = HERO_ARTBOARD.width + HERO_ARTBOARD.leftBreakoutCanvas;
    const portraitClipPath = makePortraitClipPath(art.breakout);
    return `<div class="hero-card-shell" data-breakout="${art.strength}">`
      + `<label class="herocard hero-card--${hero.variant}${hero.nudgeSkillName ? ' hero-card--nudge-skill' : ''}" `
      + `for="${id}" data-hero="${key}">`
      + `<input type="checkbox" id="${id}" class="sr-only" ${hero.defaultEnabled ? 'checked' : ''} `
      + `aria-label="Include ${hero.name} as a hero leader" aria-describedby="${describedBy}">`
      + `<span class="hero-card__surface" aria-hidden="true">`
      + `<span class="hero-card__background"></span>`
      + `<span class="hero-card__pattern"></span>`
      + `<span class="hero-card__art-glow"></span></span>`
      + `<span class="hero-card__border" aria-hidden="true"></span>`
      + `<svg class="hero-card__art" viewBox="-${HERO_ARTBOARD.leftBreakoutCanvas} -${HERO_ARTBOARD.breakoutCanvas} ${viewBoxWidth} ${viewBoxHeight}" `
      + `preserveAspectRatio="none" aria-hidden="true" focusable="false">`
      + `<defs><clipPath id="${clipId}" clipPathUnits="userSpaceOnUse">`
      + `<path class="hero-card__clip-shape" d="${portraitClipPath}"></path>`
      + `</clipPath></defs>`
      + `<image class="hero-card__image" href="${hero.portrait}" x="${art.x}" y="${art.y}" `
      + `width="${art.width}" height="${art.height}" preserveAspectRatio="xMidYMax meet" `
      + `clip-path="url(#${clipId})"></image></svg>`
      + `<span class="hero-card__art-fade" aria-hidden="true"></span>`
      + `<span class="hero-card__info-bg" aria-hidden="true"></span>`
      + `<span class="hero-card__content">`
      + seasonBadge(hero.season)
      + `<span class="heroinfo"><span class="heroname">${hero.name}</span>`
      + `<span class="herorole sr-only" id="role-${key}">${hero.deployCap}</span></span>`
      + skillDetails(hero, key)
      + `<span class="pill" id="pill-${key}"></span>`
      + `</span></label></div>`;
  }

  function renderHeroCards(){
    return HERO_SLOTS.map(heroCard).join('');
  }

  function renderHeroPriority(){
    const escapeHtml = value => value.replaceAll('&','&amp;').replaceAll('<','&lt;')
      .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
    return '<span>Assignment priority</span>'
      + HERO_SLOTS.map(({key}) => escapeHtml(HEROES[key].name)).join(' <b>&rarr;</b> ');
  }

  return {
    SEASON_BADGE_BY_SEASON, STAT_TYPES, MIN_LEVEL_ICON, RECOMMENDED_STAT_VALUES,
    HERO_ARTBOARD, HEROES, HERO_SLOTS,
    seasonBadge, statType, skillLevelRows, skillDetails, renderStatLegend,
    makePortraitClipPath, heroCard, renderHeroCards, renderHeroPriority
  };
});
