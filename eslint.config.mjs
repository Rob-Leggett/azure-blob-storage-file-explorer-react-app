import { FlatCompat } from '@eslint/eslintrc'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: {
    rules: {},
  },
})

// eslint-disable-next-line import/no-anonymous-default-export
export default [
  ...compat.extends(
    'eslint:recommended',
    'next/core-web-vitals',
    'plugin:prettier/recommended',
    'plugin:jest/recommended',
  ),
  {
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
      },
      globals: {
        browser: 'readonly',
        node: 'readonly',
        jest: 'readonly',
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
]
