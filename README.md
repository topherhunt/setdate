# SetDate

A simple macOS app for batch-updating creation dates on images. Drag in files or a folder, pick a new date (or shift by an offset), and hit Apply.

Sets all three EXIF date fields (DateTimeOriginal, CreateDate, ModifyDate) plus the macOS filesystem creation date, so Finder, Photos, and every other app agree.

Supports JPG, PNG, TIFF, HEIC, WebP, and common RAW formats.

![SetDate preview](docs/preview.png)

## Install

Download the latest `.dmg` from [Releases](https://github.com/topherhunt/setdate/releases). On first launch, macOS will block it since it's unsigned -- right-click > Open to bypass, or run:

```
xattr -cr /Applications/SetDate.app
```

## Development

```
npm install
npm start
```

## Tests

```
npm test
```

## Build

```
npm run dist
```

Produces `dist/SetDate-<version>-arm64.dmg`.

## Make your own

You don't need to trust my code. This app was built entirely with [Claude Code](https://claude.ai/code), and you can do the same -- fork this repo and modify it, or start from scratch with your own version.

The easiest way: point Claude Code at this project's [CLAUDE.md](https://github.com/topherhunt/setdate/blob/main/CLAUDE.md), which describes the architecture, features, and code style. Then tell it what you want to change. For example:

```
Read https://github.com/topherhunt/setdate/blob/main/CLAUDE.md for context,
then build me a version that also supports [your feature here].
```

Or just use it as inspiration and build something completely different. The point is: simple apps like this are easy to create, verify, and customize with AI assistance.

## License

MIT -- free to use, modify, and redistribute, including in commercial projects. No permission needed, no strings attached. See [LICENSE](LICENSE) for the full text.
