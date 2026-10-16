(function (root, factory) {
  const api = factory(root.document);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BearHolidayThemes = api;
})(globalThis, (document) => {
  'use strict';

  // Holiday presentation is independent of game seasons and light/dark mode.
  // Add future holidays here, with optional per-hero artwork and recurring dates.
  const heroFiles = {
    weeWoo: 'weeandwoo',
    amadeus: 'amadeus',
    chenko: 'chenko',
    yeonwoo: 'yeonwoo',
    amane: 'amane',
    margot: 'margot',
    luna: 'luna',
    vivian: 'vivian',
    ava: 'ava',
    hilde: 'hilde',
  };
  const HOLIDAYS = Object.freeze({
    halloween: Object.freeze({
      label: 'Halloween',
      title: 'The midnight hunt',
      description: 'Your heroes are dressed for a hauntingly good bear hunt.',
      bannerArt: 'assets/holidays/halloween/nightfall.svg',
      start: 1001,
      end: 1102,
      buffs: Object.freeze({
        valora: 'assets/holidays/halloween/buffs/valora.webp',
        bison: 'assets/holidays/halloween/buffs/mighty-bison.webp',
      }),
      heroes: Object.freeze(
        Object.fromEntries(
          Object.entries(heroFiles).map(([key, file]) => [
            key,
            Object.freeze({
              portrait: `assets/holidays/halloween/heroes/${file}.webp`,
              avatar: `assets/holidays/halloween/profile/${file}.webp`,
            }),
          ]),
        ),
      ),
    }),
  });
  const PREFERENCES = Object.freeze(['auto', 'default', ...Object.keys(HOLIDAYS)]);
  let bannerInView = false;

  /** Recurring local dates, including ranges spanning New Year.
   * @param {Date} date
   * @param {{start: number, end: number}} holiday */
  function isInWindow(date, holiday) {
    const day = (date.getMonth() + 1) * 100 + date.getDate();
    return holiday.start <= holiday.end
      ? day >= holiday.start && day <= holiday.end
      : day >= holiday.start || day <= holiday.end;
  }

  function resolve(preference = 'auto', date = new Date()) {
    if (preference === 'default') return 'default';
    if (Object.hasOwn(HOLIDAYS, preference)) return preference;
    return Object.keys(HOLIDAYS).find((key) => isInWindow(date, HOLIDAYS[key])) || 'default';
  }

  function current() {
    return document?.documentElement.dataset.holiday || 'default';
  }

  function asset(key, kind, fallback, holiday = current()) {
    return HOLIDAYS[holiday]?.heroes?.[key]?.[kind] || fallback;
  }

  function buffAsset(key, fallback, holiday = current()) {
    return HOLIDAYS[holiday]?.buffs?.[key] || fallback;
  }

  function sourceAttribute(element) {
    return element.hasAttribute('data-src')
      ? 'data-src'
      : element.localName === 'image'
        ? 'href'
        : 'src';
  }

  function syncMotion() {
    const banner = document.getElementById('holidayBanner');
    if (!banner) return;
    const enabled = document.getElementById('holidayMotion')?.checked !== false;
    banner.classList.toggle('effects-paused', !enabled);
    banner.classList.toggle(
      'is-visible',
      bannerInView && !document.hidden && current() === 'halloween',
    );
  }

  function syncArtwork() {
    document.querySelectorAll('[data-hero-asset], [data-buff-asset]').forEach((element) => {
      const { heroAsset: key, buffAsset: buffKey, assetKind: kind, defaultSrc } = element.dataset;
      const source = buffKey ? buffAsset(buffKey, defaultSrc) : asset(key, kind, defaultSrc);
      // Keep off-screen SVG portraits lazy when switching a holiday.
      const attribute = sourceAttribute(element);
      if (element.getAttribute(attribute) !== source) element.setAttribute(attribute, source);
    });
  }

  function apply(preference = 'auto') {
    if (!document) return;
    const choice = PREFERENCES.includes(preference) ? preference : 'auto';
    const holiday = resolve(choice);
    document.documentElement.dataset.holiday = holiday;
    document.documentElement.dataset.holidayPreference = choice;
    const select = document.getElementById('holidayTheme');
    if (select) select.value = choice;
    const definition = HOLIDAYS[holiday];
    const banner = document.getElementById('holidayBanner');
    if (banner) {
      banner.hidden = !definition;
      document.getElementById('holidayEyebrow').textContent = definition?.label || '';
      document.getElementById('holidayTitle').textContent = definition?.title || '';
      document.getElementById('holidayDescription').textContent = definition?.description || '';
      if (definition?.bannerArt) banner.querySelector('img').src = definition.bannerArt;
    }
    const status = document.getElementById('holidayStatus');
    if (status)
      status.textContent =
        choice === 'auto'
          ? `Auto · ${definition?.label || 'Classic'}`
          : definition?.label || 'Classic';
    syncArtwork();
    syncMotion();
  }

  function init() {
    const select = document.getElementById('holidayTheme');
    // The registry owns available choices so future themes need no controller changes.
    select.replaceChildren(
      ...PREFERENCES.map((key) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = key === 'auto' ? 'Auto · seasonal' : HOLIDAYS[key]?.label || 'Classic';
        return option;
      }),
    );
    select.addEventListener('change', () => apply(select.value));
    document.getElementById('holidayMotion').addEventListener('change', syncMotion);
    const banner = document.getElementById('holidayBanner');
    if ('IntersectionObserver' in globalThis) {
      new IntersectionObserver(([entry]) => {
        bannerInView = entry.isIntersecting;
        syncMotion();
      }).observe(banner);
    } else bannerInView = true;
    document.addEventListener(
      'error',
      (event) => {
        const element = event.target;
        if (!element.dataset?.heroAsset && !element.dataset?.buffAsset) return;
        const attribute = sourceAttribute(element);
        const fallback = element.dataset.defaultSrc;
        if (element.getAttribute(attribute) !== fallback) element.setAttribute(attribute, fallback);
      },
      true,
    );
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && select.value === 'auto') apply('auto');
      syncMotion();
    });
    apply(document.documentElement.dataset.holidayPreference || 'auto');
  }

  return Object.freeze({
    HOLIDAYS,
    PREFERENCES,
    isInWindow,
    resolve,
    current,
    asset,
    buffAsset,
    apply,
    init,
  });
});
