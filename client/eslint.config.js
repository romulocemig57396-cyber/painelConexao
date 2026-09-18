import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

// Config minimalista: pega os erros mais caros de React (Rules of Hooks,
// deps de useEffect) sem entrar em regras de estilo. Foi a falta disso que
// deixou passar um useEffect declarado dentro de outra função (App.jsx) e
// quebrou o app inteiro em produção antes de alguém abrir o navegador.
export default [
  { ignores: ['dist/**'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: globals.browser,
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...js.configs.recommended.rules,
      // Só as 2 regras clássicas (hooks só no topo do componente / deps do
      // useEffect corretas) — o pacote "recommended-latest" do plugin v7 traz
      // regras novas voltadas pro React Compiler que reprovam o padrão comum
      // de "buscar dados num useEffect" usado em todo este arquivo.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
];
