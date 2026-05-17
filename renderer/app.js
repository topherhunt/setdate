const dropZone = document.getElementById('drop-zone');
const dropPrompt = document.getElementById('drop-prompt');
const dropSummary = document.getElementById('drop-summary');
const fileCountEl = document.getElementById('file-count');
const dateRangeValue = document.getElementById('date-range-value');
const offsetPreview = document.getElementById('offset-preview');
const offsetPreviewValue = document.getElementById('offset-preview-value');
const clearBtn = document.getElementById('clear-btn');
const controls = document.getElementById('controls');
const absolutePanel = document.getElementById('absolute-panel');
const offsetPanel = document.getElementById('offset-panel');
const applyBtn = document.getElementById('apply-btn');
const statusEl = document.getElementById('status');
const datetimeInput = document.getElementById('datetime-input');

let currentPaths = [];
let currentMinDate = null;
let currentMaxDate = null;

function formatDate(iso) {
  if (!iso) return 'unknown';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRange(minIso, maxIso) {
  if (!minIso || !maxIso) return 'No date metadata found';
  const minStr = formatDate(minIso);
  const maxStr = formatDate(maxIso);
  if (minStr === maxStr) return minStr;
  return minStr + ' <span class="date-separator">to</span> ' + maxStr;
}

function getOffsetValues() {
  const dir = document.getElementById('offset-dir').value === '+' ? 1 : -1;
  const y = (parseInt(document.getElementById('offset-years').value) || 0) * dir;
  const mo = (parseInt(document.getElementById('offset-months').value) || 0) * dir;
  const d = (parseInt(document.getElementById('offset-days').value) || 0) * dir;
  const h = (parseInt(document.getElementById('offset-hours').value) || 0) * dir;
  const mi = (parseInt(document.getElementById('offset-minutes').value) || 0) * dir;
  const s = (parseInt(document.getElementById('offset-seconds').value) || 0) * dir;
  return { y, mo, d, h, mi, s };
}

function applyOffsetToDate(iso, offset) {
  const date = new Date(iso);
  date.setFullYear(date.getFullYear() + offset.y);
  date.setMonth(date.getMonth() + offset.mo);
  date.setDate(date.getDate() + offset.d);
  date.setHours(date.getHours() + offset.h);
  date.setMinutes(date.getMinutes() + offset.mi);
  date.setSeconds(date.getSeconds() + offset.s);
  return date.toISOString();
}

function updateOffsetPreview() {
  const mode = document.querySelector('input[name="mode"]:checked').value;
  if (mode !== 'offset' || !currentMinDate || !currentMaxDate) {
    offsetPreview.classList.add('hidden');
    return;
  }

  const offset = getOffsetValues();
  const hasOffset = Math.abs(offset.y) + Math.abs(offset.mo) + Math.abs(offset.d)
    + Math.abs(offset.h) + Math.abs(offset.mi) + Math.abs(offset.s) > 0;

  if (!hasOffset) {
    offsetPreview.classList.add('hidden');
    return;
  }

  const newMin = applyOffsetToDate(currentMinDate, offset);
  const newMax = applyOffsetToDate(currentMaxDate, offset);
  offsetPreviewValue.innerHTML = formatRange(newMin, newMax);
  offsetPreview.classList.remove('hidden');
}

function setStatus(text, type) {
  statusEl.textContent = text;
  statusEl.className = 'status' + (type ? ' ' + type : '');
}

function clearFiles() {
  currentPaths = [];
  currentMinDate = null;
  currentMaxDate = null;
  dropPrompt.classList.remove('hidden');
  dropSummary.classList.add('hidden');
  dropZone.classList.remove('has-files');
  controls.classList.add('hidden');
  offsetPreview.classList.add('hidden');
  setStatus('');
}

async function handleDrop(paths) {
  setStatus('Scanning files...');
  applyBtn.disabled = true;

  try {
    const result = await window.api.scanFiles(paths);
    currentPaths = result.paths;
    currentMinDate = result.minDate;
    currentMaxDate = result.maxDate;

    if (result.count === 0) {
      setStatus('No image files found.', 'error');
      return;
    }

    fileCountEl.textContent = result.count + ' image' + (result.count === 1 ? '' : 's') + ' selected';
    dateRangeValue.innerHTML = formatRange(result.minDate, result.maxDate);

    if (result.minDate) {
      const d = new Date(result.minDate);
      const pad = (n) => String(n).padStart(2, '0');
      datetimeInput.value = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
        + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    }

    dropPrompt.classList.add('hidden');
    dropSummary.classList.remove('hidden');
    dropZone.classList.add('has-files');
    controls.classList.remove('hidden');
    applyBtn.disabled = false;
    setStatus('');
    updateOffsetPreview();
  } catch (err) {
    setStatus('Error scanning files: ' + err.message, 'error');
  }
}

// Drag and drop
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.remove('dragover');

  const paths = Array.from(e.dataTransfer.files).map((f) => window.api.getPathForFile(f));
  if (paths.length > 0) {
    handleDrop(paths);
  }
});

