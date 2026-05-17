const { test, expect, _electron } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { createTestJpeg } = require('./helpers');

const appPath = path.join(__dirname, '..');
let electronApp;
let page;
let tmpDir;

test.beforeAll(async () => {
  electronApp = await _electron.launch({
    args: [appPath],
    env: { ...process.env, SETDATE_HEADLESS: '1' },
  });
  page = await electronApp.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'setdate-exif-'));
});

test.afterAll(async () => {
  await electronApp.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('apply absolute date writes EXIF tags', async () => {
  const testFile = createTestJpeg(tmpDir, 'absolute-test.jpg');

  const scanResult = await page.evaluate(async (p) => {
    return window.api.scanFiles([p]);
  }, testFile);

  expect(scanResult.count).toBe(1);

  const datetime = '2020:06:15 14:30:00';
  const result = await page.evaluate(async ({ paths, datetime }) => {
    return window.api.applyAbsolute({ paths, datetime });
  }, { paths: scanResult.paths, datetime });

  expect(result.success).toBe(1);
  expect(result.errors).toHaveLength(0);

  const verifyResult = await page.evaluate(async (p) => {
    return window.api.scanFiles([p]);
  }, testFile);

  expect(verifyResult.minDate).toContain('2020-06-15');
});

test('apply offset shifts dates correctly', async () => {
  const testFile = createTestJpeg(tmpDir, 'offset-test.jpg');

  const scanResult = await page.evaluate(async (p) => {
    return window.api.scanFiles([p]);
  }, testFile);

  const datetime = '2020:01:01 12:00:00';
  await page.evaluate(async ({ paths, datetime }) => {
    return window.api.applyAbsolute({ paths, datetime });
  }, { paths: scanResult.paths, datetime });

  const offset = '+=0:0:1 0:0:0';
  const result = await page.evaluate(async ({ paths, offset }) => {
    return window.api.applyOffset({ paths, offset });
  }, { paths: scanResult.paths, offset });

  expect(result.success).toBe(1);
  expect(result.errors).toHaveLength(0);

  const verifyResult = await page.evaluate(async (p) => {
    return window.api.scanFiles([p]);
  }, testFile);

  expect(verifyResult.minDate).toContain('2020-01-02');
});

test('resolves folder to image files and skips non-images', async () => {
  createTestJpeg(tmpDir, 'folder-a.jpg');
  createTestJpeg(tmpDir, 'folder-b.jpg');
  fs.writeFileSync(path.join(tmpDir, 'readme.txt'), 'not an image');

  const result = await page.evaluate(async (dir) => {
    return window.api.scanFiles([dir]);
  }, tmpDir);

  expect(result.count).toBeGreaterThanOrEqual(2);
  expect(result.paths.every((p) => !p.endsWith('.txt'))).toBe(true);
});
