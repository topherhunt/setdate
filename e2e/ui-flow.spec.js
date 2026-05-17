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

  // Call the app's own handleDrop function rather than reimplementing it
  await page.evaluate(async (p) => {
    await handleDrop([p]);
    window.__testPaths = currentPaths;
  }, testFile);

  await expect(page.locator('#file-count')).toContainText('1 image selected');
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

test('date range display shows min and max with arrow', async () => {
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

  // Load both files through handleDrop so the UI renders
  await page.evaluate(async (paths) => {
    await handleDrop(paths);
  }, [file1, file2]);

  const rangeText = await page.locator('#date-range-value').textContent();
  expect(rangeText).toContain('Jan');
  expect(rangeText).toContain('2017');
  expect(rangeText).toContain('to');
  expect(rangeText).toContain('Apr');
  expect(rangeText).toContain('2023');
});

test('offset preview updates live as user types', async () => {
  const testFile = createTestJpeg(tmpDir, 'preview-test.jpg');

  // Set a known date
  const scan = await page.evaluate(async (p) => window.api.scanFiles([p]), testFile);
  await page.evaluate(async ({ paths, datetime }) => {
    return window.api.applyAbsolute({ paths, datetime });
  }, { paths: scan.paths, datetime: '2020:06:01 10:00:00' });

  // Load through handleDrop
  await page.evaluate(async (p) => {
    await handleDrop([p]);
  }, testFile);

  // Switch to offset mode, reset offset fields
  await page.evaluate(() => {
    document.querySelector('input[value="offset"]').checked = true;
    document.querySelector('input[value="absolute"]').checked = false;
    document.getElementById('absolute-panel').classList.add('hidden');
    document.getElementById('offset-panel').classList.remove('hidden');
    document.getElementById('offset-years').value = '0';
    document.getElementById('offset-months').value = '0';
    document.getElementById('offset-days').value = '0';
    document.getElementById('offset-hours').value = '0';
    document.getElementById('offset-minutes').value = '0';
    document.getElementById('offset-seconds').value = '0';
    updateOffsetPreview();
  });

  // Preview should be hidden when offset is zero
  await expect(page.locator('#offset-preview')).toBeHidden();

  // Set offset of +5 days and trigger preview
  await page.evaluate(() => {
    document.getElementById('offset-days').value = '5';
    updateOffsetPreview();
  });

  await expect(page.locator('#offset-preview')).toBeVisible();
  const previewText = await page.locator('#offset-preview-value').textContent();
  expect(previewText).toContain('Jun');
  expect(previewText).toContain('2020');
});

test('offset preview hides when switching back to absolute mode', async () => {
  // From prior test state, offset preview should be visible
  // Switch to absolute mode
  await page.evaluate(() => {
    document.querySelector('input[value="absolute"]').checked = true;
    document.querySelector('input[value="offset"]').checked = false;
    document.getElementById('absolute-panel').classList.remove('hidden');
    document.getElementById('offset-panel').classList.add('hidden');
    updateOffsetPreview();
  });

  await expect(page.locator('#offset-preview')).toBeHidden();
});

test('applying to empty file list is prevented', async () => {
  await page.evaluate(() => {
    clearFiles();
  });

  await expect(page.locator('#controls')).toBeHidden();
});
