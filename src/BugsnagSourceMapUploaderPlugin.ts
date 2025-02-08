import { node as bugsnagNodeUploader } from '@bugsnag/source-maps';
import type { Plugin } from 'esbuild';
import fs from 'fs';
import path from 'path';

export function BugsnagSourceMapUploaderPlugin(options: {
	apiKey: string;
	appVersion: string;
	publicPath?: string; // Optional publicPath
	overwrite?: boolean;
}): Plugin {
	return {
		name: 'bugsnag-sourcemap-uploader',
		setup(build) {
			build.onEnd(async (result) => {
				console.log('Build result', result);
				if (result.errors.length > 0) {
					console.error('[BugsnagSourceMapUploaderPlugin] Build failed. Skipping source map upload.');
					return;
				}

				console.log('[BugsnagSourceMapUploaderPlugin] Build finished. Uploading source maps to Bugsnag...');

				// Validate required options and throw an error if missing.
				if (!options.apiKey || typeof options.apiKey !== 'string') {
					throw new Error('[BugsnagSourceMapUploaderPlugin] Error: Missing required configuration. "apiKey" is required.');
				}
				if (!options.appVersion) {
					throw new Error('[BugsnagSourceMapUploaderPlugin] Error: Missing required configuration. "appVersion" is required.');
				}

				// Get the output files from the build result
				const outputFiles = result.metafile?.outputs;
				console.log('result.metafile', result.metafile);
				console.log('outputFiles', outputFiles);
				if (!outputFiles) {
					console.warn('[BugsnagSourceMapUploaderPlugin] No output files found. Skipping source map upload.');
					return;
				}

				// Warn if publicPath is not provided
				if (!options.publicPath) {
					console.warn(
						'[BugsnagSourceMapUploaderPlugin] `publicPath` is not set.\n\n' +
							'  Source maps must be uploaded with the pattern that matches the file path in stacktraces.\n\n' +
							'  To make this message go away, set "publicPath" in the plugin options.\n\n' +
							'  In some cases, such as in a Node environment, it is safe to ignore this message.\n',
					);
				}

				// Iterate over the output files and upload source maps
				for (const [bundlePath] of Object.entries(outputFiles)) {
					// Skip non-JavaScript files (e.g., CSS)
					if (!bundlePath.endsWith('.js')) {
						continue;
					}

					const sourceMapPath = `${bundlePath}.map`;

                    console.log(`[BugsnagSourceMapUploaderPlugin] Checking for source map at ${sourceMapPath}...`);

					if (fs.existsSync(sourceMapPath)) {

							// Construct the URL using publicPath or fall back to bundlePath
							const bundleUrl = options.publicPath
								? `${options.publicPath.replace(/\/$/, '')}/${path.basename(bundlePath)}`
								: bundlePath;
                            console.log(`[BugsnagSourceMapUploaderPlugin] Uploading source map for ${bundlePath} to Bugsnag...`);
							try {

							await bugsnagNodeUploader.uploadOne({
								apiKey: options.apiKey,
								bundle: bundleUrl, // Use the constructed URL as the bundle
								sourceMap: sourceMapPath,
								appVersion: options.appVersion,
								overwrite: options.overwrite || true,
							});
						} catch (error) {
							console.log(`[BugsnagSourceMapUploaderPlugin] Uploaded source map for ${bundlePath} to Bugsnag.`);
						}

					} else {
						console.warn(`[BugsnagSourceMapUploaderPlugin] Source map not found for ${bundlePath}. Skipping upload.`);
					}
				}
			});
		},
	};
}
