const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// If ELECTRON_RUN_AS_NODE is set in the environment (some terminals and IDEs
// export it), Electron boots as plain Node, `app` is undefined, and the app
// dies instantly with no window and no message. Fail loudly instead.
if (!app) {
  console.error(
    'NexusCoder cannot start: the Electron runtime was launched in Node mode.\n' +
    'ELECTRON_RUN_AS_NODE is set in this environment. Unset it and relaunch,\n' +
    'or start NexusCoder from Windows Explorer / the Start Menu instead.'
  );
  process.exit(1);
}

// Low RAM & Low CPU hardware switches
// Keeps V8 memory heap bounded and enables efficient GPU memory rasterization
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=512');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');

let mainWindow = null;

async function startBackendServer() {
  try {
    let serverModule;
    const bundledServerPath = path.join(__dirname, '../dist-server/server.cjs');
    if (fs.existsSync(bundledServerPath)) {
      serverModule = require(bundledServerPath);
    } else {
      serverModule = require(path.join(__dirname, '../dist-server/server.cjs'));
    }

    if (serverModule && typeof serverModule.startServer === 'function') {
      const { port } = await serverModule.startServer(3001);
      return port;
    }
    return 3001;
  } catch (err) {
    console.error('Failed to start backend server in Electron:', err);
    dialog.showErrorBox('NexusCoder Error', `Failed to start embedded backend:\n${err.stack || err.message}`);
    throw err;
  }
}

function createWindow(serverPort) {
  const targetUrl = `http://localhost:${serverPort}`;
  console.log(`Loading application from: ${targetUrl}`);

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0b0f19',
    title: 'NexusCoder — AI Agent Coding Studio',
    icon: path.join(__dirname, '../build/icon.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false,
      backgroundThrottling: true // Saves massive CPU cycles when app is minimized or backgrounded
    }
  });

  mainWindow.loadURL(targetUrl);

  // Show window as soon as ready, or fallback after 800ms
  let isShown = false;
  mainWindow.once('ready-to-show', () => {
    if (!isShown && mainWindow) {
      isShown = true;
      mainWindow.show();
    }
  });

  setTimeout(() => {
    if (!isShown && mainWindow && !mainWindow.isDestroyed()) {
      isShown = true;
      mainWindow.show();
    }
  }, 800);

  // Allow F12 or Ctrl+Shift+I for DevTools
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
    if (input.control && input.key.toLowerCase() === 'r') {
      mainWindow.reload();
      event.preventDefault();
    }
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.warn('Page load failed, retrying in 500ms...', errorDescription);
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(targetUrl);
      }
    }, 500);
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    const port = await startBackendServer();
    createWindow(port);
  } catch (err) {
    console.error('Startup failed:', err);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(3001);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
