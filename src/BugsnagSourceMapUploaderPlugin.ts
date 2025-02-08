import { node as bugsnagNodeUploader } from '@bugsnag/source-maps';
import type { Plugin } from 'esbuild';
import fs from 'fs';

export function BugsnagSourceMapUploaderPlugin(options: {
	apiKey: string;
	appVersion: string;
	bundle: string; // publicPath
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

				// Warn if bundle is not provided
				if (options.bundle === '') {
					console.warn(
						'[BugsnagSourceMapUploaderPlugin] `bundle` is not set.\n\n' +
							'  Source maps must be uploaded with the pattern that matches the file path in stacktraces.\n\n' +
							'  To make this message go away, set "bundle" in the plugin options.\n\n' +
							'  In some cases, such as in a Node environment, it is safe to ignore this message.\n',
					);
				}

				// Check if metafile is available (only needed if bundle is empty)
				if (options.bundle === '' && !result.metafile) {
					throw new Error(
						'[BugsnagSourceMapUploaderPlugin] Error: `metafile` is not enabled in the esbuild configuration.\n\n' +
						'  Please add `metafile: true` to your esbuild build options to enable source map uploads when `bundle` is not provided.\n',
					);
				}

				// Iterate over the output files to find JavaScript bundles and their source maps
				for (const [bundlePath, output] of Object.entries(result.metafile?.outputs || {})) {
					// Skip non-JavaScript files (e.g., CSS)
					if (!bundlePath.endsWith('.js')) {
						continue;
					}

					const sourceMapPath = `${bundlePath}.map`;

					console.log(`[BugsnagSourceMapUploaderPlugin] Checking for source map at ${sourceMapPath}...`);
					console.log(`[BugsnagSourceMapUploaderPlugin] Checking for bundle at ${bundlePath}...`);

					const updatedBundlePath = bundlePath.replace(/\/$/, '');

					if (fs.existsSync(sourceMapPath)) {
						// Use the provided bundle if it's not empty
						const bundleUrl = options.bundle !== ''
							? options.bundle
							: updatedBundlePath; // Fall back to the bundlePath if bundle is empty

						console.log(`[BugsnagSourceMapUploaderPlugin] Uploading source map for ${bundlePath} to Bugsnag...`);

						try {
							await bugsnagNodeUploader.uploadOne({
								apiKey: options.apiKey,
								bundle: bundleUrl, // Use the constructed URL as the bundle
								sourceMap: sourceMapPath,
								appVersion: options.appVersion,
								overwrite: options.overwrite || true, // Default to false if not provided
							});
							console.log(`[BugsnagSourceMapUploaderPlugin] Uploaded source map for ${bundlePath} to Bugsnag.`);
						} catch (error) {
							console.error(`[BugsnagSourceMapUploaderPlugin] Failed to upload source map for ${bundlePath}:`, error);
						}
					} else {
						console.warn(`[BugsnagSourceMapUploaderPlugin] Source map not found for ${bundlePath}. Skipping upload.`);
					}
				}
			});
		},
	};
}
