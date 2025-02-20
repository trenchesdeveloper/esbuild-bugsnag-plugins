import axios, { AxiosError } from 'axios';

export function BugsnagBuildReporterPlugin(options: {
	apiKey: string;
	appVersion: string;
	repository?: string;
}) {
	return {
		name: 'bugsnag-build-reporter',
		setup(build: { onEnd: (callback: () => Promise<void>) => void }) {
			build.onEnd(async () => {
				console.log('[BugsnagBuildReporterPlugin] Build finished. Reporting to Bugsnag...');

				// Validate required options and throw an error if missing.
				if (!options.apiKey) {
					throw new Error('[BugsnagBuildReporterPlugin] Error: Missing required configuration. "apiKey" is required.');
				}
				if (!options.appVersion) {
					throw new Error('[BugsnagBuildReporterPlugin] Error: Missing required configuration. "appVersion" is required.');
				}

				interface Payload {
					apiKey: string;
					appVersion: string;
					sourceControl?: {
						provider: string;
						repository: string;
						revision: string;
					};
				}

				const payload: Payload = {
					apiKey: options.apiKey,
					appVersion: options.appVersion,
					sourceControl: options.repository
						? {
								provider: 'github',
								repository: options.repository,
								revision: options.appVersion,
						  }
						: undefined,
				};
				try {
					const response = await axios.post('https://build.bugsnag.com/', payload);
					console.log('[BugsnagBuildReporterPlugin] Build reported successfully:', response.data);
				} catch (error: unknown) {
					const axiosError = error as AxiosError;
					console.error('[BugsnagBuildReporterPlugin] Failed to report build:', axiosError.response?.data);
				}
			});
		},
	};
}
