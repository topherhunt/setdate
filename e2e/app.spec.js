const { test, expect, _electron } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { createTestJpeg } = require('./helpers');

const appPath = path.join(__dirname, '..');

let electronApp;
let page;

test.beforeAll(async () => {
  electronApp = await _electron.launch({
    args: [appPath],
    env: { ...process.env, SETDATE_HEADLESS: '1' },
  });
  page = await electronApp.firstWindow();
  await page.waitForLoadState('domcontentloaded');
});

test.afterAll(async () => {
  await electronApp.close();
});

test('app launches with drop zone visible', async () => {
  const dropZone = page.locator('#drop-zone');
  await expect(dropZone).toBeVisible();

  const prompt = page.locator('#drop-prompt');
  await expect(prompt).toBeVisible();
  await expect(prompt).toContainText('Drop images or folders here');
});

test('controls are hidden before files are loaded', async () => {
  const controls = page.locator('#controls');
  await expect(controls).toBeHidden();
});

test('scan files via IPC shows summary', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'setdate-test-'));
  const testImage = createTestJpeg(tmpDir, 'test.jpg');

  await page.evaluate(async (p) => {
    const res = await window.api.scanFiles([p]);
    document.getElementById('file-count').textContent = res.count + ' image' + (res.count === 1 ? '' : 's') + ' selected';
    document.getElementById('date-range').textContent = 'Current date: ' + new Date(res.minDate).toLocaleDateString();
    document.getElementById('drop-prompt').classList.add('hidden');
    document.getElementById('drop-summary').classList.remove('hidden');
    document.getElementById('drop-zone').classList.add('has-files');
    document.getElementById('controls').classList.remove('hidden');
  }, testImage);

  const fileCount = page.locator('#file-count');
  await expect(fileCount).toContainText('1 image selected');

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('mode toggle switches panels', async () => {
  await page.evaluate(() => {
    document.getElementById('controls').classList.remove('hidden');
  });

  const absolutePanel = page.locator('#absolute-panel');
  const offsetPanel = page.locator('#offset-panel');

  await expect(absolutePanel).toBeVisible();
  await expect(offsetPanel).toBeHidden();

  await page.locator('input[value="offset"]').check();
  await expect(absolutePanel).toBeHidden();
  await expect(offsetPanel).toBeVisible();

  await page.locator('input[value="absolute"]').check();
  await expect(absolutePanel).toBeVisible();
  await expect(offsetPanel).toBeHidden();
});
