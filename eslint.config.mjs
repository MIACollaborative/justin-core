import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import unusedImports from 'eslint-plugin-unused-imports';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  {
    ignores: ['node_modules/**', 'dist/**', 'build/**', 'coverage/**'],
  },

  {
    files: ['src/**/*.{ts,tsx,js,jsx}'],

    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 2020,
      },
    },

    plugins: {
      import: importPlugin,
      'unused-imports': unusedImports,
    },

    rules: {
      /*
       * Imports
       */
      'no-duplicate-imports': 'error',

      /*
       * Exports at bottom
       */
      'import/exports-last': 'error',

      /*
       * Control-flow safety
       */
      'no-unreachable': 'error',
      'no-fallthrough': 'error',
      'default-case': 'warn',

      /*
       * Unused imports only (not locals)
       */
      'unused-imports/no-unused-imports': 'warn',
      // Just in case TS/ESLint adds defaults, ensure the core rule stays off:
      'no-unused-vars': 'off',
    },
  },

  // Typing files: relax exports-last
  {
    files: ['src/**/*.d.ts', 'src/**/*.type.ts'],
    rules: {
      'import/exports-last': 'off',
    },
  },
];
