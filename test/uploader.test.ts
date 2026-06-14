import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const uploadOne = vi.fn();

vi.mock('@bugsnag/source-maps', () => ({
	node: {
		uploadOne: (...args: unknown[]) => uploadOne(...args),
	},
}));

import { BugsnagSourceMapUploaderPlugin } from '../src/BugsnagSourceMapUploaderPlugin';
import { runPlugin } from './helpers';

let tmp: string;

beforeEach(() => {
	uploadOne.mockReset();
	uploadOne.mockResolvedValue(undefined);
	tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ebp-'));
	vi.spyOn(console, 'log').mockImplementation(() => {});
	vi.spyOn(console, 'warn').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
	fs.rmSync(tmp, { recursive: true, force: true });
	vi.restoreAllMocks();
});

/** Writes an index.js + index.js.map pair and returns the .js path. */
function writeOutputs(map: object): string {
	const jsPath = path.join(tmp, 'index.js');
	fs.writeFileSync(jsPath, '// bundle');
	fs.writeFileSync(`${jsPath}.map`, JSON.stringify(map));
	return jsPath;
}

/** Builds a minimal-but-typed esbuild metafile whose outputs are the given paths. */
function metafile(...jsPaths: string[]) {
	const outputs: Record<
		string,
		{ bytes: number; inputs: Record<string, never>; imports: never[]; exports: never[] }
	> = {};
	for (const p of jsPaths) {
		outputs[p] = { bytes: 0, inputs: {}, imports: [], exports: [] };
	}
	return { inputs: {}, outputs };
}

const withTs = {
	version: 3,
	sources: ['../src/index.ts'],
	sourcesContent: ['const a: number = 1;'],
};

describe('BugsnagSourceMapUploaderPlugin', () => {
	it('uploads source maps that embed original TypeScript', async () => {
		const jsPath = writeOutputs(withTs);
		const plugin = BugsnagSourceMapUploaderPlugin({
			apiKey: 'key',
			appVersion: '1.0.0',
			bundle: 'dist/index.js',
		});

		await runPlugin(plugin, { result: { metafile: metafile(jsPath) } });

		expect(uploadOne).toHaveBeenCalledTimes(1);
		expect(uploadOne).toHaveBeenCalledWith(
			expect.objectContaining({
				apiKey: 'key',
				appVersion: '1.0.0',
				bundle: 'dist/index.js',
				sourceMap: `${jsPath}.map`,
				overwrite: false,
			}),
		);
	});

	it('skips outputs whose source map is missing', async () => {
		const jsPath = path.join(tmp, 'index.js');
		fs.writeFileSync(jsPath, '// bundle');
		const plugin = BugsnagSourceMapUploaderPlugin({ apiKey: 'k', appVersion: '1', bundle: 'b' });

		await runPlugin(plugin, { result: { metafile: metafile(jsPath) } });

		expect(uploadOne).not.toHaveBeenCalled();
	});

	it('warns but still uploads when sourcesContent is missing (default)', async () => {
		const jsPath = writeOutputs({ version: 3, sources: ['index.ts'], sourcesContent: [null] });
		const plugin = BugsnagSourceMapUploaderPlugin({ apiKey: 'k', appVersion: '1', bundle: 'b' });

		await runPlugin(plugin, { result: { metafile: metafile(jsPath) } });

		expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('sourcesContent'));
		expect(uploadOne).toHaveBeenCalledTimes(1);
	});

	it('fails the build when requireSourcesContent is set and sources are not embedded', async () => {
		const jsPath = writeOutputs({ version: 3, sources: ['index.ts'], sourcesContent: [null] });
		const plugin = BugsnagSourceMapUploaderPlugin({
			apiKey: 'k',
			appVersion: '1',
			bundle: 'b',
			requireSourcesContent: true,
		});

		await expect(runPlugin(plugin, { result: { metafile: metafile(jsPath) } })).rejects.toThrow(
			/sourcesContent/,
		);
		expect(uploadOne).not.toHaveBeenCalled();
	});

	it('throws during setup when apiKey is missing', () => {
		expect(() =>
			BugsnagSourceMapUploaderPlugin({ apiKey: '', appVersion: '1' }).setup({
				initialOptions: {},
				onEnd: () => {},
			} as any),
		).toThrow(/apiKey/);
	});

	it('falls back to outfile when no metafile is present', async () => {
		const jsPath = writeOutputs(withTs);
		const plugin = BugsnagSourceMapUploaderPlugin({ apiKey: 'k', appVersion: '1' });

		await runPlugin(plugin, { result: {}, initialOptions: { outfile: jsPath } });

		expect(uploadOne).toHaveBeenCalledTimes(1);
	});

	it('fails loudly when outputs cannot be located (no metafile, no outfile)', async () => {
		const plugin = BugsnagSourceMapUploaderPlugin({ apiKey: 'k', appVersion: '1' });

		await expect(runPlugin(plugin, { result: {}, initialOptions: {} })).rejects.toThrow(/metafile/);
		expect(uploadOne).not.toHaveBeenCalled();
	});

	it('skips upload entirely when the build reported errors', async () => {
		const jsPath = writeOutputs(withTs);
		const plugin = BugsnagSourceMapUploaderPlugin({ apiKey: 'k', appVersion: '1', bundle: 'b' });

		await runPlugin(plugin, {
			result: { errors: [{ text: 'boom' } as any], metafile: metafile(jsPath) },
		});

		expect(uploadOne).not.toHaveBeenCalled();
	});
});
