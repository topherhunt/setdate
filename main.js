const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const exif = require('./lib/exif');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 520,
    resizable: true,
    show: !process.env.SETDATE_HEADLESS,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

ipcMain.handle('scan-files', async (_event, rawPaths) => {
  const paths = exif.resolveFiles(rawPaths);
  const summary = await exif.readDates(paths);
  return { paths, ...summary };
});

ipcMain.handle('apply-absolute', async (_event, { paths, datetime }) => {
  return exif.writeAbsolute(paths, datetime);
});

ipcMain.handle('apply-offset', async (_event, { paths, offset }) => {
  return exif.writeOffset(paths, offset);
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('will-quit', () => {
  exif.shutdown();
});
