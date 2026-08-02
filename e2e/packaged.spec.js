const { test, expect } = require('@playwright/test');
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// A packaged app that carries a stale signature is reported by macOS as "damaged,
// move it to the Trash" with no way to open it anyway -- strictly worse than being
// unsigned. These tests assert the repair in scripts/after-pack.js held, and name
// the specific failure mode so a regression doesn't read as a generic verify error.

function findPackagedApps() {
  const distDir = path.join(__dirname, '..', 'dist');
  if (!fs.existsSync(distDir)) return [];
  return fs
    .readdirSync(distDir)
    .filter((entry) => entry.startsWith('mac'))
    .map((entry) => path.join(distDir, entry, 'SetDate.app'))
    .filter((appPath) => fs.existsSync(appPath));
}

function codesign(args) {
  const result = spawnSync('codesign', args, { encoding: 'utf8' });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

const packagedApps = findPackagedApps();

test.describe('packaged app signature', () => {
  test.skip(process.platform !== 'darwin', 'codesign is macOS-only');

  if (packagedApps.length === 0) {
    test.skip('no packaged app found -- run `npm run dist` first', () => {});
  }

  for (const appPath of packagedApps) {
    const arch = path.basename(path.dirname(appPath));

    test(`${arch}: signature matches the bundle on disk`, () => {
      const { status, output } = codesign(['--verify', '--deep', '--strict', appPath]);
      expect(output, 'stale signature left over from packaging').not.toContain('code has no resources');
      expect(status, output).toBe(0);
    });

    test(`${arch}: Info.plist and resources are sealed under the app identity`, () => {
      const { output } = codesign(['-dvvv', appPath]);

      // `Identifier=Electron` means the bundle still carries the signature Electron's
      // linker emitted, rather than one describing this app.
      expect(output).toContain('Identifier=com.setdate.app');

      expect(output).not.toContain('Info.plist=not bound');
      expect(output).toMatch(/Info\.plist entries=\d+/);

      expect(output).not.toContain('Sealed Resources=none');
      expect(output).toMatch(/Sealed Resources version=\d+/);
    });
  }
});
