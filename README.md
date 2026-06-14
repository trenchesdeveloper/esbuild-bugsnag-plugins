# esbuild-bugsnag-plugins

esbuild plugins for uploading [Bugsnag](https://www.bugsnag.com/) source maps and
reporting builds. Ships type declarations and both ESM and CommonJS builds.

## Install

```bash
npm install --save-dev esbuild-bugsnag-plugins
# or: bun add -d esbuild-bugsnag-plugins
```

`esbuild` is a **peer dependency** — the plugins run inside your existing esbuild
build, so install whatever esbuild version your project already uses (`>=0.19`).

## `BugsnagSourceMapUploaderPlugin`

Uploads the source maps esbuild emits to Bugsnag so stack traces resolve back to
your original source.

```ts
import * as esbuild from 'esbuild';
import { BugsnagSourceMapUploaderPlugin } from 'esbuild-bugsnag-plugins';

await esbuild.build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  sourcemap: true,       // required: emit source maps
  sourcesContent: true,  // required for TypeScript: embeds original .ts sources
  metafile: true,        // recommended: lets the plugin locate every output
  plugins: [
    BugsnagSourceMapUploaderPlugin({
      apiKey: 'YOUR_BUGSNAG_API_KEY',
      appVersion: '1.0.0',
      // bundle: the URL/path that matches the file in stack traces.
      // Omit it to derive from each esbuild output path (fine for most Node apps).
      bundle: 'dist/index.js',
      overwrite: true,
    }),
  ],
});
```

### Seeing TypeScript (not bundled JS) in Bugsnag

esbuild embeds your original `.ts` sources into the source map via
`sourcesContent` (on by default when `sourcemap` is enabled). The plugin verifies
this before uploading:

- If a map has no embedded sources it logs a **warning** (Bugsnag would otherwise
  show bundled JavaScript).
- Set `requireSourcesContent: true` to turn that warning into a hard build
  failure.

### Options

| Option | Type | Description |
| --- | --- | --- |
| `apiKey` | `string` | **Required.** Bugsnag project API key. |
| `appVersion` | `string` | **Required.** App version the maps belong to. |
| `bundle` | `string` | URL/path matching the file in stack traces. Omit to derive from output paths. |
| `overwrite` | `boolean` | Overwrite maps already uploaded for this version. Default `false`. |
| `requireSourcesContent` | `boolean` | Fail the build if a map lacks embedded sources. Default `false` (warns). |
| `endpoint` | `string` | Override the upload endpoint (on-premise Bugsnag). |
| `silent` | `boolean` | Suppress informational logs (warnings/errors still shown). |

If `metafile` is not enabled the plugin falls back to the configured `outfile`;
if it can locate neither it fails with a clear error instead of silently doing
nothing.

## `BugsnagBuildReporterPlugin`

Reports a build to Bugsnag when the esbuild build finishes.

```ts
import { BugsnagBuildReporterPlugin } from 'esbuild-bugsnag-plugins';

await esbuild.build({
  // ...your esbuild configuration
  plugins: [
    BugsnagBuildReporterPlugin({
      apiKey: 'YOUR_BUGSNAG_API_KEY',
      appVersion: '1.0.0',
      repository: 'https://github.com/your/repo',
      revision: process.env.GIT_SHA, // defaults to appVersion
      releaseStage: 'production',
    }),
  ],
});
```

### Options

| Option | Type | Description |
| --- | --- | --- |
| `apiKey` | `string` | **Required.** Bugsnag project API key. |
| `appVersion` | `string` | **Required.** App version being released. |
| `repository` | `string` | Source control URL (enables the source control section). |
| `provider` | `string` | Source control provider. Default `github`. |
| `revision` | `string` | Commit SHA. Defaults to `appVersion`. |
| `releaseStage` | `string` | Release stage, e.g. `production`. |
| `endpoint` | `string` | Override the build endpoint (on-premise Bugsnag). |
| `silent` | `boolean` | Suppress informational logs. |

## Development

```bash
bun install
bun run typecheck
bun run lint
bun run test
bun run build
```

Releases are managed with [Changesets](https://github.com/changesets/changesets):
run `bunx changeset` to record a change. Merging to `main` opens a release PR;
merging that PR publishes to npm with provenance.

## License

MIT
