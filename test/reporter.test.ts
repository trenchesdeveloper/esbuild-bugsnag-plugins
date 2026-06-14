import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BugsnagBuildReporterPlugin } from '../src/BugsnagBuildReporterPlugin';
import { runPlugin } from './helpers';

const fetchMock = vi.fn();

beforeEach(() => {
	fetchMock.mockReset();
	fetchMock.mockResolvedValue({ ok: true, status: 200, statusText: 'OK', text: async () => '' });
	vi.stubGlobal('fetch', fetchMock);
	vi.spyOn(console, 'log').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

function bodyOf(call: number): Record<string, unknown> {
	return JSON.parse(fetchMock.mock.calls[call][1].body);
}

describe('BugsnagBuildReporterPlugin', () => {
	it('posts a build payload with source control when a repository is given', async () => {
		const plugin = BugsnagBuildReporterPlugin({
			apiKey: 'key',
			appVersion: '1.2.3',
			repository: 'https://github.com/acme/app',
		});

		await runPlugin(plugin, { result: {} });

		expect(fetchMock).toHaveBeenCalledWith(
			'https://build.bugsnag.com/',
			expect.objectContaining({ method: 'POST' }),
		);
		expect(bodyOf(0)).toMatchObject({
			apiKey: 'key',
			appVersion: '1.2.3',
			sourceControl: {
				provider: 'github',
				repository: 'https://github.com/acme/app',
				revision: '1.2.3',
			},
		});
	});

	it('omits source control when no repository is provided', async () => {
		const plugin = BugsnagBuildReporterPlugin({ apiKey: 'k', appVersion: '1' });

		await runPlugin(plugin, { result: {} });

		expect(bodyOf(0).sourceControl).toBeUndefined();
	});

	it('uses an explicit revision and endpoint override when supplied', async () => {
		const plugin = BugsnagBuildReporterPlugin({
			apiKey: 'k',
			appVersion: '1',
			repository: 'https://github.com/acme/app',
			revision: 'abc123',
			endpoint: 'https://build.example.com/',
		});

		await runPlugin(plugin, { result: {} });

		expect(fetchMock).toHaveBeenCalledWith('https://build.example.com/', expect.anything());
		expect((bodyOf(0).sourceControl as { revision: string }).revision).toBe('abc123');
	});

	it('throws during setup when appVersion is missing', () => {
		expect(() =>
			BugsnagBuildReporterPlugin({ apiKey: 'k', appVersion: '' }).setup({ onEnd: () => {} } as any),
		).toThrow(/appVersion/);
	});

	it('does not reject the build when the report request fails', async () => {
		fetchMock.mockResolvedValue({ ok: false, status: 500, statusText: 'Error', text: async () => 'boom' });
		const plugin = BugsnagBuildReporterPlugin({ apiKey: 'k', appVersion: '1' });

		await expect(runPlugin(plugin, { result: {} })).resolves.toBeUndefined();
		expect(console.error).toHaveBeenCalled();
	});

	it('skips reporting when the build reported errors', async () => {
		const plugin = BugsnagBuildReporterPlugin({ apiKey: 'k', appVersion: '1' });

		await runPlugin(plugin, { result: { errors: [{ text: 'boom' } as any] } });

		expect(fetchMock).not.toHaveBeenCalled();
	});
});
