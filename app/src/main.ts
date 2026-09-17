import { app, BrowserWindow } from 'electron';
import path from 'node:path';

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 720,
    height: 540,
    title: 'Anywhere',
  });

  win.loadFile(path.join(__dirname, 'index.html'));
});

app.on('window-all-closed', () => app.quit());