# Changelog

All notable changes to SetDate are documented here. Versions follow [semantic versioning](https://semver.org/).

## [1.1.0] -- 2026-08-02

### Fixed

- **macOS no longer reports the app as "damaged and should be moved to the Trash."** Builds up to and including 1.0.0 shipped carrying the ad-hoc signature Electron's linker baked into its prebuilt binaries, because electron-builder skips signing entirely when `identity` is `null`. Packaging then renamed the helper apps and rewrote `Info.plist`, leaving that inherited signature describing a bundle that no longer existed. macOS reads such a mismatch as tampering and refuses to open the app, offering no override -- strictly worse than an unsigned app, which at least gets an "Open Anyway" button. `scripts/after-pack.js` now re-signs the finished bundle ad-hoc and verifies the result, failing the build rather than shipping a broken signature.

  If you have an older build, download this release; you no longer need `xattr -cr` to launch it.

### Added

- Windows installer (`.exe`) published alongside the macOS `.dmg`. macOS remains the primary target.
- macOS builds for Intel as well as Apple Silicon.
- Tagged releases: pushing a `v*` tag builds both platforms and opens a draft GitHub Release. See [.github/workflows/release.yml](.github/workflows/release.yml).
- `e2e/packaged.spec.js` verifies the packaged bundle's signature, so this class of breakage fails the build instead of reaching someone's Downloads folder.

### Changed

- README now leads with install instructions, including the one-time right-click > Open step that unsigned-but-valid apps require.

## [1.0.0] -- 2026-05-17

Initial release.

- Drag images or a folder onto the window, or click to browse.
- Shows file count and the current creation-date range.
- Set an absolute date, or shift existing dates by an offset, with a live preview.
- Writes `DateTimeOriginal`, `CreateDate`, `ModifyDate`, and the filesystem `FileCreateDate`.
- Supports JPG, PNG, TIFF, HEIC, WebP, and common RAW formats.
- Dark mode support.

[1.1.0]: https://github.com/topherhunt/setdate/releases/tag/v1.1.0
[1.0.0]: https://github.com/topherhunt/setdate/commit/790e136
