import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['cjs', 'esm'],
	dts: true,
	sourcemap: true,
	clean: true,
	target: 'node18',
	platform: 'node',
	// esbuild is a peer dependency provided by the host build; never bundle it.
	external: ['esbuild'],
});
