import { node as bugsnagNodeUploader } from '@bugsnag/source-maps';
import type { Plugin } from 'esbuild';
import fs from 'fs';

export interface BugsnagSourceMapUploaderOptions {
	/** Your Bugsnag project API key. */
	apiKey: string;
	/** The app version the uploaded source maps belong to. */
	appVersion: string;
	/**
	 * The public path / URL that matches the bundle path in stack traces.
	 *
	 * For Node apps this is typically the deployed file path. Leave it unset
	 * (or empty) to derive it from each esbuild output path.
	 */
	bundle?: string;
	/** Overwrite source maps that were already uploaded for this app version. */
	overwrite?: boolean;
	/** Override the upload endpoint (for on-premise Bugsnag). */
	endpoint?: string;
	/**
	 * Require uploaded source maps to embed the original TypeScript/JS sources
	 * (`sourcesContent`). When `true`, the build fails if a map is missing
	 * embedded sources. When `false` (default) a warning is logged instead, so
	 * Bugsnag stack traces would show bundled JS rather than original `.ts`.
	 */
	requireSourcesContent?: boolean;
	/** Suppress informational logs (warnings and errors are still emitted). */
	silent?: boolean;
}

const PREFIX = '[BugsnagSourceMapUploaderPlugin]';

interface ParsedSourceMap {
	sources?: string[];
	sourcesContent?: Array<string | null>;
}

/**
 * Returns true when the source map embeds at least one non-empty original
 * source, i.e. Bugsnag can resolve stack traces back to the original source
 * (e.g. TypeScript) rather than the bundled JavaScript.
 */
function hasEmbeddedSources(map: ParsedSourceMap): boolean {
	return (
		Array.isArray(map.sourcesContent) &&
		map.sourcesContent.some((content) => typeof content === 'string' && content.length > 0)
	);
}

function referencesTypeScript(map: ParsedSourceMap): boolean {
	return Array.isArray(map.sources) && map.sources.some((s) => /\.tsx?$/.test(s));
}

/**
 * Collects the emitted `.js` output paths for the finished build.
 *
 * Prefers the metafile (when `metafile: true`) and falls back to the configured
 * `outfile`. Without either, source maps cannot be located, so we fail loudly
 * instead of silently uploading nothing.
 */
function collectJsOutputs(
	result: { metafile?: { outputs: Record<string, unknown> } },
	initialOptions: { outfile?: string; outdir?: string },
): string[] {
	if (result.metafile) {
		return Object.keys(result.metafile.outputs).filter((p) => p.endsWith('.js'));
	}

	if (initialOptions.outfile && initialOptions.outfile.endsWith('.js')) {
		return [initialOptions.outfile];
	}

	throw new Error(
		`${PREFIX} Unable to locate build outputs. Enable \`metafile: true\` in your esbuild ` +
			'options (recommended), or set a `.js` `outfile`, so source maps can be found.',
	);
}

export function BugsnagSourceMapUploaderPlugin(options: BugsnagSourceMapUploaderOptions): Plugin {
	return {
		name: 'bugsnag-sourcemap-uploader',
		setup(build) {
			// Fail fast: validate configuration before the build runs.
			if (!options.apiKey || typeof options.apiKey !== 'string') {
				throw new Error(`${PREFIX} Missing required configuration: "apiKey" is required.`);
			}
			if (!options.appVersion) {
				throw new Error(`${PREFIX} Missing required configuration: "appVersion" is required.`);
			}

			const log = (message: string) => {
				if (!options.silent) {
					console.log(`${PREFIX} ${message}`);
				}
			};

			build.onEnd(async (result) => {
				if (result.errors.length > 0) {
					console.error(`${PREFIX} Build failed. Skipping source map upload.`);
					return;
				}

				if (!options.bundle) {
					console.warn(
						`${PREFIX} \`bundle\` is not set. Source maps are uploaded with the output path ` +
							'as the bundle URL, which must match the file path in stack traces. In a Node ' +
							'environment this is usually fine; set "bundle" to silence this warning.',
					);
				}

				const jsOutputs = collectJsOutputs(result, build.initialOptions);

				if (options.bundle && jsOutputs.length > 1) {
					console.warn(
						`${PREFIX} A single "bundle" URL was provided but the build produced ` +
							`${jsOutputs.length} JS outputs; the same bundle URL will be used for each.`,
					);
				}

				for (const bundlePath of jsOutputs) {
					const sourceMapPath = `${bundlePath}.map`;

					if (!fs.existsSync(sourceMapPath)) {
						console.warn(`${PREFIX} Source map not found for ${bundlePath}. Skipping upload.`);
						continue;
					}

					// Verify the map carries original sources so Bugsnag can show
					// TypeScript (not bundled JS) in stack traces.
					let map: ParsedSourceMap | null = null;
					try {
						map = JSON.parse(fs.readFileSync(sourceMapPath, 'utf8')) as ParsedSourceMap;
					} catch (error) {
						console.warn(`${PREFIX} Could not parse source map ${sourceMapPath}:`, error);
					}

					if (map && !hasEmbeddedSources(map)) {
						const message =
							`${PREFIX} ${sourceMapPath} does not embed original sources (\`sourcesContent\`). ` +
							'Bugsnag stack traces will show bundled JavaScript rather than the original ' +
							'TypeScript. Enable `sourcesContent: true` in your esbuild options.';
						if (options.requireSourcesContent) {
							throw new Error(message);
						}
						console.warn(message);
					} else if (map && !referencesTypeScript(map) && !options.silent) {
						log(`Note: ${sourceMapPath} does not reference any TypeScript sources.`);
					}

					const bundleUrl = options.bundle || bundlePath.replace(/\/$/, '');

					log(`Uploading source map for ${bundlePath} (bundle: ${bundleUrl})...`);

					try {
						await bugsnagNodeUploader.uploadOne({
							apiKey: options.apiKey,
							bundle: bundleUrl,
							sourceMap: sourceMapPath,
							appVersion: options.appVersion,
							overwrite: options.overwrite ?? false,
							...(options.endpoint ? { endpoint: options.endpoint } : {}),
						});
						log(`Uploaded source map for ${bundlePath}.`);
					} catch (error) {
						console.error(`${PREFIX} Failed to upload source map for ${bundlePath}:`, error);
					}
				}
			});
		},
	};
}
