/* eslint-disable @typescript-eslint/no-var-requires */
const pluginJs = require('@eslint/js')
const globals = require('globals')
const tsEslint = require('typescript-eslint')

const rulesConfig = [
  {
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'warn',
      'prefer-arrow-callback': ['error', {allowNamedFunctions: false}],
      'func-style': ['error', 'expression', {allowArrowFunctions: true}],
    },
  },
]

const ignoresConfig = [{ignores: ['dist', 'bin']}]

module.exports = [
  {files: ['**/*.{ts}', '**/*.test.ts', '**/*.spec.ts']},
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.mocha,
      },
    },
  },
  pluginJs.configs.recommended,
  ...tsEslint.configs.recommended,
  ...rulesConfig,
  ...ignoresConfig,
]
