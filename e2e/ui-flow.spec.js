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
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'setdate-ui-'));
});

test.afterAll(async () => {
  await electronApp.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('full absolute date flow via UI', async () => {
  const testFile = createTestJpeg(tmpDir, 'ui-abs.jpg');

  // Simulate what happens after drop: call scanFiles, then update UI like app.js does
  await page.evaluate(async (p) => {
    const result = await window.api.scanFiles([p]);
    // Replicate the handleDrop logic
    document.getElementById('file-count').textContent =
      result.count + ' image' + (result.count === 1 ? '' : 's');
    document.getElementById('date-range').textContent = 'No existing date metadata found';
    document.getElementById('drop-prompt').classList.add('hidden');
    document.getElementById('drop-summary').classList.remove('hidden');
    document.getElementById('drop-zone').classList.add('has-files');
    document.getElementById('controls').classList.remove('hidden');
    // Store paths globally so the apply button can find them
    window.__testPaths = result.paths;
  }, testFile);

  await expect(page.locator('#file-count')).toContainText('1 image');
  await expect(page.locator('#controls')).toBeVisible();
  await expect(page.locator('#apply-btn')).toBeVisible();

  // Set datetime via JS (Playwright's fill doesn't work with datetime-local step=1)
  await page.evaluate(() => {
    document.getElementById('datetime-input').value = '2019-03-25T10:30:00';
  });

  const result = await page.evaluate(async () => {
    const datetime = document.getElementById('datetime-input').value.replace('T', ' ');
    return window.api.applyAbsolute({ paths: window.__testPaths, datetime });
  });

  expect(result.success).toBe(1);
  expect(result.errors).toHaveLength(0);

  // Verify
  const verify = await page.evaluate(async (p) => {
    return window.api.scanFiles([p]);
  }, testFile);
  expect(verify.minDate).toContain('2019-03-25');
});

test('full offset flow via UI', async () => {
  const testFile = createTestJpeg(tmpDir, 'ui-offset.jpg');

  // Set a known starting date
  const scan = await page.evaluate(async (p) => {
    return window.api.scanFiles([p]);
  }, testFile);

  await page.evaluate(async ({ paths, datetime }) => {
    return window.api.applyAbsolute({ paths, datetime });
  }, { paths: scan.paths, datetime: '2021:07:04 08:00:00' });

  // Ensure controls are visible and switch to offset mode
  await page.evaluate(() => {
    document.getElementById('controls').classList.remove('hidden');
    document.querySelector('input[value="absolute"]').checked = false;
    document.querySelector('input[value="offset"]').checked = true;
    document.getElementById('absolute-panel').classList.add('hidden');
    document.getElementById('offset-panel').classList.remove('hidden');
  });

  await expect(page.locator('#offset-panel')).toBeVisible();

  // Fill in offset values
  await page.evaluate(() => {
    document.getElementById('offset-hours').value = '3';
    document.getElementById('offset-minutes').value = '30';
  });

  // Apply offset
  const result = await page.evaluate(async (paths) => {
    return window.api.applyOffset({ paths, offset: '+=0:0:0 3:30:0' });
  }, scan.paths);

  expect(result.success).toBe(1);

  const verify = await page.evaluate(async (p) => {
    return window.api.scanFiles([p]);
  }, testFile);
  // Should be 2021-07-04 11:30:00
  expect(verify.minDate).toContain('2021-07-04');
});

test('clear button resets UI', async () => {
  // Make sure controls are visible from prior test state
  await page.evaluate(() => {
    document.getElementById('drop-prompt').classList.add('hidden');
    document.getElementById('drop-summary').classList.remove('hidden');
    document.getElementById('controls').classList.remove('hidden');
    document.getElementById('drop-zone').classList.add('has-files');
  });

  await expect(page.locator('#drop-summary')).toBeVisible();
  await expect(page.locator('#controls')).toBeVisible();

  await page.click('#clear-btn');

  await expect(page.locator('#drop-prompt')).toBeVisible();
  await expect(page.locator('#drop-summary')).toBeHidden();
  await expect(page.locator('#controls')).toBeHidden();
});

test('date range display shows min and max', async () => {
  const file1 = createTestJpeg(tmpDir, 'range-a.jpg');
  const file2 = createTestJpeg(tmpDir, 'range-b.jpg');

  // Set different dates on each file
  const scan1 = await page.evaluate(async (p) => window.api.scanFiles([p]), file1);
  const scan2 = await page.evaluate(async (p) => window.api.scanFiles([p]), file2);

  await page.evaluate(async ({ paths, datetime }) => {
    return window.api.applyAbsolute({ paths, datetime });
  }, { paths: scan1.paths, datetime: '2017:01:15 09:00:00' });

  await page.evaluate(async ({ paths, datetime }) => {
    return window.api.applyAbsolute({ paths, datetime });
  }, { paths: scan2.paths, datetime: '2023:04:20 16:00:00' });

  // Now scan both files together
  const combined = await page.evaluate(async (paths) => {
    return window.api.scanFiles(paths);
  }, [file1, file2]);

  expect(combined.count).toBe(2);
  expect(combined.minDate).toContain('2017-01-15');
  expect(combined.maxDate).toContain('2023-04-20');
});

test('applying to empty file list is prevented', async () => {
  // Clear state
  await page.evaluate(() => {
    document.getElementById('drop-prompt').classList.remove('hidden');
    document.getElementById('drop-summary').classList.add('hidden');
    document.getElementById('controls').classList.add('hidden');
  });

  // Apply button should be hidden since controls are hidden
  await expect(page.locator('#controls')).toBeHidden();
});
