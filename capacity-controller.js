'use strict';

// Loaded as a deferred classic script so opening index.html directly still works.
window.BearCapacityController = Object.freeze({
  /** @param {{onChange: () => void}} options
   * @returns {import('./types').CapacityController} */
  create({ onChange }) {
    const $ = (id) => document.getElementById(id);
    const { capacityBuffSummary, CAPACITY_SKILLS } = BearCalcCore;
    const VALORA_BONUS_PER_LEVEL = CAPACITY_SKILLS.valora.bonusPerLevel;
    const BISON_BONUS_PER_LEVEL = CAPACITY_SKILLS.bison.bonusPerLevel;
    let isBisonBuffEnabled = false;
    const fixedCapacity = (value) =>
      value >= 1000 ? `${(value / 1000).toFixed(2)}k` : Math.round(value).toLocaleString('en-US');

    const capacitySkillLevel = (id) => BearSettings.parseField(id, $(id).value).value;
    const signedCapacity = (value) => `+${fixedCapacity(value)}`;
    const capacityPickerMenu = (picker) =>
      $(picker.querySelector('.capacity-buff-level-trigger').getAttribute('aria-controls'));

    const renderedSkillLevels = new Map();
    let activeCapacityPicker = null;
    function syncCapacitySkillPicker(id, level) {
      const input = $(id);
      if (input.value !== String(level)) input.value = String(level);
      if (renderedSkillLevels.get(id) === level) return;
      const picker = input.closest('[data-capacity-skill-picker]');
      const menu = capacityPickerMenu(picker);
      picker.querySelector('[data-picker-value]').textContent = String(level);
      menu.querySelectorAll('[role="option"]').forEach((option) => {
        const selected = +option.dataset.level === level;
        option.setAttribute('aria-selected', String(selected));
        option.tabIndex = selected ? 0 : -1;
      });
      renderedSkillLevels.set(id, level);
    }

    function positionCapacityPicker(picker) {
      const trigger = picker.querySelector('.capacity-buff-level-trigger');
      const menu = capacityPickerMenu(picker);
      const anchor = picker
        .closest('.capacity-buff-content')
        .querySelector('.capacity-buff-description');
      const anchorRect = (anchor || trigger).getBoundingClientRect();
      const gap = 0;
      const edge = 10;
      const width = menu.offsetWidth;
      const height = menu.offsetHeight;
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = window.innerHeight;
      let left = anchorRect.left;
      let top;
      let placement;
      if (anchorRect.bottom + gap + height <= viewportHeight - edge) {
        placement = 'below';
        top = anchorRect.bottom + gap;
      } else {
        placement = 'above';
        top = anchorRect.top - gap - height;
      }
      left = Math.max(edge, Math.min(left, viewportWidth - width - edge));
      top = Math.max(edge, Math.min(top, viewportHeight - height - edge));
      menu.dataset.placement = placement;
      menu.style.left = `${Math.round(left)}px`;
      menu.style.top = `${Math.round(top)}px`;
    }

    function setCapacityPickerOpen(picker, open, focusSelected = false) {
      if (!open && activeCapacityPicker !== picker) return;
      if (open) closeCapacitySkillPickers(picker);
      const trigger = picker.querySelector('.capacity-buff-level-trigger');
      const menu = capacityPickerMenu(picker);
      trigger.setAttribute('aria-expanded', String(open));
      menu.hidden = !open;
      activeCapacityPicker = open ? picker : null;
      if (open) positionCapacityPicker(picker);
      if (open && focusSelected) {
        const selected = menu.querySelector('[aria-selected="true"]');
        if (selected) selected.focus();
      }
    }

    function closeCapacitySkillPickers(except) {
      if (activeCapacityPicker && activeCapacityPicker !== except)
        setCapacityPickerOpen(activeCapacityPicker, false);
    }

    let renderedCapacityBuffs = null;
    function syncCapacityBuffs(baseCapacity) {
      const valoraSkillLevel = capacitySkillLevel('valoraSkill');
      const bisonSkillLevel = capacitySkillLevel('bisonSkill');
      const valoraBonus = valoraSkillLevel * VALORA_BONUS_PER_LEVEL;
      const bisonRecordedBonus = bisonSkillLevel * BISON_BONUS_PER_LEVEL;
      syncCapacitySkillPicker('valoraSkill', valoraSkillLevel);
      syncCapacitySkillPicker('bisonSkill', bisonSkillLevel);
      const state = [baseCapacity, valoraSkillLevel, bisonSkillLevel, isBisonBuffEnabled].join('|');
      if (renderedCapacityBuffs?.state === state) return renderedCapacityBuffs.summary;
      const summary = capacityBuffSummary(baseCapacity, isBisonBuffEnabled, {
        valoraBonus,
        bisonRecordedBonus,
      });
      const toggle = $('bisonBuff');
      toggle.setAttribute('aria-checked', String(isBisonBuffEnabled));
      toggle.closest('.bison-buff-card').classList.toggle('is-active', isBisonBuffEnabled);
      $('bisonBuffStatus').textContent = isBisonBuffEnabled ? 'Active' : 'Inactive';
      $('valoraBonusCard').textContent =
        valoraBonus % 1000 === 0
          ? `+${valoraBonus / 1000}k`
          : `+${(valoraBonus / 1000).toFixed(1)}k`;
      $('bisonBonusCard').textContent = `+${bisonRecordedBonus.toLocaleString('en-US')}`;
      $('capacityValoraLevel').textContent = `(Skill Lv. ${valoraSkillLevel})`;
      $('capacityValoraValue').textContent = signedCapacity(valoraBonus);
      $('capacityBisonLevel').textContent = `Skill Lv. ${bisonSkillLevel}`;
      $('capacityBisonValue').textContent = signedCapacity(bisonRecordedBonus);
      $('capacityBisonRow').classList.toggle('is-inactive', !isBisonBuffEnabled);
      $('capacityBisonState').textContent = isBisonBuffEnabled ? 'Applied' : 'Recorded, inactive';
      $('capacityBaseValue').textContent =
        baseCapacity === null ? '–' : fixedCapacity(summary.baseCapacity);
      $('capacityBuffTotal').textContent =
        baseCapacity === null ? '–' : fixedCapacity(summary.total);
      $('capacityBuffInfo').textContent = isBisonBuffEnabled
        ? `Fearless Roar increases Squad Capacity by ${bisonRecordedBonus.toLocaleString('en-US')} for 2 hours.`
        : `Recorded bonus: +${bisonRecordedBonus.toLocaleString('en-US')}. Currently inactive.`;
      renderedCapacityBuffs = { state, summary };
      return summary;
    }

    document.querySelectorAll('[data-capacity-skill-picker]').forEach((picker) => {
      const input = $(picker.dataset.input);
      const trigger = picker.querySelector('.capacity-buff-level-trigger');
      const menu = capacityPickerMenu(picker);
      const options = [...menu.querySelectorAll('[role="option"]')];
      picker.addEventListener('pointerdown', (event) => event.stopPropagation());
      picker.addEventListener('click', (event) => event.stopPropagation());
      menu.addEventListener('pointerdown', (event) => event.stopPropagation());
      menu.addEventListener('click', (event) => event.stopPropagation());
      trigger.addEventListener('click', () => {
        const open = trigger.getAttribute('aria-expanded') !== 'true';
        closeCapacitySkillPickers(picker);
        setCapacityPickerOpen(picker, open, open);
      });
      trigger.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
        event.preventDefault();
        closeCapacitySkillPickers(picker);
        setCapacityPickerOpen(picker, true, true);
      });
      options.forEach((option, index) => {
        option.addEventListener('click', () => {
          input.value = option.dataset.level;
          syncCapacitySkillPicker(input.id, +option.dataset.level);
          setCapacityPickerOpen(picker, false);
          trigger.focus();
          input.dispatchEvent(new Event('input', { bubbles: true }));
        });
        option.addEventListener('keydown', (event) => {
          let next = index;
          if (event.key === 'ArrowRight') next = Math.min(options.length - 1, index + 1);
          else if (event.key === 'ArrowLeft') next = Math.max(0, index - 1);
          else if (event.key === 'ArrowDown') next = Math.min(options.length - 1, index + 5);
          else if (event.key === 'ArrowUp') next = Math.max(0, index - 5);
          else if (event.key === 'Home') next = 0;
          else if (event.key === 'End') next = options.length - 1;
          else if (event.key === 'Escape') {
            event.preventDefault();
            setCapacityPickerOpen(picker, false);
            trigger.focus();
            return;
          } else return;
          event.preventDefault();
          options[next].focus();
        });
      });
      picker.addEventListener('focusout', () => {
        setTimeout(() => {
          if (!picker.contains(document.activeElement) && !menu.contains(document.activeElement)) {
            setCapacityPickerOpen(picker, false);
          }
        });
      });
      menu.addEventListener('focusout', () => {
        setTimeout(() => {
          if (!picker.contains(document.activeElement) && !menu.contains(document.activeElement)) {
            setCapacityPickerOpen(picker, false);
          }
        });
      });
      $('capacityBuffPortal').appendChild(menu);
    });
    function dismissCapacityPickers(event) {
      if (
        !event.target.closest('[data-capacity-skill-picker]') &&
        !event.target.closest('.capacity-buff-level-menu')
      ) {
        closeCapacitySkillPickers();
      }
    }
    document.addEventListener('pointerdown', dismissCapacityPickers);
    document.addEventListener('click', dismissCapacityPickers);
    window.addEventListener('resize', () => closeCapacitySkillPickers());
    window.addEventListener('scroll', () => closeCapacitySkillPickers(), true);
    $('bisonBuff').addEventListener('click', () => {
      isBisonBuffEnabled = !isBisonBuffEnabled;
      onChange();
    });
    return Object.freeze({
      sync: syncCapacityBuffs,
      get enabled() {
        return isBisonBuffEnabled;
      },
      setEnabled(value) {
        isBisonBuffEnabled = value;
      },
    });
  },
});
