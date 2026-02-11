/**
 * ESLint Configuration
 * Unified linting rules for the entire monorepo
 * Supports TypeScript, React, and Node.js
 */

module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'prettier'],
  rules: {
    'prettier/prettier': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'import/no-anonymous-default-export': 'off',
  },
  overrides: [
    // React/Next.js specific rules for web app
    {
      files: ['apps/web/**/*.{ts,tsx}'],
      settings: {
        react: {
          version: 'detect',
        },
        next: {
          rootDir: 'apps/web',
        },
      },
    },
    // Node.js specific rules for API
    {
      files: ['apps/api/**/*.{js,ts}', 'packages/**/*.{js,ts}'],
      env: {
        node: true,
        browser: false,
      },
      rules: {
        'no-console': 'off',
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
    // Jest test files
    {
      files: ['tests/**/*.{js,ts}', '**/*.test.{js,ts}', '**/*.spec.{js,ts}'],
      env: {
        jest: true,
        node: true,
      },
      rules: {
        'no-console': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
    // Scripts and utilities
    {
      files: ['scripts/**/*.js'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
  ignorePatterns: [
    'node_modules',
    'dist',
    'build',
    '.next',
    'coverage',
    '*.config.js',
    '*.config.ts',
  ],
};
