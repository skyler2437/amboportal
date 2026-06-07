/**
 * ESLint config for the Expo mobile app.
 *
 * Intentionally focused on the React Hooks rules: `rules-of-hooks` (error) and
 * `exhaustive-deps` (warn) guard against the effect / dependency-array mistakes
 * that have caused production render loops (e.g. AMBOPORTAL-MOBILE-4). Broader
 * style/lint coverage can be layered on later via eslint-config-expo.
 *
 * Plugins/parser are provided transitively by the repo's web toolchain, so this
 * adds no new dependencies.
 */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['react-hooks'],
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
  ignorePatterns: [
    'node_modules/',
    'ios/',
    'android/',
    '.expo/',
    'babel.config.js',
    'metro.config.js',
    'app.config.ts',
  ],
};
