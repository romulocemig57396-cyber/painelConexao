const js = require('@eslint/js');
const globals = require('globals');

// Config minimalista pro backend (CommonJS/Node), no mesmo espírito do
// eslint.config.js do client: pega erros reais (variável não declarada,
// require não usado, etc.), sem regra de estilo.
module.exports = [
  { ignores: ['logs/**'] },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: globals.node,
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
];
