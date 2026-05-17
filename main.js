const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
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

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

ipcMain.handle('pick-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'openDirectory', 'multiSelections'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'tiff', 'tif', 'heic', 'heif', 'webp', 'arw', 'cr2', 'cr3', 'nef', 'dng', 'orf', 'raf', 'rw2'] },
    ],
  });
  if (result.canceled) return null;
  return result.filePaths;
});

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
