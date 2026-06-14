# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets)
and is used to track version bumps and generate the `CHANGELOG.md`.

## Releasing (tag-triggered)

1. Record your changes:

   ```bash
   bunx changeset
   ```

2. When ready to release, bump the version and update the changelog:

   ```bash
   bun run version-packages   # runs `changeset version`
   ```

3. Commit the result, then create and push a matching tag:

   ```bash
   git commit -am "release: vX.Y.Z"
   git tag vX.Y.Z             # must match package.json "version"
   git push && git push --tags
   ```

Pushing the `vX.Y.Z` tag triggers `.github/workflows/publish.yml`, which
typechecks, lints, tests, builds, verifies the tag matches `package.json`, and
publishes to npm with provenance. The tag and `package.json` version **must
match** or the workflow fails before publishing.
