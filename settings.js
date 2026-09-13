(function (root, factory) {
  const api =
    typeof module === 'object' && module.exports
      ? factory(require('./calculator-core.js'), require('./hero-ui.js'))
      : factory(root.BearCalcCore, root.BearHeroUI);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BearSettings = api;
})(globalThis, (core, heroes) => {
  'use strict';

  const STORE_KEY = 'bearcalc.v1';
  const THEMES = Object.freeze(['auto', 'light', 'dark']);
  const FILL_STRATEGIES = Object.freeze(['equal', 'sequential']);
  /** @param {string} id
   * @param {import('./types').FieldDefinition['scope']} [scope]
   * @returns {Pick<import('./types').FieldDefinition, 'id' | 'kind' | 'scope'>} */
  const amount = (id, scope = 'formation') => ({ id, kind: 'amount', scope });
  // Markup owns initial field values. This schema owns field types, validation,
  // update scope and serialization. Keep existing storage and URL keys stable.
  /** @type {readonly import('./types').FieldDefinition[]} */
  const FIELDS = Object.freeze(
    [
      ...['si', 'sc', 'sa', 'squad', 'cap'].map((id) => amount(id)),
      ...['ri', 'rc', 'ra'].map((id) => ({ id, kind: 'ratio', scope: 'formation' })),
      { id: 'n', kind: 'range', scope: 'formation' },
      { id: 'valoraSkill', kind: 'skill', skill: 'valora', scope: 'formation' },
      { id: 'bisonSkill', kind: 'skill', skill: 'bison', scope: 'formation' },
      ...heroes.HERO_SLOTS.map(({ id }) => ({ id, kind: 'checkbox', scope: 'formation' })),
      { id: 'unit', kind: 'select', values: ['k', 'full'], scope: 'formation' },
      ...['ci', 'cc', 'ca'].map((id) => amount(id, 'check')),
      { id: 'tol', kind: 'tolerance', scope: 'check' },
      { id: 'fillStrategy', kind: 'radio', values: FILL_STRATEGIES, scope: 'formation' },
      {
        id: 'bisonBuff',
        key: 'bisonBuffEnabled',
        shareKey: 'bison',
        kind: 'toggle',
        scope: 'formation',
      },
      ...['foldCap', 'foldHeroes'].map((id) => ({ id, kind: 'fold', scope: 'preference' })),
      { id: 'theme', kind: 'theme', values: THEMES, scope: 'preference' },
    ].map((field) =>
      Object.freeze({
        key: field.id,
        shareKey: field.id,
        shared: field.scope === 'formation',
        ...field,
      }),
    ),
  );
  const FIELD_BY_ID = Object.freeze(Object.fromEntries(FIELDS.map((field) => [field.id, field])));
  const inputFields = FIELDS.filter(
    (field) => !['radio', 'toggle', 'fold', 'theme'].includes(field.kind),
  );
  const idsFor = (kind, scope) =>
    FIELDS.filter((field) => field.kind === kind && (!scope || field.scope === scope)).map(
      (field) => field.id,
    );

  /** @param {string} id
   * @param {unknown} value */
  function parseField(id, value) {
    const field = FIELD_BY_ID[id];
    if (field.kind === 'amount') return core.parseAmount(value);
    if (field.kind === 'ratio') return core.parseRatio(value);
    if (field.kind === 'tolerance') {
      const text = String(value).trim();
      const number = Number(text.replace(',', '.'));
      const valid = /^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(text) && Number.isFinite(number);
      return { valid, value: valid ? number : 0 };
    }
    if (field.kind === 'skill') return { valid: true, value: core.skillLevel(value, field.skill) };
    if (field.kind === 'range')
      return {
        valid: true,
        value: Math.min(core.MAX_MARCHES, Math.max(1, Math.floor(Number(value) || 1))),
      };
    return {
      valid: field.values
        ? typeof value === 'string' && field.values.includes(value)
        : typeof value === 'boolean',
      value,
    };
  }

  function validationMessage(id) {
    const kind = FIELD_BY_ID[id].kind;
    if (kind === 'amount') return 'Enter a non-negative number, optionally followed by k, m, or b.';
    if (kind === 'ratio') return 'Enter a finite percentage of zero or more.';
    return 'Enter a finite tolerance of zero or more.';
  }

  function inputEvent(field) {
    return ['checkbox', 'select', 'radio'].includes(field.kind) ? 'change' : 'input';
  }

  // Preserve editable number strings (including invalid ones), so restoring a
  // draft still lets the UI explain what needs fixing. Reject wrong JSON types.
  /** @param {unknown} record
   * @param {'storage' | 'url'} [source]
   * @returns {import('./types').SavedSettings} */
  function decodeSettings(record, source = 'storage') {
    const output = {};
    if (!record || typeof record !== 'object' || Array.isArray(record)) return output;
    for (const field of FIELDS) {
      if (source === 'url' && !field.shared) continue;
      const key = source === 'url' ? field.shareKey : field.key;
      if (!Object.hasOwn(record, key)) continue;
      const value = record[key];
      if (['checkbox', 'toggle', 'fold'].includes(field.kind)) {
        if (source === 'url') {
          if (value === '0' || value === '1') output[field.key] = value === '1';
        } else if (typeof value === 'boolean') output[field.key] = value;
      } else if (field.values) {
        if (field.values.includes(value)) output[field.key] = value;
      } else if (
        typeof value === 'string' ||
        (typeof value === 'number' && Number.isFinite(value))
      ) {
        output[field.key] = String(value);
      }
    }
    return output;
  }

  /** @param {string} href
   * @param {import('./types').SavedSettings} settings
   * @returns {string} */
  function setupUrl(href, settings) {
    const url = new URL(href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('setup', '1');
    for (const field of FIELDS) {
      if (!field.shared || !Object.hasOwn(settings, field.key)) continue;
      const value = settings[field.key];
      url.searchParams.set(
        field.shareKey,
        typeof value === 'boolean' ? (value ? '1' : '0') : String(value),
      );
    }
    return url.href;
  }

  /** @param {string} search
   * @returns {import('./types').SavedSettings} */
  function sharedSettings(search) {
    const params = new URLSearchParams(search);
    return params.get('setup') === '1' ? decodeSettings(Object.fromEntries(params), 'url') : {};
  }

  /** @param {string} href
   * @returns {string} */
  function resetUrl(href) {
    const url = new URL(href);
    [
      'setup',
      'sav',
      ...FIELDS.filter((field) => field.shared).map((field) => field.shareKey),
    ].forEach((key) => url.searchParams.delete(key));
    return url.href;
  }

  return Object.freeze({
    STORE_KEY,
    THEMES,
    FILL_STRATEGIES,
    FIELDS,
    FIELD_BY_ID,
    inputFields,
    idsFor,
    parseField,
    validationMessage,
    inputEvent,
    decodeSettings,
    setupUrl,
    sharedSettings,
    resetUrl,
  });
});
