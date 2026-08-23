// NexusCoder self-installer.
//
// The shipped "NexusCoder Setup <version>.exe" is the application itself,
// launched from the portable extraction directory. Instead of handing the user
// off to an NSIS wizard, the app opens its own setup window and installs by
// copying the already-extracted payload into the target directory, then writes
// shortcuts and an uninstall entry and relaunches from the new location.
//
// Everything here runs on plain Windows tooling (PowerShell for .lnk files,
// reg.exe for the uninstall entry), so there are no native dependencies.

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn, execFile } = require('child_process');

const APP_NAME = 'NexusCoder';
const APP_DISPLAY_NAME = 'NexusCoder Studio';
const PUBLISHER = 'Arnon Srirat';
const UNINSTALL_KEY =
  'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\NexusCoder';

/**
 * True when this process is the setup build rather than an installed copy.
 * The portable stub exports PORTABLE_EXECUTABLE_FILE; we only treat it as an
 * installer when the file the user double-clicked is named like one, so the
 * same binary renamed to "NexusCoder <version>.exe" still runs portably.
 */
function isInstallerMode() {
  if (process.argv.includes('--setup') || isSilentInstall()) return true;
  const portableFile = process.env.PORTABLE_EXECUTABLE_FILE;
  if (!portableFile) return false;
  return /setup|install/i.test(path.basename(portableFile));
}

/**
 * Unattended install, used by the in-app updater: no window, no clicks, just
 * overwrite the existing installation. Both a flag and an env var are accepted
 * because the portable stub is the process that actually receives argv.
 */
function isSilentInstall() {
  return (
    process.argv.includes('--silent') ||
    process.env.NEXUSCODER_SILENT_INSTALL === '1'
  );
}

function silentInstallDir() {
  const fromArg = process.argv.find((a) => a.startsWith('--install-dir='));
  if (fromArg) return fromArg.slice('--install-dir='.length).replace(/^"|"$/g, '');
  if (process.env.NEXUSCODER_INSTALL_DIR) return process.env.NEXUSCODER_INSTALL_DIR;
  return defaultInstallDir();
}

function isUninstallMode() {
  return process.argv.includes('--uninstall');
}

function defaultInstallDir() {
  const base = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  return path.join(base, 'Programs', APP_NAME);
}

/** The directory holding the currently running NexusCoder.exe and its resources. */
function payloadDir() {
  return path.dirname(process.execPath);
}

function desktopDir() {
  return path.join(os.homedir(), 'Desktop');
}

function startMenuDir() {
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  return path.join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs');
}

function runPowerShell(script) {
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { windowsHide: true },
      (err, stdout, stderr) => (err ? reject(new Error(stderr || err.message)) : resolve(stdout))
    );
  });
}

function runReg(args) {
  return new Promise((resolve, reject) => {
    execFile('reg.exe', args, { windowsHide: true }, (err, stdout, stderr) =>
      err ? reject(new Error(stderr || err.message)) : resolve(stdout)
    );
  });
}

/** Every file under `dir`, so the copy can report real progress. */
function listFilesRecursive(dir) {
  const out = [];
  const walk = (current) => {
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch (e) {
      return;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) out.push(full);
    }
  };
  walk(dir);
  return out;
}

