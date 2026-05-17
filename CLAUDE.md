# SetDate

## Purpose

A simple, single-purpose macOS GUI app for batch-updating creation dates on images. No terminal required -- drag files in, pick a date, hit Apply.

There's no good free open-source tool for this. Existing options are paid, overly complex, or CLI-only.

## What it does

- Drag images or a folder onto the window
- Shows file count and current date range (min to max of existing creation dates)
- Two modes: set an absolute date, or shift by an offset (e.g. +2 hours, -3 days)
- Writes four dates per file: DateTimeOriginal, CreateDate, ModifyDate (EXIF), and FileCreateDate (macOS filesystem)
- Supports JPG, PNG, TIFF, HEIC, WebP, and common RAW formats

## Architecture

**Stack**: Electron, exiftool-vendored (bundled), electron-builder (unsigned .dmg), Playwright E2E tests. No frameworks -- plain HTML/CSS/JS for the renderer.

**File structure**:
- `main.js` -- Electron main process, IPC handlers
- `preload.js` -- contextBridge exposing IPC methods to renderer
- `lib/exif.js` -- exiftool-vendored wrapper (file resolution, date read/write)
- `renderer/` -- index.html, style.css, app.js (all vanilla, no build step)
- `e2e/` -- Playwright tests

**IPC surface** (all `ipcMain.handle` / `ipcRenderer.invoke`):
- `pick-files` -- opens native file/folder picker, returns paths
- `scan-files` -- resolves folders, reads dates, returns `{ paths, count, minDate, maxDate }`
- `apply-absolute` / `apply-offset` -- writes dates, returns `{ success, errors }`

**Security**: `contextIsolation: true`, `nodeIntegration: false`. Renderer only touches the filesystem through preload methods.

**Packaging**: `electron-builder --mac dmg`, `asarUnpack` for exiftool binary, `identity: null` (unsigned).

**Testing**: Headless via `SETDATE_HEADLESS=1`. Test JPEGs created at runtime via Python PIL. Tests verify actual EXIF round-trips. `npm test` runs everything.

## Code style

**Simplicity first.** This is a small app. Keep it small. No abstractions for single-use code, no speculative features, no frameworks.

**CSS: prefer utility classes over single-use styles.** Compose from existing utilities before adding new CSS. Only add a new class when it's genuinely reusable or has multi-property + state behavior that can't be composed. Think Bootstrap-style utility-first.

**Dark mode support.** Use CSS custom properties (defined in `:root` and overridden in `@media (prefers-color-scheme: dark)`). Never hardcode colors -- always use `var(--name)`.

**Vanilla JS.** No transpilation, no bundler. Plain `<script>` tags. The app is small enough that this is a feature, not a limitation.

**No comments unless the "why" is non-obvious.** Well-named functions and variables should make the code self-documenting.

**Fail explicitly.** Prefer clear errors over silent degradation. Don't swallow exceptions.

**Match existing patterns.** Before adding something new, look at how the codebase already does it.

## Out of scope

Batch rename, GPS editing, format conversion, code signing, auto-update. Keep the app single-purpose.
