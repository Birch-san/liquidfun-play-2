module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  extends: ['standard-with-typescript'],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  env: {
    es6: true,
    browser: true
  },
  plugins: ['svelte3', '@typescript-eslint'],
  settings: {
    'svelte3/typescript': require('typescript')
  },
  rules: {
    'eol-last': 'off',
    'new-cap': 'off',
    '@typescript-eslint/naming-convention': 'off',
    'no-void': ['error', { allowAsStatement: true }]
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx', '*.svelte'],
      parserOptions: {
        project: [
          './src/tsconfig.json',
          './serve/tsconfig.json'
        ],
        tsconfigRootDir: __dirname,
        extraFileExtensions: ['.svelte']
      }
    },
    {
      files: ['**/*.svelte'],
      processor: 'svelte3/svelte3',
      rules: {
        'no-multiple-empty-lines': 'off'
      }
    }
  ]
}