function formatBytes(bytes) {
  if (!bytes) return '0 MB';
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Copy the payload into `targetDir`, reporting progress as it goes.
 * onProgress({ percent, copied, total, currentFile })
 */
async function copyPayload(targetDir, onProgress) {
  const source = payloadDir();
  const files = listFilesRecursive(source);
  const total = files.length;

  if (total === 0) throw new Error('Installation payload is empty - the setup file may be corrupt.');

  fs.mkdirSync(targetDir, { recursive: true });

  let copied = 0;
  let lastReport = 0;

  for (const file of files) {
    const relative = path.relative(source, file);
    const dest = path.join(targetDir, relative);
    fs.mkdirSync(path.dirname(dest), { recursive: true });

    try {
      fs.copyFileSync(file, dest);
    } catch (err) {
      // A locked file from a previous install (usually the running exe) is the
      // one thing worth failing loudly on; everything else can be skipped.
      if (relative.toLowerCase().endsWith('.exe')) {
        throw new Error(`Could not write ${relative}. Close NexusCoder and run setup again.`);
      }
    }

    copied++;
    const now = Date.now();
    if (now - lastReport > 60 || copied === total) {
      lastReport = now;
      onProgress({
        percent: Math.round((copied / total) * 100),
        copied,
        total,
        currentFile: relative
      });
      // Let the renderer paint the progress bar.
      await new Promise((r) => setImmediate(r));
    }
  }

  return { files: total };
}

async function createShortcut(shortcutPath, targetExe, description) {
  fs.mkdirSync(path.dirname(shortcutPath), { recursive: true });
  const script = `
$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut('${shortcutPath.replace(/'/g, "''")}')
$sc.TargetPath = '${targetExe.replace(/'/g, "''")}'
$sc.WorkingDirectory = '${path.dirname(targetExe).replace(/'/g, "''")}'
$sc.IconLocation = '${targetExe.replace(/'/g, "''")}'
$sc.Description = '${String(description || '').replace(/'/g, "''")}'
$sc.Save()
`;
  await runPowerShell(script);
}

async function registerUninstallEntry(installDir, version, sizeBytes) {
  const exe = path.join(installDir, `${APP_NAME}.exe`);
  const entries = [
    ['DisplayName', 'REG_SZ', APP_DISPLAY_NAME],
    ['DisplayVersion', 'REG_SZ', version],
    ['Publisher', 'REG_SZ', PUBLISHER],
    ['DisplayIcon', 'REG_SZ', exe],
    ['InstallLocation', 'REG_SZ', installDir],
    ['UninstallString', 'REG_SZ', `"${exe}" --uninstall`],
    ['NoModify', 'REG_DWORD', '1'],
    ['NoRepair', 'REG_DWORD', '1'],
    ['EstimatedSize', 'REG_DWORD', String(Math.round(sizeBytes / 1024))]
  ];

  for (const [name, type, value] of entries) {
    await runReg(['add', UNINSTALL_KEY, '/v', name, '/t', type, '/d', value, '/f']);
  }
}

async function performInstall(options, onProgress) {
  const installDir = options.installDir || defaultInstallDir();
  const version = app.getVersion();

  onProgress({ phase: 'copying', percent: 0, message: 'กำลังคัดลอกไฟล์โปรแกรม...' });

  let totalBytes = 0;
  const result = await copyPayload(installDir, (p) => {
    onProgress({
      phase: 'copying',
      percent: Math.round(p.percent * 0.9),
      message: `กำลังคัดลอกไฟล์ (${p.copied}/${p.total})`,
      detail: p.currentFile
    });
  });

  try {
    totalBytes = listFilesRecursive(installDir).reduce((sum, f) => {
      try { return sum + fs.statSync(f).size; } catch (e) { return sum; }
    }, 0);
  } catch (e) { /* size is cosmetic */ }

  const exePath = path.join(installDir, `${APP_NAME}.exe`);

  if (options.desktopShortcut !== false) {
    onProgress({ phase: 'shortcuts', percent: 92, message: 'กำลังสร้างไอคอนบนเดสก์ท็อป...' });
    try {
      await createShortcut(path.join(desktopDir(), `${APP_DISPLAY_NAME}.lnk`), exePath, APP_DISPLAY_NAME);
    } catch (e) {
      console.warn('Desktop shortcut failed:', e.message);
    }
  }

  if (options.startMenuShortcut !== false) {
    onProgress({ phase: 'shortcuts', percent: 95, message: 'กำลังเพิ่มลงเมนู Start...' });
    try {
      await createShortcut(path.join(startMenuDir(), `${APP_DISPLAY_NAME}.lnk`), exePath, APP_DISPLAY_NAME);
    } catch (e) {
      console.warn('Start menu shortcut failed:', e.message);
    }
  }

  onProgress({ phase: 'registry', percent: 98, message: 'กำลังลงทะเบียนโปรแกรม...' });
  try {
    await registerUninstallEntry(installDir, version, totalBytes);
  } catch (e) {
    console.warn('Uninstall registration failed:', e.message);
  }

  onProgress({ phase: 'done', percent: 100, message: 'ติดตั้งเสร็จสมบูรณ์' });

  return {
    installDir,
    exePath,
    version,
    fileCount: result.files,
    size: formatBytes(totalBytes)
  };
}

/**
 * Removes the install directory, shortcuts and registry entry. The directory
 * cannot delete itself while the process is running, so a detached batch waits
 * for exit first.
 */
function performUninstall() {
  const installDir = path.dirname(process.execPath);
  const tempDir = path.join(os.tmpdir(), 'nexuscoder-uninstall');
  fs.mkdirSync(tempDir, { recursive: true });
  const batchPath = path.join(tempDir, 'uninstall.cmd');

  const script = `@echo off
timeout /t 1 /nobreak >nul
taskkill /f /im "${APP_NAME}.exe" >nul 2>&1
timeout /t 1 /nobreak >nul
del /f /q "${path.join(desktopDir(), `${APP_DISPLAY_NAME}.lnk`)}" >nul 2>&1
del /f /q "${path.join(startMenuDir(), `${APP_DISPLAY_NAME}.lnk`)}" >nul 2>&1
reg delete "${UNINSTALL_KEY}" /f >nul 2>&1
rmdir /s /q "${installDir}" >nul 2>&1
del /f /q "%~f0" >nul 2>&1
exit
`;

  fs.writeFileSync(batchPath, script, 'utf8');
  const child = spawn('cmd.exe', ['/c', batchPath], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });
  child.unref();
}

