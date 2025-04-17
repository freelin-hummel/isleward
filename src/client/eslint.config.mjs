import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import react from 'eslint-plugin-react';
import globals from 'globals';

export default defineConfig([
	globalIgnores([
		'dist/**/*.*',
		'vitePlugins/temp/**/*.*'
	]),
	{
		...js.configs.recommended,
		files: ['vite.config.js', 'vitePlugins/*.js'],

		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: { ...globals.node }
		},
		rules: { ...js.configs.recommended.rules }
	},
	{
		...js.configs.recommended,

		...react.configs.flat.recommended,

		files: ['**/*.{js,mjs,cjs,jsx}'],
		ignores: ['dist', 'vite.config.js', 'vitePlugins/**/*.*'],

		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',

			parserOptions: { ecmaFeatures: { jsx: true } },

			globals: {
				...globals.browser,
				$: 'writable',
				scale: 'writable',
				scaleMult: 'writable',
				isMobile: 'writable',
				_: 'writable'
			}
		},

		plugins: { react },

		rules: {
			...js.configs.recommended.rules,
			...react.configs.flat.recommended.rules,

			'react/prop-types': 'off',
			'react/react-in-jsx-scope': 'off',
			'comma-dangle': ['error', 'never'],
			'no-cond-assign': ['error', 'always'],
			'no-console': ['error', { allow: ['warn', 'error'] }],
			'no-constant-condition': 'error',
			'no-control-regex': 'error',
			'no-debugger': 'warn',
			'no-dupe-args': 'error',
			'no-dupe-keys': 'error',
			'no-duplicate-case': 'error',
			'no-empty-character-class': 'error',
			'no-empty': ['error', { allowEmptyCatch: true }],
			'no-ex-assign': 'error',
			'no-extra-semi': 'error',
			'no-func-assign': 'error',
			'no-inner-declarations': ['error', 'functions'],
			'no-invalid-regexp': 'error',
			'no-irregular-whitespace': 'error',
			'no-negated-in-lhs': 'error',
			'no-obj-calls': 'error',
			'no-regex-spaces': 'error',
			'no-sparse-arrays': 'error',
			'no-unreachable': 'warn',
			'use-isnan': 'error',
			'valid-typeof': 'error',
			'block-scoped-var': 'error',
			curly: ['error', 'multi-or-nest'],
			'dot-notation': 'error',
			'dot-location': ['error', 'property'],
			eqeqeq: ['error', 'always', { null: 'ignore' }],
			'no-alert': 'error',
			'no-caller': 'error',
			'no-else-return': 'error',
			'no-eq-null': 'warn',
			'no-eval': 'error',
			'no-extend-native': 'warn',
			'no-fallthrough': 'error',
			'no-floating-decimal': 'error',
			'no-implied-eval': 'error',
			'no-iterator': 'error',
			'no-labels': 'error',
			'no-lone-blocks': 'error',
			'no-multi-spaces': 'error',
			'no-native-reassign': 'error',
			'no-new-func': 'error',
			'no-new-wrappers': 'error',
			'no-new': 'error',
			'no-octal-escape': 'error',
			'no-octal': 'error',
			'no-process-env': 'warn',
			'no-proto': 'error',
			'no-redeclare': 'error',
			'no-return-assign': ['error', 'always'],
			'no-script-url': 'error',
			'no-self-compare': 'error',
			'no-self-assign': 'error',
			'no-sequences': 'error',
			'no-throw-literal': 'error',
			'no-unused-expressions': 'error',
			'no-useless-call': 'error',
			'no-void': 'error',
			'no-with': 'error',
			'wrap-iife': ['error', 'inside'],
			yoda: ['error', 'never'],
			strict: ['error', 'global'],
			'no-catch-shadow': 'error',
			'no-delete-var': 'error',
			'no-label-var': 'error',
			'no-shadow-restricted-names': 'error',
			'no-shadow': ['error', {
				builtinGlobals: true,
				hoist: 'all'
			}],
			'no-undef-init': 'error',
			'no-undef': 'warn',
			'no-unused-vars': ['warn', { args: 'none' }],
			'no-use-before-define': 'error',
			'no-mixed-requires': ['error', false],
			'no-new-require': 'error',
			'no-path-concat': 'error',
			'brace-style': ['error', '1tbs'],
			camelcase: ['warn', { properties: 'never' }],
			'comma-spacing': ['error', {
				before: false,
				after: true
			}],
			'comma-style': 'error',
			'eol-last': 'error',
			'func-style': ['warn', 'expression'],
			indent: ['error', 'tab'],
			'key-spacing': ['error', { afterColon: true }],
			'max-lines-per-function': ['error', {
				max: 120,
				skipBlankLines: false,
				skipComments: false
			}],
			'new-parens': 'error',
			'no-inline-comments': 'error',
			'no-lonely-if': 'error',
			'no-mixed-spaces-and-tabs': 'error',
			'no-multiple-empty-lines': ['error', { max: 1 }],
			'no-nested-ternary': 'warn',
			'no-new-object': 'error',
			'no-spaced-func': 'error',
			'no-unneeded-ternary': 'error',
			'object-curly-spacing': ['error', 'always', {
				arraysInObjects: true,
				objectsInObjects: true
			}],
			'padded-blocks': ['error', 'never'],
			'quote-props': ['error', 'as-needed'],
			quotes: ['error', 'single', { avoidEscape: true }],
			'semi-spacing': ['error', { after: true }],
			semi: ['error', 'always'],
			'space-before-blocks': ['error', 'always'],
			'space-before-function-paren': ['error', 'always'],
			'space-infix-ops': 'error',
			'keyword-spacing': ['error', {
				before: true,
				after: true
			}],
			'arrow-parens': ['error', 'as-needed'],
			'arrow-spacing': ['error', {
				before: true,
				after: true
			}],
			'no-const-assign': 'error',
			'no-var': 'error'
		},
		settings: { react: { version: 'detect' } }
	}
]);
