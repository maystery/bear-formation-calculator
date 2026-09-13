'use strict';

// Loaded as a deferred classic script so opening index.html directly still works.
window.BearHeroController = Object.freeze({
  /**
   * @returns {import('./types').HeroController} */
  create() {
    const $ = (id) => document.getElementById(id);
    const { HEROES, HERO_SLOTS, renderHeroCards, renderHeroPriority, renderStatLegend } =
      BearHeroUI;
    $('heroGrid').innerHTML = renderHeroCards();
    $('heroPriority').innerHTML = renderHeroPriority();
    $('statLegend').innerHTML = renderStatLegend();

    const heroGrid = $('heroGrid');
    const heroCards = [...heroGrid.querySelectorAll('.herocard')];
    const visibleHeroCards = new Set();
    function loadPortrait(card) {
      const portrait = card.querySelector('.hero-card__image[data-src]');
      if (!portrait) return;
      portrait.setAttribute('href', portrait.dataset.src);
      portrait.removeAttribute('data-src');
    }
    function syncHeroVisibility() {
      heroCards.forEach((card) =>
        card.classList.toggle('is-visible', visibleHeroCards.has(card) && !document.hidden),
      );
    }
    if ('IntersectionObserver' in window) {
      const portraitObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach(({ target, isIntersecting }) => {
            if (!isIntersecting) return;
            loadPortrait(target);
            portraitObserver.unobserve(target);
          });
        },
        { rootMargin: '400px 0px' },
      );
      const visibilityObserver = new IntersectionObserver((entries) => {
        entries.forEach(({ target, isIntersecting }) => {
          if (isIntersecting) visibleHeroCards.add(target);
          else visibleHeroCards.delete(target);
          target.classList.toggle('is-visible', isIntersecting && !document.hidden);
        });
      });
      heroCards.forEach((card) => {
        portraitObserver.observe(card);
        visibilityObserver.observe(card);
      });
    } else {
      // Keep artwork available in browsers without intersection observation.
      heroCards.forEach((card) => {
        loadPortrait(card);
        visibleHeroCards.add(card);
      });
      syncHeroVisibility();
    }
    document.addEventListener('visibilitychange', syncHeroVisibility);

    const skillPortal = $('heroSkillPortal');
    heroGrid
      .querySelectorAll('.hero-skill-popover')
      .forEach((popover) => skillPortal.appendChild(popover));
    let activeSkillTrigger = null;
    let skillCloseTimer = 0;
    let skillPositionFrame = 0;

    function skillPopover(trigger) {
      return $(trigger.getAttribute('aria-controls'));
    }
    function positionSkillPopover(trigger) {
      const popover = skillPopover(trigger);
      if (!popover.classList.contains('is-open')) return;
      const card = trigger.closest('.herocard').getBoundingClientRect();
      const anchor = trigger.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = window.innerHeight;
      const gap = 8;
      const edge = 12;
      popover.style.maxWidth = `${viewportWidth - edge * 2}px`;
      popover.style.maxHeight = `${viewportHeight - edge * 2}px`;
      const width = popover.offsetWidth;
      const height = popover.offsetHeight;
      const roomRight = viewportWidth - anchor.right - gap;
      const roomLeft = card.left - gap;
      let placement;
      let left;
      let top;
      if (roomRight >= width) {
        placement = 'right';
        left = anchor.right + gap;
        top = anchor.top;
      } else if (roomLeft >= width) {
        placement = 'left';
        left = card.left - gap - width;
        top = anchor.top;
      } else {
        placement = 'above';
        left = anchor.left + (anchor.width - width) / 2;
        top = card.top - gap - height;
      }
      left = Math.max(edge, Math.min(left, viewportWidth - width - edge));
      top = Math.max(edge, Math.min(top, viewportHeight - height - edge));
      popover.dataset.placement = placement;
      popover.style.left = `${Math.round(left)}px`;
      popover.style.top = `${Math.round(top)}px`;
    }
    function scheduleSkillPosition() {
      if (!activeSkillTrigger || skillPositionFrame) return;
      skillPositionFrame = requestAnimationFrame(() => {
        skillPositionFrame = 0;
        if (activeSkillTrigger) positionSkillPopover(activeSkillTrigger);
      });
    }
    function cancelSkillClose() {
      clearTimeout(skillCloseTimer);
    }
    function scheduleSkillClose(trigger) {
      cancelSkillClose();
      skillCloseTimer = setTimeout(() => {
        const popover = skillPopover(trigger);
        if (
          !trigger.hasAttribute('data-pinned') &&
          !trigger.matches(':hover') &&
          !popover.matches(':hover')
        ) {
          setSkillDetails(trigger, false);
        }
      }, 160);
    }
    function setSkillDetails(trigger, open, pinned = false) {
      if (open) cancelSkillClose();
      const details = trigger.closest('.hero-skill-details');
      const popover = skillPopover(trigger);
      details.classList.toggle('is-open', open);
      trigger.toggleAttribute('data-pinned', open && pinned);
      trigger.setAttribute('aria-expanded', String(open));
      popover.setAttribute('aria-hidden', String(!open));
      popover.classList.toggle('is-open', open);
      details.closest('.hero-card-shell').classList.toggle('is-skill-open', open);
      activeSkillTrigger = open
        ? trigger
        : activeSkillTrigger === trigger
          ? null
          : activeSkillTrigger;
      if (open) scheduleSkillPosition();
      else if (!activeSkillTrigger) {
        cancelAnimationFrame(skillPositionFrame);
        skillPositionFrame = 0;
      }
    }
    function closeSkillDetails(except = null) {
      if (activeSkillTrigger && activeSkillTrigger !== except)
        setSkillDetails(activeSkillTrigger, false);
    }
    heroGrid.addEventListener('click', (event) => {
      const trigger = event.target.closest('.hero-stat--interactive');
      if (!trigger) return;
      event.preventDefault();
      event.stopPropagation();
      const willOpen = !trigger.hasAttribute('data-pinned');
      closeSkillDetails(trigger);
      setSkillDetails(trigger, willOpen, willOpen);
    });
    heroGrid.addEventListener('keydown', (event) => {
      const trigger = event.target.closest('.hero-stat--interactive');
      if (trigger && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        trigger.click();
        return;
      }
      if (event.key !== 'Escape') return;
      const activeTrigger = event.target.closest('.hero-stat--interactive') || activeSkillTrigger;
      if (!activeTrigger) return;
      event.preventDefault();
      setSkillDetails(activeTrigger, false);
      activeTrigger.focus();
    });
    heroGrid.addEventListener('focusin', (event) => {
      const trigger = event.target.closest('.hero-stat--interactive');
      if (!trigger) return;
      closeSkillDetails(trigger);
      setSkillDetails(trigger, true, trigger.hasAttribute('data-pinned'));
    });
    heroGrid.addEventListener('focusout', (event) => {
      const trigger = event.target.closest('.hero-stat--interactive');
      if (!trigger || trigger.hasAttribute('data-pinned')) return;
      scheduleSkillClose(trigger);
    });
    heroGrid.addEventListener('pointerover', (event) => {
      const trigger = event.target.closest('.hero-stat--interactive');
      if (!trigger || trigger.contains(event.relatedTarget)) return;
      closeSkillDetails(trigger);
      setSkillDetails(trigger, true, trigger.hasAttribute('data-pinned'));
    });
    heroGrid.addEventListener('pointerout', (event) => {
      const trigger = event.target.closest('.hero-stat--interactive');
      if (
        trigger &&
        !trigger.contains(event.relatedTarget) &&
        !trigger.hasAttribute('data-pinned')
      ) {
        scheduleSkillClose(trigger);
      }
    });
    skillPortal.addEventListener('pointerenter', cancelSkillClose, true);
    skillPortal.addEventListener(
      'pointerleave',
      () => {
        if (activeSkillTrigger && !activeSkillTrigger.hasAttribute('data-pinned')) {
          scheduleSkillClose(activeSkillTrigger);
        }
      },
      true,
    );
    function dismissSkillDetails(event) {
      if (
        !event.target.closest('.hero-skill-details') &&
        !event.target.closest('.hero-skill-portal')
      ) {
        closeSkillDetails();
      }
    }
    // Safari does not always synthesize a click when a blank area is tapped.
    document.addEventListener('pointerdown', dismissSkillDetails);
    document.addEventListener('click', dismissSkillDetails);
    window.addEventListener('resize', scheduleSkillPosition);
    window.addEventListener('scroll', scheduleSkillPosition, true);

    function leaderOrder() {
      return HERO_SLOTS.filter((h) => $(h.id).checked).map((h) => h.key);
    }
    let renderedHeroState = null;
    function syncHeroCards(order, n) {
      const state = [n, ...order].join('|');
      if (state === renderedHeroState) return;
      let benched = 0;
      const priorityChips = $('heroPriority').querySelectorAll('.hero-priority-chip');
      HERO_SLOTS.forEach((h, index) => {
        const on = $(h.id).checked;
        priorityChips[index].classList.toggle('is-disabled', !on);
        priorityChips[index].setAttribute(
          'aria-label',
          `${index + 1}. ${HEROES[h.key].name}${on ? '' : ', disabled'}`,
        );
        priorityChips[index].title = on ? HEROES[h.key].name : `${HEROES[h.key].name} — disabled`;
        const slot = order.indexOf(h.key);
        const leads = on && slot > -1 && slot < n;
        if (on && !leads) benched++;
        $(h.id).closest('.herocard').classList.toggle('on', on);
        $('pill-' + h.key).textContent = on
          ? leads
            ? 'March ' + (slot + 1)
            : 'No march'
          : 'Disabled';
        $('role-' + h.key).textContent = on
          ? leads
            ? HEROES[h.key].deployCap
            : 'Needs another march'
          : 'Left out of the split';
      });
      const led = Math.min(order.length, n);
      $('heroSum').textContent = `${order.length}/${HERO_SLOTS.length} heroes`;
      $('heroHint').textContent =
        led === 0
          ? 'No hero leading — every march is held to the squad deployment capacity.'
          : benched > 0
            ? `${benched} hero${benched > 1 ? 'es' : ''} left over — raise the march count to use them.`
            : n > led
              ? `${n - led} march${n - led > 1 ? 'es' : ''} without a hero, held to the squad deployment capacity.`
              : '';
      renderedHeroState = state;
    }
    return Object.freeze({ leaderOrder, sync: syncHeroCards });
  },
});
