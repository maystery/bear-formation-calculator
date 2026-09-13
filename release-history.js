(function (root) {
  'use strict';

  // Newest release first.
  const history = {
    versionAnchor: (version) => `v${version.replace(/\./g, '-')}`,
    releases: [
      {
        version: '1.1.0',
        date: '2026-09-13',
        title: 'Release history at a glance',
        changes: [
          'Added release notes in the footer so you can see what changed between versions.',
          'Added a visible version and commit hash to identify the calculator you are using.',
        ],
      },
      {
        version: '1.0.0',
        title: 'Calculator features',
        changes: [
          'Split troops into up to seven marches, with balanced or sequential filling and individual capacity limits.',
          'Choose march leaders and configure Valora and Mighty Bison capacity bonuses.',
          'Check march ratios, copy formations, share setup links, and save settings in your browser.',
          'Use light and dark themes, mobile-friendly controls, and hero skill details with level progression.',
        ],
      },
    ],
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = history;
  else root.BearReleases = history;
})(typeof globalThis !== 'undefined' ? globalThis : this);