// Click to browse
dropZone.addEventListener('click', async (e) => {
  if (e.target === clearBtn || clearBtn.contains(e.target)) return;
  const paths = await window.api.pickFiles();
  if (paths && paths.length > 0) {
    handleDrop(paths);
  }
});

// Prevent default drag behavior on the whole document
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());

// Clear button
clearBtn.addEventListener('click', clearFiles);

// Mode toggle
document.querySelectorAll('input[name="mode"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    const mode = document.querySelector('input[name="mode"]:checked').value;
    absolutePanel.classList.toggle('hidden', mode !== 'absolute');
    offsetPanel.classList.toggle('hidden', mode !== 'offset');
    updateOffsetPreview();
  });
});

// Live offset preview -- update as user types
document.querySelectorAll('#offset-panel input, #offset-dir').forEach((el) => {
  el.addEventListener('input', updateOffsetPreview);
  el.addEventListener('change', updateOffsetPreview);
});

// Apply
applyBtn.addEventListener('click', async () => {
  if (currentPaths.length === 0) return;

  const mode = document.querySelector('input[name="mode"]:checked').value;
  applyBtn.disabled = true;
  setStatus('Applying changes...');

  try {
    let result;

    if (mode === 'absolute') {
      const val = datetimeInput.value;
      if (!val) {
        setStatus('Please select a date and time.', 'error');
        applyBtn.disabled = false;
        return;
      }
      const datetime = val.replace('T', ' ');
      result = await window.api.applyAbsolute({ paths: currentPaths, datetime });
    } else {
      const dir = document.getElementById('offset-dir').value;
      const y = parseInt(document.getElementById('offset-years').value) || 0;
      const mo = parseInt(document.getElementById('offset-months').value) || 0;
      const d = parseInt(document.getElementById('offset-days').value) || 0;
      const h = parseInt(document.getElementById('offset-hours').value) || 0;
      const mi = parseInt(document.getElementById('offset-minutes').value) || 0;
      const s = parseInt(document.getElementById('offset-seconds').value) || 0;

      if (y + mo + d + h + mi + s === 0) {
        setStatus('Please enter a non-zero offset.', 'error');
        applyBtn.disabled = false;
        return;
      }

      const offset = `${dir}=${y}:${mo}:${d} ${h}:${mi}:${s}`;
      result = await window.api.applyOffset({ paths: currentPaths, offset });
    }

    if (result.errors.length === 0) {
      setStatus('Updated ' + result.success + ' file' + (result.success === 1 ? '' : 's') + '.', 'success');
    } else {
      setStatus(
        'Updated ' + result.success + ', failed ' + result.errors.length + '. First error: ' + result.errors[0].error,
        'error'
      );
    }
  } catch (err) {
    setStatus('Error: ' + err.message, 'error');
  }

  applyBtn.disabled = false;
});
