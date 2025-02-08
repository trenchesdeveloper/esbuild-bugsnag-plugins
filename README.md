# esbuild-bugsnag-plugins

To install dependencies:

```bash
bun install
```

## Usage

### `BugsnagSourceMapUploaderPlugin`

Automatically detects source maps from the esbuild output and uploads them to Bugsnag.

```javascript
import { BugsnagSourceMapUploaderPlugin } from 'esbuild-bugsnag-plugins';
```


```javascript
esbuild.build({
	entryPoints: ['src/index.ts'],
	outdir: 'dist',
	bundle: true,
	sourcemap: true, // Ensure source maps are generated
	metafile: true, // Required for source map detection
	plugins: [
		BugsnagSourceMapUploaderPlugin({
			apiKey: 'YOUR_BUGSNAG_API_KEY',
			appVersion: '1.0.0',
			publicPath: 'https://example.com/static', // Optional publicPath
			overwrite: true,
		}),
	],
});
```

### `BugsnagBuildReporterPlugin`

Reports build status to Bugsnag.

```javascript
import { BugsnagBuildReporterPlugin } from 'esbuild-bugsnag-plugins';
```

```javascript
esbuild.build({
	// Your esbuild configuration
	plugins: [
		BugsnagBuildReporterPlugin({
			apiKey: 'YOUR_BUGSNAG_API_KEY',
			appVersion: '1.0.0',
			repository: 'https://github.com/your/repo',
		}),
	],
});
```