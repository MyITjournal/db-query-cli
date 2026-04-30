import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.js', 'bin/**/*.js', 'test.js'],
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },
];
