module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:prettier/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'prettier/@typescript-eslint',
  ],
  plugins: ['import'],
  env: {
    es6: true,
    node: true,
  },
  rules: {
    'import/first': 'error',
    'import/order': ['error', { 'newlines-between': 'always' }],
  },
};
