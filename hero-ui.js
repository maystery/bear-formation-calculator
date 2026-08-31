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

  const HEROES = Object.freeze({
    none: {
      name:'No hero', avatar:'assets/heroes/profile/none.png'
    },
    amadeus: {
      name:'Amadeus', portrait:'assets/heroes/amadeus.png', avatar:'assets/heroes/profile/amadeus.png', inputId:'amaOn',
      season:1, deployCap:'Hero deploy cap', requiredExpSkillLevel:null,
      variant:'gold', defaultEnabled:false, art:{scale:'112%', x:'-8px', y:'4px'}
    },
    chenko: {
      name:'Chenko', portrait:'assets/heroes/chenko.png', avatar:'assets/heroes/profile/chenko.png', inputId:'chenkoOn',
      season:1, deployCap:'Hero deploy cap', requiredExpSkillLevel:4,
      variant:'purple', defaultEnabled:true, art:{scale:'108%', x:'-12px', y:'5px'}
    },
    yeonwoo: {
      name:'Yeonwoo', portrait:'assets/heroes/yeonwoo.png', avatar:'assets/heroes/profile/yeonwoo.png', inputId:'yeonwooOn',
      season:1, deployCap:'Hero deploy cap', requiredExpSkillLevel:4,
      variant:'purple', defaultEnabled:true, art:{scale:'113%', x:'-16px', y:'3px'}
    },
    amane: {
      name:'Amane', portrait:'assets/heroes/amane.png', avatar:'assets/heroes/profile/amane.png', inputId:'amaneOn',
      season:1, deployCap:'Hero deploy cap', requiredExpSkillLevel:4,
      variant:'purple', defaultEnabled:true, art:{scale:'109%', x:'-8px', y:'3px'}
    },
    margot: {
      name:'Margot', portrait:'assets/heroes/margot.png', avatar:'assets/heroes/profile/margot.png', inputId:'margotOn',
      season:4, deployCap:'Hero deploy cap', requiredExpSkillLevel:4,
      variant:'gold', defaultEnabled:true, art:{scale:'110%', x:'-10px', y:'5px'}
    },
    hilde: {
      name:'Hilde', portrait:'assets/heroes/hilde.png', avatar:'assets/heroes/profile/hilde.png', inputId:'hildeOn',
      season:2, deployCap:'Hero deploy cap', requiredExpSkillLevel:5,
      variant:'gold', defaultEnabled:true, art:{scale:'109%', x:'-5px', y:'4px'}
    }
  });

  // This remains the single source of truth for march assignment priority.
  const HERO_SLOTS = Object.freeze(['amadeus','chenko','yeonwoo','amane','margot','hilde']
    .map(key => Object.freeze({key, id:HEROES[key].inputId})));

  function seasonBadge(season){
    const src = SEASON_BADGE_BY_SEASON[season];
    if(!src) return '';
    return `<span class="season-badge" role="img" aria-label="Season ${season}" title="Season ${season}">`
      + `<img src="${src}" alt="" aria-hidden="true"></span>`;
  }

  function heroRequirement(hero, key){
    if(!hero.requiredExpSkillLevel) return '';
    const level = hero.requiredExpSkillLevel;
    const description = `Requires the first Expedition skill at level ${level} or higher`;
    return `<div class="heroreq" id="req-${key}" title="${description}">`
      + `Exp. Skill 1 &ge; Lv. <strong class="skilllevel">${level}</strong></div>`;
  }

  function heroCard({key, id}){
    const hero = HEROES[key];
    const describedBy = [`role-${key}`, hero.requiredExpSkillLevel ? `req-${key}` : '', `pill-${key}`]
      .filter(Boolean).join(' ');
    const artStyle = `--hero-art-scale:${hero.art.scale};--hero-art-x:${hero.art.x};--hero-art-y:${hero.art.y}`;
    return `<label class="herocard hero-card--${hero.variant}" for="${id}" data-hero="${key}">`
      + `<input type="checkbox" id="${id}" class="sr-only" ${hero.defaultEnabled ? 'checked' : ''} `
      + `aria-label="Include ${hero.name} as a hero leader" aria-describedby="${describedBy}">`
      + `<span class="hero-card__pattern" aria-hidden="true"></span>`
      + `<span class="hero-card__art-glow" aria-hidden="true"></span>`
      + `<span class="hero-card__portrait" aria-hidden="true">`
      + `<img class="hero-card__hero" src="${hero.portrait}" alt="" decoding="async" style="${artStyle}"></span>`
      + `<span class="hero-card__art-fade" aria-hidden="true"></span>`
      + `<span class="hero-card__content">`
      + seasonBadge(hero.season)
      + `<span class="heroinfo"><span class="heroname">${hero.name}</span>`
      + `<span class="herorole" id="role-${key}">${hero.deployCap}</span>`
      + heroRequirement(hero, key) + `</span>`
      + `<span class="pill" id="pill-${key}"></span>`
      + `</span></label>`;
  }

  function renderHeroCards(){
    return HERO_SLOTS.map(heroCard).join('');
  }

  return {SEASON_BADGE_BY_SEASON, HEROES, HERO_SLOTS, seasonBadge, heroCard, renderHeroCards};
});
