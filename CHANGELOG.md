# esbuild-bugsnag-plugins

## 1.3.0

Supersedes a stray legacy `1.2.2` (published 2025-02-08 with the old, untyped
build) so that semver ranges such as `^1.x` resolve to the maintained build
instead of the broken older version. This is a version-only release — the code
is identical to `1.1.0`.

## 1.1.0

### Minor Changes

- Harden packaging, correctness, and TypeScript source map support.

  - **Types & packaging:** build with tsup to ship `dist/index.d.ts` plus dual
    CJS/ESM output; fix the `types` and `exports` fields (the previous `./src`
    export and `types` path pointed at files that were never published).
  - **Slimmer install:** move `esbuild` to `peerDependencies` and stop bundling
    it; remove the unused `ts-lib`, `axios`, `form-data`, and `tslib`
    dependencies. The build reporter now uses native `fetch`.
  - **No more silent no-ops:** outputs are located via the esbuild metafile or the
    configured `outfile`; if neither is available the build fails with a clear
    error instead of uploading nothing.
  - **Fail fast:** `apiKey`/`appVersion` are validated in `setup()`.
  - **TypeScript in stack traces:** uploaded source maps are checked for embedded
    original sources (`sourcesContent`). A missing map warns by default, or fails
    the build when `requireSourcesContent: true`.
  - **New options:** `silent`, `endpoint` (uploader and reporter), and
    `provider` / `revision` / `releaseStage` (reporter).
