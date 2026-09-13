import js from '@eslint/js';
import globals from 'globals';

const appGlobals = Object.fromEntries(
  [
    'BearCalcCore',
    'BearHeroUI',
    'BearSettings',
    'BearHeroController',
    'BearCapacityController',
    'BearSettingsController',
    'BearFormationView',
    'BearFeedback',
  ].map((name) => [name, 'readonly']),
);

export default [
  { ignores: ['node_modules/**', 'artifacts/**'] },
  {
    files: ['**/*.{js,cjs,mjs}'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 'latest',
      globals: { ...globals.browser, ...globals.node, ...appGlobals },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      eqeqeq: 'error',
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
];
