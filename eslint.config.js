'use strict';
const js = require('@eslint/js');
const globals = require('globals');
module.exports = [
  { ignores: ['site/**', 'node_modules/**', 'data/**', 'open_post.html', 'public/**'] },
  js.configs.recommended,
  { languageOptions: { ecmaVersion: 2023, sourceType: 'commonjs', globals: { ...globals.node } }, rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_|^next$|^req$|^res$', caughtErrorsIgnorePattern: '^_' }] } },
];
