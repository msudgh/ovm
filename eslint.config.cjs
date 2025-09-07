
const eslint = require('@eslint/js')
const globals = require('globals')
const tseslint = require('typescript-eslint')

const rulesConfig = [
  {
    rules: {
      'no-unused-vars': [
        'error',
        {
          'vars': 'all',
          'args': 'after-used',
          'ignoreRestSiblings': true,
          'varsIgnorePattern': '^_', // Ignore variables that start with _
          'argsIgnorePattern': '^_'  // Ignore arguments that start with _
        }
      ],
      'no-undef': 'warn',
      'prefer-arrow-callback': ['error', { allowNamedFunctions: false }],
      'func-style': ['error', 'expression', { allowArrowFunctions: true }],
      'no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
]

const ignoresConfig = [{ ignores: ['dist', 'bin', 'eslint.config.cjs', 'coverage', 'vitest.config.ts'] }]

module.exports = [
  {
    files: ['**/*.ts', '**/*.mts', '**/*.test.ts', '**/*.test.mts', '**/*.spec.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        // Vitest globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...rulesConfig,
  ...ignoresConfig,
]
