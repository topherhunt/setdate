const { execFileSync } = require('child_process');
const path = require('path');

// electron-builder with `identity: null` never signs the bundle, so the app ships
// carrying the ad-hoc signature Electron's linker baked into the prebuilt binaries.
// Packaging then renames the helpers (Electron Helper.app -> SetDate Helper.app) and
// rewrites Info.plist, leaving that inherited signature describing a bundle that no
// longer exists. macOS reads the mismatch as tampering and reports the app as
// "damaged, move it to the Trash" -- with no Open Anyway button, unlike a merely
// unsigned app. Re-sign the finished bundle ad-hoc, then verify: an unverified
// signature is invisible until it reaches someone else's Downloads folder.
exports.default = async function afterPack({ appOutDir, electronPlatformName, packager }) {
  if (electronPlatformName !== 'darwin') return;

  const appPath = path.join(appOutDir, `${packager.appInfo.productFilename}.app`);
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], { stdio: 'inherit' });
  execFileSync('codesign', ['--verify', '--deep', '--strict', appPath], { stdio: 'inherit' });
};
