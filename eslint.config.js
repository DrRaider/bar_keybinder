import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Direct setState bypasses the store's actions — undo stack and
      // partialize won't run. Force callers to add a proper action.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "MemberExpression[object.name='useEditorStore'][property.name='setState']",
          message:
            'Add an action on the store rather than calling useEditorStore.setState — direct setState bypasses the undo stack and persist partialize.',
        },
      ],
    },
  },
  {
    // Tests and the store implementation file itself can use the bypass.
    files: ['**/*.test.{ts,tsx}', 'src/test/**/*.{ts,tsx}', 'src/store/**'],
    rules: {
      'jsx-a11y/no-autofocus': 'off',
      'no-restricted-syntax': 'off',
    },
  },
);
