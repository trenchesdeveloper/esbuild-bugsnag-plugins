import type { Plugin } from 'esbuild';

export interface BugsnagBuildReporterOptions {
	/** Your Bugsnag project API key. */
	apiKey: string;
	/** The app version being released. */
	appVersion: string;
	/** Source control repository URL (enables the source control section). */
	repository?: string;
	/** Source control provider. Defaults to "github". */
	provider?: string;
	/** Source control revision (commit SHA). Defaults to `appVersion`. */
	revision?: string;
	/** The release stage being built, e.g. "production". */
	releaseStage?: string;
	/** Override the build endpoint (for on-premise Bugsnag). */
	endpoint?: string;
	/** Suppress informational logs (warnings and errors are still emitted). */
	silent?: boolean;
}

const PREFIX = '[BugsnagBuildReporterPlugin]';
const DEFAULT_ENDPOINT = 'https://build.bugsnag.com/';

interface BuildPayload {
	apiKey: string;
	appVersion: string;
	releaseStage?: string;
	sourceControl?: {
		provider: string;
		repository: string;
		revision: string;
	};
}

export function BugsnagBuildReporterPlugin(options: BugsnagBuildReporterOptions): Plugin {
	return {
		name: 'bugsnag-build-reporter',
		setup(build) {
			// Fail fast: validate configuration before the build runs.
			if (!options.apiKey) {
				throw new Error(`${PREFIX} Missing required configuration: "apiKey" is required.`);
			}
			if (!options.appVersion) {
				throw new Error(`${PREFIX} Missing required configuration: "appVersion" is required.`);
			}

			build.onEnd(async (result) => {
				if (result.errors.length > 0) {
					console.error(`${PREFIX} Build failed. Skipping build report.`);
					return;
				}

				const payload: BuildPayload = {
					apiKey: options.apiKey,
					appVersion: options.appVersion,
					releaseStage: options.releaseStage,
					sourceControl: options.repository
						? {
								provider: options.provider ?? 'github',
								repository: options.repository,
								revision: options.revision ?? options.appVersion,
							}
						: undefined,
				};

				try {
					const response = await fetch(options.endpoint ?? DEFAULT_ENDPOINT, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(payload),
					});

					if (!response.ok) {
						const body = await response.text().catch(() => '');
						throw new Error(`HTTP ${response.status} ${response.statusText} ${body}`.trim());
					}

					if (!options.silent) {
						console.log(`${PREFIX} Build reported successfully.`);
					}
				} catch (error) {
					console.error(`${PREFIX} Failed to report build:`, error);
				}
			});
		},
	};
}
