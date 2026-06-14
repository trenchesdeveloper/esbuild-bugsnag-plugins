import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	{
		ignores: ['dist', 'node_modules'],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		rules: {
			'@typescript-eslint/no-explicit-any': 'warn',
		},
	},
	{
		// Tests legitimately use casts to build partial esbuild fixtures.
		files: ['test/**'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
		},
	},
);
