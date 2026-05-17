# SetDate -- Plan

## Problem

There's no good, simple, free, open-source macOS app for batch-updating creation datetimes on images. Existing tools are either paid, overly complex, or CLI-only. You shouldn't need a terminal to change the dates on a folder of photos.

## What it does

SetDate is a single-purpose macOS GUI app. You drag images (or a folder of images) onto the window, pick a new date or an offset, and hit Apply. It updates all the date metadata at once -- both EXIF tags and the filesystem creation date -- so Finder, Photos, and every other app agree on when the image was created.

## Features

### Core (v1)

- **Drag and drop**: Drop individual image files or entire folders onto the window
- **File summary**: After drop, shows the number of image files detected and the current date range (min to max of existing creation dates) so you know what you're about to overwrite
- **Absolute mode**: Set all files to a specific date and time
- **Offset mode**: Shift all files by a delta (e.g. +2 hours, -3 days) -- direction (forward/backward), with fields for years, months, days, hours, minutes, seconds
- **Four dates written per file**:
  - `DateTimeOriginal` (EXIF)
  - `CreateDate` (EXIF)
  - `ModifyDate` (EXIF)
  - `FileCreateDate` (macOS filesystem creation/birth date)
- **Supported formats**: JPG, JPEG, PNG, TIFF, TIF, HEIC, HEIF, WEBP, and common RAW formats (ARW, CR2, CR3, NEF, DNG, ORF, RAF, RW2)
- **Clear button**: Reset the file list and start over
- **Status feedback**: Shows progress and success/error counts after apply

### Explicitly out of scope for v1

- Batch rename
- GPS/location editing
- Format conversion
- Undo (but the UI shows current dates before you overwrite, so you can note them)
- Auto-update
- Code signing (users bypass Gatekeeper via right-click > Open or `xattr -cr` on first launch)

## Architecture

### Stack

- **Electron** -- heavier than ideal, but has reliable tooling, testing support, and packaging. Tauri was considered but rejected due to poor testing story on macOS.
- **exiftool-vendored** (npm) -- bundles the exiftool binary per-platform, provides a Promise-based API. Handles both EXIF and filesystem dates on macOS.
- **electron-builder** -- packages as unsigned `.dmg` for GitHub releases.
- **Playwright** -- E2E tests via Playwright's built-in Electron support (`_electron.launch`).
- **No frameworks** -- plain HTML/CSS/JS for the renderer. The app is small enough that React/Vue/etc. would be overhead.

### File structure

```
setdate/
  package.json
  main.js              # Electron main process -- window creation, IPC handlers
  preload.js           # contextBridge -- exposes 3 IPC methods to renderer
  lib/
    exif.js            # exiftool-vendored wrapper -- file resolution, read, write
  renderer/
    index.html         # Single-page UI
    style.css          # macOS-native styling (system font, rounded corners, blue accent)
    app.js             # DOM logic -- drag/drop, mode toggle, apply button
  e2e/
    helpers.js         # Test utilities (create valid JPEG fixtures via PIL)
    app.spec.js        # UI tests -- launch, drop zone, mode toggle
    exif-write.spec.js # EXIF tests -- absolute write, offset write, folder resolution
    ui-flow.spec.js    # Full flow tests -- end-to-end absolute/offset, clear, date range
  playwright.config.js
```

### IPC surface

Three channels, all via `ipcMain.handle` / `ipcRenderer.invoke`:

| Channel | Input | Output |
|---|---|---|
| `scan-files` | `string[]` (raw dropped paths) | `{ paths, count, minDate, maxDate }` |
| `apply-absolute` | `{ paths, datetime }` | `{ success, errors }` |
| `apply-offset` | `{ paths, offset }` | `{ success, errors }` |

`scan-files` resolves folders recursively, filters by extension, and returns the resolved path list so the renderer can pass those exact paths back to `apply-*` without re-resolving.

### Security model

- `contextIsolation: true`, `nodeIntegration: false`
- Renderer only accesses Node/filesystem through the 3 preload methods
- No remote content, no external URLs

### Packaging

- `electron-builder --mac dmg` produces an unsigned `.dmg`
- `asarUnpack` for `exiftool-vendored.*` ensures the exiftool binary lives on the real filesystem (not inside the ASAR archive), which is required for it to spawn
- `identity: null` explicitly skips code signing
- Users install by dragging to Applications; first launch requires right-click > Open (Gatekeeper bypass)

### Testing

- All tests run headless (`SETDATE_HEADLESS=1` env var hides the BrowserWindow)
- Test JPEGs are created at runtime via Python PIL (1x1 pixel, valid enough for exiftool to write to)
- Tests verify actual EXIF data round-trips -- write a date, re-read, confirm it matches
- `npm test` runs all tests

## Design decisions

**Why exiftool (not a pure-JS EXIF library)?** exiftool handles every image format, every EXIF variant, filesystem dates on macOS, and the `AllDates` shortcut. A JS library would mean reimplementing format-specific writers and still needing a separate tool for `FileCreateDate`.

**Why bundle exiftool (not require `brew install`)?** Zero-friction UX. The app should work immediately after install. `exiftool-vendored` adds ~25MB but eliminates a prerequisite.

**Why no build step for the renderer?** The renderer is ~170 lines of JS, one HTML file, and one CSS file. A bundler would add complexity without benefit.

**Why Electron over Tauri?** Tauri produces smaller binaries, but as of mid-2025 its testing story on macOS is unreliable. Electron + Playwright is a well-trodden path with solid tooling.

## Future possibilities (not committed)

- Undo / backup originals
- Preview thumbnails in the file list
- Selective date fields (e.g. only update DateTimeOriginal, leave others)
- Negative offset shorthand (e.g. "match this file's date" for syncing cameras)
- Windows/Linux support (exiftool-vendored and electron-builder both support cross-platform, but FileCreateDate behavior differs)
