'use strict';

// Loaded as a deferred classic script so opening index.html directly still works.
window.BearSettingsController = Object.freeze({
  /** @param {{capacity: import('./types').CapacityController, animateFeedback: import('./types').Feedback['animateFeedback']}} options
   * @returns {import('./types').SettingsController} */
  create({ capacity, animateFeedback }) {
    const $ = (id) => document.getElementById(id);
    const { FIELDS, decodeSettings, STORE_KEY, THEMES } = BearSettings;
    function readSettings() {
      return Object.fromEntries(
        FIELDS.map((field) => {
          let value;
          if (field.kind === 'radio')
            value = document.querySelector(`input[name="${field.id}"]:checked`).value;
          else if (field.kind === 'toggle') value = capacity.enabled;
          else if (field.kind === 'theme') value = theme;
          else {
            const el = $(field.id);
            value =
              field.kind === 'checkbox' ? el.checked : field.kind === 'fold' ? el.open : el.value;
          }
          return [field.key, value];
        }),
      );
    }

    function applySettings(settings) {
      for (const field of FIELDS) {
        if (!Object.hasOwn(settings, field.key)) continue;
        const value = settings[field.key];
        if (field.kind === 'radio') {
          document.querySelector(`input[name="${field.id}"][value="${value}"]`).checked = true;
        } else if (field.kind === 'toggle') capacity.setEnabled(value);
        else if (field.kind === 'theme') applyTheme(value);
        else {
          const property =
            field.kind === 'checkbox' ? 'checked' : field.kind === 'fold' ? 'open' : 'value';
          $(field.id)[property] = value;
        }
      }
    }

    function setupUrl() {
      return BearSettings.setupUrl(window.location.href, readSettings());
    }

    function loadSharedSetup() {
      const settings = BearSettings.sharedSettings(window.location.search);
      applySettings(settings);
      return Object.keys(settings).length > 0;
    }

    const store = {
      read() {
        try {
          const value = localStorage.getItem(STORE_KEY);
          if (!value) return null;
          const parsed = JSON.parse(value);
          return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
        } catch (e) {
          return null;
        }
      },
      write(obj) {
        try {
          localStorage.setItem(STORE_KEY, JSON.stringify(obj));
        } catch (e) {}
      },
      clear() {
        try {
          localStorage.removeItem(STORE_KEY);
        } catch (e) {}
      },
    };

    let saveTimer = null;
    let savingEnabled = true;
    function saveState() {
      clearTimeout(saveTimer);
      saveTimer = null;
      if (!savingEnabled) return;
      store.write(readSettings());
    }

    function scheduleSave() {
      if (!savingEnabled) return;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(saveState, 250);
    }

    function flushSave() {
      if (saveTimer !== null) saveState();
    }
    window.addEventListener('pagehide', flushSave);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushSave();
    });

    function loadState() {
      applySettings(decodeSettings(store.read()));
    }

    const THEME_UI = {
      auto: { icon: '◐', label: 'Auto', tip: 'Theme: follows your system' },
      light: { icon: '☀', label: 'Light', tip: 'Theme: always light' },
      dark: { icon: '☾', label: 'Dark', tip: 'Theme: always dark' },
    };
    let theme = 'auto';
    function applyTheme(t) {
      theme = THEMES.includes(t) ? t : 'auto';
      if (theme === 'auto') delete document.documentElement.dataset.theme;
      else document.documentElement.dataset.theme = theme;
      const ui = THEME_UI[theme];
      $('themeIcon').textContent = ui.icon;
      $('themeLabel').textContent = ui.label;
      $('theme').title = ui.tip;
    }
    $('theme').addEventListener('click', () => {
      applyTheme(THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]);
      animateFeedback(
        $('themeIcon'),
        [
          { transform: 'rotate(-100deg) scale(.6)', opacity: 0 },
          { transform: 'rotate(0deg) scale(1)', opacity: 1 },
        ],
        { duration: 320, easing: 'ease-out' },
      );
      scheduleSave();
    });

    FIELDS.filter((field) => field.kind === 'fold').forEach((field) =>
      $(field.id).addEventListener('toggle', scheduleSave),
    );
    function clear() {
      savingEnabled = false;
      clearTimeout(saveTimer);
      saveTimer = null;
      store.clear();
    }
    function load() {
      applyTheme(document.documentElement.dataset.theme || 'auto');
      loadState();
      return loadSharedSetup();
    }
    return Object.freeze({ load, save: saveState, scheduleSave, setupUrl, clear });
  },
});
