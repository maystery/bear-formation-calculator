'use strict';

// Presentation only: hero availability and saved state belong to the caller.
window.BearSeasonSelector = Object.freeze({
  /** @param {{root: HTMLElement, value: import('./types').Season, onChange: (value: import('./types').Season) => void}} options */
  create({ root, value, onChange }) {
    const { SEASON_BADGE_BY_SEASON, seasonBadge } = BearHeroUI;
    const menuId = `${root.id}-menu`;
    // Older browsers (Safari <17, Firefox <125) lack popovers; fall back to `hidden`.
    const supportsPopover = typeof HTMLElement.prototype.showPopover === 'function';
    root.innerHTML =
      `<button type="button" class="season-selector-trigger" aria-haspopup="listbox" ` +
      `aria-expanded="false" aria-controls="${menuId}"` +
      `${supportsPopover ? ` popovertarget="${menuId}"` : ''}></button>`;
    const trigger = root.querySelector('button');
    const menu = document.createElement('div');
    menu.id = menuId;
    menu.className = 'season-selector-menu';
    if (supportsPopover) menu.setAttribute('popover', 'auto');
    else menu.hidden = true;
    menu.setAttribute('role', 'listbox');
    menu.setAttribute('aria-label', 'Joiner heroes season');
    menu.innerHTML = Object.keys(SEASON_BADGE_BY_SEASON)
      .map(
        (season) =>
          `<button type="button" role="option" class="season-selector-option" ` +
          `data-season="${season}" aria-label="Season ${season}" aria-selected="false" tabindex="-1">` +
          `${seasonBadge(season)}<span>Season ${season}</span>` +
          `<span class="season-selector-check" aria-hidden="true">✓</span></button>`,
      )
      .join('');
    // With popover support, the top layer handles stacking, outside clicks and Escape.
    document.body.appendChild(menu);
    const options = [...menu.querySelectorAll('button')];
    const isOpen = () => (supportsPopover ? menu.matches(':popover-open') : !menu.hidden);
    let positionFrame = 0;

    function setValue(season) {
      const label = `Season ${season}`;
      trigger.innerHTML = `${seasonBadge(season)}<span>${label}</span><i aria-hidden="true"></i>`;
      trigger.setAttribute('aria-label', `Joiner heroes season: ${label}`);
      options.forEach((option) => {
        const selected = Number(option.dataset.season) === season;
        option.setAttribute('aria-selected', String(selected));
        option.tabIndex = selected ? 0 : -1;
      });
    }

    function close(restoreFocus = false) {
      if (!isOpen()) return;
      if (supportsPopover) menu.hidePopover();
      else menu.hidden = true;
      cancelAnimationFrame(positionFrame);
      positionFrame = 0;
      trigger.setAttribute('aria-expanded', 'false');
      if (restoreFocus) trigger.focus({ preventScroll: true });
    }

    function positionMenu() {
      const anchor = trigger.getBoundingClientRect();
      const edge = 12;
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = window.innerHeight;
      menu.style.maxHeight = `${viewportHeight - edge * 2}px`;
      const width = menu.offsetWidth;
      const height = menu.offsetHeight;
      const below = anchor.bottom + 6;
      const top = below + height <= viewportHeight - edge ? below : anchor.top - 6 - height;
      menu.style.left = `${Math.max(edge, Math.min(anchor.right - width, viewportWidth - width - edge))}px`;
      menu.style.top = `${Math.max(edge, Math.min(top, viewportHeight - height - edge))}px`;
    }

    function schedulePosition() {
      if (!isOpen() || positionFrame) return;
      positionFrame = requestAnimationFrame(() => {
        positionFrame = 0;
        if (isOpen()) positionMenu();
      });
    }

    function open() {
      if (isOpen()) return;
      if (supportsPopover) menu.showPopover();
      else menu.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      positionMenu();
      menu.querySelector('[aria-selected="true"]').focus({ preventScroll: true });
    }

    trigger.addEventListener('click', (event) => {
      // This control sits inside a details summary; only the rest of the header toggles it.
      event.preventDefault();
      event.stopPropagation();
      if (isOpen()) close(true);
      else open();
    });
    trigger.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        open();
      }
    });
    menu.addEventListener('click', (event) => {
      const option = event.target.closest('[data-season]');
      if (!option) return;
      const season = Number(option.dataset.season);
      setValue(season);
      close(true);
      onChange(season);
    });
    menu.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close(true);
        return;
      }
      if (event.key === 'Tab') {
        // Continue the normal tab order from the trigger, not the body-level portal.
        close(true);
        return;
      }
      const index = options.indexOf(document.activeElement);
      if (index < 0) return;
      const columns = getComputedStyle(menu).gridTemplateColumns.split(' ').length;
      const next = {
        ArrowRight: Math.min(options.length - 1, index + 1),
        ArrowLeft: Math.max(0, index - 1),
        ArrowDown: Math.min(options.length - 1, index + columns),
        ArrowUp: Math.max(0, index - columns),
        Home: 0,
        End: options.length - 1,
      }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      options.forEach((option, i) => (option.tabIndex = i === next ? 0 : -1));
      options[next].focus();
    });
    menu.addEventListener('toggle', () => {
      trigger.setAttribute('aria-expanded', String(isOpen()));
    });
    if (!supportsPopover)
      document.addEventListener('pointerdown', (event) => {
        if (isOpen() && !menu.contains(event.target) && !root.contains(event.target)) close();
      });
    document.addEventListener('focusin', (event) => {
      if (isOpen() && !menu.contains(event.target) && !root.contains(event.target)) close();
    });
    window.addEventListener('resize', schedulePosition);
    window.addEventListener(
      'scroll',
      (event) => {
        if (!isOpen()) return;
        if (!(event.target instanceof Node) || !menu.contains(event.target)) schedulePosition();
      },
      true,
    );
    setValue(value);
    return Object.freeze({ setValue, close });
  },
});
