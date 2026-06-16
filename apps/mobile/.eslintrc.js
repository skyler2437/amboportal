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
    // Keep spacing/sizing on the design-token scales (space.*, radius.*,
    // fontSize.* from @/lib/theme) — flag raw numeric literals on these style
    // props. 0/1 are allowed; an intentional one-off uses an inline disable.
    // Enforced as 'error': the tree is fully on tokens, so any new raw literal
    // fails lint/CI. An intentional one-off uses an inline disable.
    'no-restricted-syntax': [
      'error',
      {
        selector:
          "Property[key.name=/^(padding|paddingHorizontal|paddingVertical|paddingTop|paddingBottom|paddingLeft|paddingRight|paddingStart|paddingEnd|margin|marginHorizontal|marginVertical|marginTop|marginBottom|marginLeft|marginRight|marginStart|marginEnd|gap|rowGap|columnGap|borderRadius|fontSize)$/][value.type='Literal'][value.value!=0][value.value!=1]",
        message:
          'Use design tokens (space.*, radius.*, fontSize.* from @/lib/theme) instead of a raw numeric value for spacing/sizing. For an intentional one-off, add an inline // eslint-disable-next-line no-restricted-syntax.',
      },
    ],
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
