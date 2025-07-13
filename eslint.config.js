import js from '@eslint/js';
import jsdoc from 'eslint-plugin-jsdoc';
import globals from 'globals';

export default [
	js.configs.recommended,
	{
		plugins: {
			jsdoc,
		},
		rules: {
			'jsdoc/require-jsdoc': [
				'error',
				{
					require: {
						FunctionDeclaration: true,
						MethodDefinition: true,
						ClassDeclaration: true,
						ArrowFunctionExpression: true,
						FunctionExpression: true,
					},
				},
			],
			'jsdoc/require-param': 'error',
			'jsdoc/require-param-type': 'error',
			'jsdoc/require-returns': 'error',
			'jsdoc/require-returns-type': 'error',
			'jsdoc/check-types': 'error',
			'jsdoc/check-param-names': 'error',
			'jsdoc/check-tag-names': 'error',
			'jsdoc/no-undefined-types': [
				'warn',
				{
					definedTypes: [
						'AddEventListenerOptions',
						'CustomEvent',
						'EventTarget',
						'Event',
						'EventListener',
						'EventListenerObject',
					],
				},
			],
		},
		settings: {
			jsdoc: {
				mode: 'typescript',
				preferredTypes: {
					object: 'Object',
				},
			},
		},
		languageOptions: {
			ecmaVersion: 2024,
			sourceType: 'module',
			globals: {
				...globals.node,
				...globals.browser,
			},
		},
	},
	{
		ignores: ['node_modules/**', 'dist/**', 'packages/*/dist/**'],
	},
];
