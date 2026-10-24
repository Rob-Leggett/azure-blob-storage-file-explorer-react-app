import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import jest from 'eslint-plugin-jest'
import prettierRecommended from 'eslint-plugin-prettier/recommended'
import globals from 'globals'

export default defineConfig([
  globalIgnores(['.next/**', 'out/**', 'build/**', 'dist/**', 'coverage/**', 'next-env.d.ts']),
  js.configs.recommended,
  ...nextCoreWebVitals,
  prettierRecommended,
  {
    files: ['tests/**', '**/*.test.{ts,tsx,js}', 'jest.setup.ts'],
    ...jest.configs['flat/recommended'],
  },
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        React: 'readonly',
      },
    },
    rules: {
      'padding-line-between-statements': ['error', { blankLine: 'always', prev: '*', next: ['return', 'export'] }],
      'react/jsx-filename-extension': 'off',
      'react-hooks/exhaustive-deps': 0,
      'no-console': ['error', { allow: ['warn', 'error', 'info'] }],
      'no-case-declarations': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ClassDeclaration',
          message: 'Classes are not allowed.',
        },
      ],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-restricted-exports': [
        'error',
        {
          restrictedNamedExports: ['default', '*'],
        },
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // TypeScript performs these checks; the core rules misreport types and ambient globals
      'no-undef': 'off',
      'no-redeclare': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
])
