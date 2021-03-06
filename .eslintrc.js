const path = require('path');

module.exports = {
  extends: [
    'airbnb-typescript',
    'airbnb/hooks',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'eslint-config-prettier'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'import'],
  env: {
    browser: true,
    node: true,
    jest: true,
    es6: true,
  },
  root: true,
  parserOptions: {
    project: path.resolve(__dirname, './tsconfig.json'),
  },
  rules: {
    'function-paren-newline': 0,
    'no-unused-vars': 0,
    '@typescript-eslint/no-unused-vars': [2, { vars: 'all', args: 'after-used', ignoreRestSiblings: false }],
    '@typescript-eslint/interface-name-prefix': [2, { prefixWithI: 'always', allowUnderscorePrefix: true }],
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    '@typescript-eslint/no-floating-promises': 0,
    '@typescript-eslint/interface-name-prefix': 0,
    'object-curly-newline': 0,
    '@typescript-eslint/explicit-module-boundary-types': 0,
    'arrow-body-style': 0,
    'consistent-return': 0,
    '@typescript-eslint/no-non-null-assertion': 0,
    'class-methods-use-this': 0,
    'import/no-cycle': 0,
    'arrow-parens': 0,
    '@typescript-eslint/no-unsafe-assignment': 0,
    '@typescript-eslint/no-unsafe-member-access': 0,
    'react/prop-types': 0,
    '@typescript-eslint/comma-dangle': 0,
    'react/jsx-props-no-spreading': 0,
    'operator-linebreak': 0,
    '@typescript-eslint/no-unsafe-call': 0,
    '@typescript-eslint/restrict-template-expressions': 0,
    'react/jsx-wrap-multilines': 0,
    'react/jsx-one-expression-per-line': 0,
    'implicit-arrow-linebreak': 0,
    'no-restricted-syntax': 0,
    'no-continue': 0,
    'prefer-destructuring': 0,
    'import/prefer-default-export': 0,
    'react/destructuring-assignment': 0,
    'jsx-a11y/click-events-have-key-events': 0,
    'jsx-a11y/no-static-element-interactions': 0,
    'no-nested-ternary': 0,
    '@typescript-eslint/no-unused-vars': 0,
    '@typescript-eslint/no-non-null-asserted-optional-chain': 0,
    '@typescript-eslint/no-use-before-define': 0,
    '@typescript-eslint/restrict-plus-operands': 0,
    'no-underscore-dangle': 0,
    '@typescript-eslint/naming-convention': 0
  },
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
      },
    },
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
  },
  globals: {},
};
