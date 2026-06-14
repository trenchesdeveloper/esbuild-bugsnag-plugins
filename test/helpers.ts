import type { Plugin, PluginBuild } from 'esbuild';

type OnEndCallback = Parameters<PluginBuild['onEnd']>[0];
type OnEndResult = Parameters<OnEndCallback>[0];

/**
 * Drives an esbuild plugin without a real esbuild run: calls `setup`, captures
 * the registered `onEnd` callback, and invokes it with the given result.
 */
export async function runPlugin(
	plugin: Plugin,
	opts: { result: Partial<OnEndResult>; initialOptions?: Record<string, unknown> },
): Promise<void> {
	let onEnd: OnEndCallback | undefined;

	const build = {
		initialOptions: opts.initialOptions ?? {},
		onEnd: (cb: OnEndCallback) => {
			onEnd = cb;
		},
		onStart: () => {},
		onResolve: () => {},
		onLoad: () => {},
		onDispose: () => {},
		esbuild: {},
		resolve: async () => ({}),
	};

	plugin.setup(build as any);

	if (!onEnd) {
		throw new Error('plugin did not register an onEnd callback');
	}

	await onEnd({ errors: [], warnings: [], ...opts.result } as OnEndResult);
}
