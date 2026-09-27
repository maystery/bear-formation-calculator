(function (root) {
  'use strict';

  // Newest release first.
  const history = {
    versionAnchor: (version) => `v${version.replace(/\./g, '-')}`,
    releases: [
      {
        version: '1.2.0',
        date: '2026-09-27',
        title: 'Season selection and Luna',
        description:
          'Plan marches with the heroes available in your season, including Luna from Season 8, and keep your setup organized with collapsible sections.',
        changes: [
          'Added an S1–S8 selector to Joiner Heroes. Cards, assignment priority, and march leaders include heroes released up to the selected season.',
          'Season selection is saved in your browser and included in setup links. Hidden heroes retain their enabled choices; S8 remains the default to preserve existing setups.',
          'Added Luna after Margot in assignment priority, disabled by default. Her passive Driving Light grants 5% / 10% / 15% / 20% / 25% Squad Attack at levels 1–5, with level 5 recommended.',
          'Added Luna portrait and profile artwork, plus a distinct emerald-and-silver Season 8 badge. Hero-card badges continue to show each hero’s release season.',
          'Made all six calculator sections collapsible, with saved open states and live summaries for inputs, capacities, heroes, results, and march checks.',
          'Refined the season dropdown with keyboard navigation, responsive layouts, a lighter selected state, compact spacing, and clearer separation from the section collapse control.',
          'Improved number formatting near shorthand boundaries and suppressed ratio warnings caused only by floating-point rounding.',
        ],
      },
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
