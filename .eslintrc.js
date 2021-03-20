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
    // indent: ['error', 'tab'],
    // semi: 'error',
    'eol-last': 'off'
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx', '*.svelte'],
      parserOptions: {
        project: ['./tsconfig.json'],
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