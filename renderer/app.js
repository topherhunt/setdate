const dropZone = document.getElementById('drop-zone');
const dropPrompt = document.getElementById('drop-prompt');
const dropSummary = document.getElementById('drop-summary');
const fileCountEl = document.getElementById('file-count');
const dateRangeEl = document.getElementById('date-range');
const clearBtn = document.getElementById('clear-btn');
const controls = document.getElementById('controls');
const absolutePanel = document.getElementById('absolute-panel');
const offsetPanel = document.getElementById('offset-panel');
const applyBtn = document.getElementById('apply-btn');
const statusEl = document.getElementById('status');
const datetimeInput = document.getElementById('datetime-input');

let currentPaths = [];

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

function setStatus(text, type) {
  statusEl.textContent = text;
  statusEl.className = 'status' + (type ? ' ' + type : '');
}

function clearFiles() {
  currentPaths = [];
  dropPrompt.classList.remove('hidden');
  dropSummary.classList.add('hidden');
  dropZone.classList.remove('has-files');
  controls.classList.add('hidden');
  setStatus('');
}

async function handleDrop(paths) {
  setStatus('Scanning files...');
  applyBtn.disabled = true;

  try {
    const result = await window.api.scanFiles(paths);
    currentPaths = result.paths;

    if (result.count === 0) {
      setStatus('No image files found.', 'error');
      return;
    }

    fileCountEl.textContent = result.count + ' image' + (result.count === 1 ? '' : 's');

    if (result.minDate && result.maxDate) {
      const minStr = formatDate(result.minDate);
      const maxStr = formatDate(result.maxDate);
      if (minStr === maxStr) {
        dateRangeEl.textContent = 'Current date: ' + minStr;
      } else {
        dateRangeEl.textContent = 'Date range: ' + minStr + ' to ' + maxStr;
      }
    } else {
      dateRangeEl.textContent = 'No existing date metadata found';
    }

    dropPrompt.classList.add('hidden');
    dropSummary.classList.remove('hidden');
    dropZone.classList.add('has-files');
    controls.classList.remove('hidden');
    applyBtn.disabled = false;
    setStatus('');
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

  const paths = Array.from(e.dataTransfer.files).map((f) => f.path);
  if (paths.length > 0) {
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
  });
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
