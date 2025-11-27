import { createRequire } from 'module'
import babelParser from 'next/dist/compiled/babel/eslint-parser.js'

const require = createRequire(import.meta.url)

export default [
  {
    ignores: ['node_modules/**', '.next/**', 'public/**', 'pnpm-lock.yaml', 'package-lock.json'],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          presets: [require.resolve('next/babel')],
        },
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'off',
    },
  },
]