function createSetupWindow(mode) {
  const win = new BrowserWindow({
    width: 640,
    height: mode === 'uninstall' ? 420 : 512,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    frame: false,
    transparent: false,
    backgroundColor: '#070913',
    title: `${APP_DISPLAY_NAME} Setup`,
    icon: path.join(__dirname, '../build/icon.png'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'installer-preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  });

  win.loadFile(path.join(__dirname, 'installer.html'), { query: { mode } });
  win.once('ready-to-show', () => win.show());
  return win;
}

/**
 * Boots the setup (or uninstall) experience. Returns true when it took over,
 * so main.cjs knows not to start the normal application.
 */
function startInstallerApp() {
  const mode = isUninstallMode() ? 'uninstall' : 'install';
  let win = null;

  // Updater path: install headlessly and exit. The caller (the update batch)
  // is responsible for relaunching, so the app comes back exactly once.
  if (isSilentInstall()) {
    app.whenReady().then(async () => {
      const target = silentInstallDir();
      try {
        await performInstall(
          { installDir: target, desktopShortcut: false, startMenuShortcut: false },
          (p) => console.log(`[silent-install] ${p.percent}% ${p.message || ''}`)
        );
        console.log(`[silent-install] completed -> ${target}`);
      } catch (err) {
        console.error('[silent-install] failed:', err.message);
        process.exitCode = 1;
      }
      app.quit();
    });
    return true;
  }

  ipcMain.handle('setup:info', () => ({
    mode,
    version: app.getVersion(),
    appName: APP_DISPLAY_NAME,
    defaultDir: mode === 'uninstall' ? path.dirname(process.execPath) : defaultInstallDir()
  }));

  ipcMain.handle('setup:browse', async () => {
    const res = await dialog.showOpenDialog(win, {
      title: 'เลือกโฟลเดอร์สำหรับติดตั้ง NexusCoder',
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: defaultInstallDir()
    });
    if (res.canceled || !res.filePaths[0]) return null;
    // Installing straight into a shared root would scatter files, so always
    // land inside a NexusCoder folder unless the user already picked one.
    const chosen = res.filePaths[0];
    return path.basename(chosen).toLowerCase() === APP_NAME.toLowerCase()
      ? chosen
      : path.join(chosen, APP_NAME);
  });

  ipcMain.handle('setup:install', async (event, options) => {
    try {
      const result = await performInstall(options || {}, (progress) => {
        if (win && !win.isDestroyed()) win.webContents.send('setup:progress', progress);
      });
      return { success: true, ...result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('setup:launch', async (event, exePath) => {
    const target = exePath || path.join(defaultInstallDir(), `${APP_NAME}.exe`);
    const child = spawn(target, [], { detached: true, stdio: 'ignore' });
    child.unref();
    setTimeout(() => app.quit(), 400);
    return { success: true };
  });

  ipcMain.handle('setup:uninstall', async () => {
    try {
      performUninstall();
      setTimeout(() => app.quit(), 600);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('setup:open-folder', async (event, dir) => {
    if (dir) shell.openPath(dir);
    return { success: true };
  });

  ipcMain.handle('setup:close', () => {
    app.quit();
    return { success: true };
  });

  app.whenReady().then(() => {
    win = createSetupWindow(mode);
  });

  app.on('window-all-closed', () => app.quit());
  return true;
}

module.exports = {
  isInstallerMode,
  isUninstallMode,
  isSilentInstall,
  startInstallerApp,
  defaultInstallDir
};
