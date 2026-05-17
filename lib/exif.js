const { ExifTool } = require('exiftool-vendored');
const path = require('path');
const fs = require('fs');

const exiftool = new ExifTool({ taskTimeoutMillis: 30000 });

const IMAGE_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.tiff', '.tif', '.heic', '.heif',
  '.arw', '.cr2', '.cr3', '.nef', '.dng', '.orf', '.raf', '.rw2',
  '.webp',
]);

function isImageFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}

function resolveFiles(paths) {
  const results = [];
  for (const p of paths) {
    const stat = fs.statSync(p, { throwIfNoEntry: false });
    if (!stat) continue;
    if (stat.isDirectory()) {
      const entries = fs.readdirSync(p, { recursive: true });
      for (const entry of entries) {
        const full = path.join(p, entry);
        const s = fs.statSync(full, { throwIfNoEntry: false });
        if (s && s.isFile() && isImageFile(full)) {
          results.push(full);
        }
      }
    } else if (stat.isFile() && isImageFile(p)) {
      results.push(p);
    }
  }
  return results;
}

function exifDateToMs(d) {
  if (!d) return null;
  if (typeof d.toDate === 'function') return d.toDate().getTime();
  if (d instanceof Date) return d.getTime();
  const parsed = Date.parse(String(d));
  return isNaN(parsed) ? null : parsed;
}

async function readDates(filePaths) {
  let min = Infinity;
  let max = -Infinity;
  const batchSize = 20;

  for (let i = 0; i < filePaths.length; i += batchSize) {
    const batch = filePaths.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map((fp) => exiftool.read(fp).catch(() => null))
    );
    for (let j = 0; j < batch.length; j++) {
      const tags = results[j];
      let ms = null;
      if (tags) {
        ms =
          exifDateToMs(tags.DateTimeOriginal) ||
          exifDateToMs(tags.CreateDate) ||
          exifDateToMs(tags.ModifyDate);
      }
      if (ms === null) {
        const stat = fs.statSync(batch[j], { throwIfNoEntry: false });
        if (stat) ms = stat.birthtime.getTime();
      }
      if (ms !== null) {
        if (ms < min) min = ms;
        if (ms > max) max = ms;
      }
    }
  }

  return {
    count: filePaths.length,
    minDate: min === Infinity ? null : new Date(min).toISOString(),
    maxDate: max === -Infinity ? null : new Date(max).toISOString(),
  };
}

async function writeAbsolute(filePaths, datetime) {
  const errors = [];
  for (const fp of filePaths) {
    try {
      await exiftool.write(
        fp,
        {
          AllDates: datetime,
          FileCreateDate: datetime,
        },
        ['-overwrite_original']
      );
    } catch (err) {
      errors.push({ file: fp, error: err.message });
    }
  }
  return { success: filePaths.length - errors.length, errors };
}

async function writeOffset(filePaths, offsetStr) {
  const errors = [];
  for (const fp of filePaths) {
    try {
      await exiftool.write(
        fp,
        {},
        [
          `-AllDates${offsetStr}`,
          `-FileCreateDate${offsetStr}`,
          '-overwrite_original',
        ]
      );
    } catch (err) {
      errors.push({ file: fp, error: err.message });
    }
  }
  return { success: filePaths.length - errors.length, errors };
}

function shutdown() {
  return exiftool.end();
}

module.exports = { resolveFiles, readDates, writeAbsolute, writeOffset, shutdown };
