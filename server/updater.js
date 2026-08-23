import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';

// Semver comparison: returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal
export function compareSemver(v1, v2) {
  const parse = (v) => String(v || '0.0.0').replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
  const p1 = parse(v1);
  const p2 = parse(v2);
  while (p1.length < 3) p1.push(0);
  while (p2.length < 3) p2.push(0);

  for (let i = 0; i < 3; i++) {
    if (p1[i] > p2[i]) return 1;
    if (p1[i] < p2[i]) return -1;
  }
  return 0;
}

export class AppUpdater {
  constructor(appVersion = '1.0.0') {
    this.currentVersion = appVersion;
    this.defaultRepo = 'arnonsrirat/Nexus_Coder'; // GitHub owner/repo
    this.status = 'idle'; // 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error'
    this.updateInfo = null;
    this.downloadProgress = { percent: 0, speed: '0 KB/s', transferred: 0, total: 0 };
    this.downloadedFilePath = null;
    this.listeners = new Set();

    // Automatically clean up stale update installers from temp directory on launch
    this.cleanOldUpdateCache();
  }

  setAppVersion(ver) {
    if (ver) this.currentVersion = ver;
  }

  addListener(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(event, data) {
    for (const listener of this.listeners) {
      try {
        listener(event, data);
      } catch (e) {
        console.error('Error in updater listener:', e);
      }
    }
  }

  getStatus() {
    return {
      status: this.status,
      currentVersion: this.currentVersion,
      updateInfo: this.updateInfo,
      downloadProgress: this.downloadProgress,
      downloadedFilePath: this.downloadedFilePath
    };
  }

  getTempUpdateDir() {
    return path.join(os.tmpdir(), 'nexuscoder-update');
  }

  // Clears old installers & temp files to free disk space
  cleanOldUpdateCache(preserveCurrent = false) {
    try {
      const tempDir = this.getTempUpdateDir();
      if (!fs.existsSync(tempDir)) return { freedBytes: 0, filesRemoved: 0 };

      const files = fs.readdirSync(tempDir);
      let freedBytes = 0;
      let filesRemoved = 0;

      for (const file of files) {
        const fullPath = path.join(tempDir, file);
        if (preserveCurrent && this.downloadedFilePath && fullPath === path.resolve(this.downloadedFilePath)) {
          continue;
        }

        try {
          const stat = fs.statSync(fullPath);
          freedBytes += stat.size;
          if (stat.isDirectory()) {
            fs.rmSync(fullPath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(fullPath);
          }
          filesRemoved++;
        } catch (e) {}
      }

      console.log(`🧹 Cleaned update cache: removed ${filesRemoved} files, freed ${(freedBytes / (1024 * 1024)).toFixed(1)} MB.`);
      return { freedBytes, filesRemoved };
    } catch (err) {
      console.warn('Could not clean old update cache:', err.message);
      return { freedBytes: 0, filesRemoved: 0 };
    }
  }

  async checkForUpdates(customRepoOrUrl = null) {
    this.status = 'checking';
    this.emit('status_change', this.getStatus());

    try {
      const repo = customRepoOrUrl || this.defaultRepo;
      let updateData = null;

      if (repo.startsWith('http://') || repo.startsWith('https://')) {
        updateData = await this.fetchJson(repo);
      } else {
        const apiUrl = `https://api.github.com/repos/${repo}/releases/latest`;
        const release = await this.fetchJson(apiUrl, {
          'User-Agent': 'NexusCoder-AppUpdater',
          'Accept': 'application/vnd.github.v3+json'
        });

        const latestTag = release.tag_name || release.name || '0.0.0';
        const latestVersion = latestTag.replace(/^v/i, '');
        const isUpdateAvailable = compareSemver(latestVersion, this.currentVersion) > 0;

        let asset = null;
        if (Array.isArray(release.assets)) {
          asset = release.assets.find(a => a.name.endsWith('.exe')) || release.assets[0];
        }

        updateData = {
          updateAvailable: isUpdateAvailable,
          currentVersion: this.currentVersion,
          latestVersion: latestVersion,
          releaseName: release.name || `Release ${latestTag}`,
          releaseNotes: release.body || 'No release notes provided.',
          publishedAt: release.published_at,
          downloadUrl: asset ? asset.browser_download_url : release.html_url,
          fileName: asset ? asset.name : `NexusCoder-Setup-${latestVersion}.exe`,
          fileSize: asset ? asset.size : 0
        };
      }

      this.updateInfo = updateData;
      this.status = updateData.updateAvailable ? 'available' : 'idle';
      this.emit('status_change', this.getStatus());
      return this.updateInfo;
    } catch (err) {
      console.warn('Update check failed:', err.message);
      this.status = 'error';
      this.updateInfo = {
        updateAvailable: false,
        currentVersion: this.currentVersion,
        error: err.message
      };
      this.emit('status_change', this.getStatus());
      return this.updateInfo;
    }
  }

  async startDownload() {
    if (!this.updateInfo || !this.updateInfo.downloadUrl) {
      throw new Error('No update available or download URL missing. Please check for updates first.');
    }

    if (this.status === 'downloading') {
      return { message: 'Download already in progress.' };
    }

    // Clean up previous cached files before starting new download
    this.cleanOldUpdateCache(false);

    this.status = 'downloading';
    this.downloadProgress = { percent: 0, speed: '0 KB/s', transferred: 0, total: this.updateInfo.fileSize || 0 };
    this.emit('status_change', this.getStatus());

    const tempDir = this.getTempUpdateDir();
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const fileName = this.updateInfo.fileName || `NexusCoder-Update-${this.updateInfo.latestVersion}.exe`;
    const targetFile = path.join(tempDir, fileName);
    this.downloadedFilePath = targetFile;

    try {
      await this.downloadFile(this.updateInfo.downloadUrl, targetFile);
      this.status = 'ready';
      this.emit('status_change', this.getStatus());
      this.emit('update_ready', {
        version: this.updateInfo.latestVersion,
        filePath: targetFile
      });
      return { success: true, filePath: targetFile };
    } catch (err) {
      this.status = 'error';
      this.emit('status_change', this.getStatus());
      this.emit('update_error', { message: err.message });
      throw err;
    }
  }

  downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
      const fileStream = fs.createWriteStream(destPath);
      let downloadedBytes = 0;
      let totalBytes = this.updateInfo?.fileSize || 0;
      let startTime = Date.now();
      let lastBytes = 0;
      let lastTime = startTime;

      const executeGet = (targetUrl, redirectCount = 0) => {
        if (redirectCount > 5) {
          fileStream.close();
          fs.unlink(destPath, () => {});
          return reject(new Error('Too many redirects while downloading update.'));
        }

        const client = targetUrl.startsWith('https://') ? https : http;
        const req = client.get(targetUrl, {
          headers: {
            'User-Agent': 'NexusCoder-AppUpdater'
          }
        }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return executeGet(res.headers.location, redirectCount + 1);
          }

          if (res.statusCode !== 200) {
            fileStream.close();
            fs.unlink(destPath, () => {});
            return reject(new Error(`Server returned HTTP ${res.statusCode} when downloading update.`));
          }

          const headerTotal = parseInt(res.headers['content-length'], 10);
          if (!isNaN(headerTotal) && headerTotal > 0) {
            totalBytes = headerTotal;
          }

          res.on('data', (chunk) => {
            downloadedBytes += chunk.length;
            fileStream.write(chunk);

            const now = Date.now();
            const timeDelta = (now - lastTime) / 1000;
            if (timeDelta >= 0.5) {
              const speedBytesPerSec = (downloadedBytes - lastBytes) / timeDelta;
              const speedFormatted = speedBytesPerSec > 1024 * 1024
                ? `${(speedBytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`
                : `${(speedBytesPerSec / 1024).toFixed(0)} KB/s`;

              const percent = totalBytes > 0 ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : 0;
              this.downloadProgress = {
                percent,
                speed: speedFormatted,
                transferred: downloadedBytes,
                total: totalBytes
              };

              this.emit('update_progress', this.downloadProgress);
              lastBytes = downloadedBytes;
              lastTime = now;
            }
          });

          res.on('end', () => {
            fileStream.end();
            this.downloadProgress = {
              percent: 100,
              speed: '0 KB/s',
              transferred: downloadedBytes,
              total: downloadedBytes
            };
            this.emit('update_progress', this.downloadProgress);
            resolve(destPath);
          });

          res.on('error', (err) => {
            fileStream.close();
            fs.unlink(destPath, () => {});
            reject(err);
          });
        });

        req.on('error', (err) => {
          fileStream.close();
          fs.unlink(destPath, () => {});
          reject(err);
        });
      };

      executeGet(url);
    });
  }

  // Installs the downloaded update silently and brings the app straight back up.
  //
  // The setup binary is NexusCoder itself running in installer mode
  // (electron/installer.cjs), so `--silent --install-dir=...` overwrites the
  // current installation with no window and no clicks. A tiny batch runner does
  // the work because the app has to exit before its own files can be replaced.
  applyUpdate() {
    if (!this.downloadedFilePath || !fs.existsSync(this.downloadedFilePath)) {
      throw new Error('No downloaded update file found to apply.');
    }

    const installerPath = path.resolve(this.downloadedFilePath);
    const tempDir = this.getTempUpdateDir();
    const batchPath = path.join(tempDir, 'run-update.cmd');
    const vbsPath = path.join(tempDir, 'run-hidden.vbs');
    const doneMarker = path.join(tempDir, 'install-done.marker');
    const failMarker = path.join(tempDir, 'install-failed.marker');

    // Clear stale markers from any previous update attempt, so the wait loop
    // below can never read a leftover "done" file and think this run is
    // finished before it has even started.
    try { fs.unlinkSync(doneMarker); } catch (e) {}
    try { fs.unlinkSync(failMarker); } catch (e) {}

    // The running executable is replaced in place by the installer, so the same
    // path is the correct one to relaunch. Keep a default install location as a
    // fallback for the (unpackaged) dev case.
    const appExePath = process.execPath;
    const isPackaged = !appExePath.toLowerCase().endsWith('node.exe');
    const fallbackExePath = path.join(
      process.env.LOCALAPPDATA || os.homedir(),
      'Programs', 'NexusCoder', 'NexusCoder.exe'
    );
    const relaunchPath = isPackaged ? appExePath : fallbackExePath;
    // Install over the directory the running app lives in, so a custom install
    // location chosen at setup time is preserved across updates.
    const installDir = isPackaged ? path.dirname(appExePath) : path.dirname(fallbackExePath);

    console.log(`🚀 Installing update silently: ${installerPath}`);
    console.log(`📍 Will relaunch: ${relaunchPath} (isPackaged: ${isPackaged})`);

    try {
      // Two problems kept making this visibly "stuck", and both trace back
      // to the same root cause: the downloaded file is an NSIS self-
      // extracting "portable" stub, not the real installer. It unpacks this
      // app to a temp folder and runs it from there - so:
      //  - its own process can exit long before the extracted copy actually
      //    finishes installing, which is why waiting on ANY process name
      //    (the stub's, `start /wait`'s handle, a tasklist poll) was never a
      //    reliable "done" signal - it either relaunched too early onto a
      //    half-written binary, or the poll never matched and spun forever.
      //  - the stub (or a console-subsystem step inside it) can allocate its
      //    own console window on the interactive desktop; cmd.exe's own
      //    CREATE_NO_WINDOW only hides *cmd's* window, not a child's.
      //
      // Fixed by launching through WScript.Shell.Run with window style 0
      // (SW_HIDE) - the standard, guaranteed-hidden way to run a process
      // from a script regardless of its subsystem - and by having the
      // installer (electron/installer.cjs) write a marker file when it
      // actually finishes, so this script waits on real completion instead
      // of guessing from a process name. Still bounded (45s) so a genuinely
      // stuck installer can never hang this forever.
      const vbsScript = `Set objShell = CreateObject("WScript.Shell")
objShell.Run """${installerPath}"" --silent ""--install-dir=${installDir}""", 0, False
`;
      fs.writeFileSync(vbsPath, vbsScript, 'utf8');

      const batchScript = `@echo off
title NexusCoder Updater
rem Brief grace period for this process's own graceful process.exit(0) to
rem land before force-killing it, so no write is caught mid-flush.
timeout /t 1 /nobreak >nul
taskkill /f /im "NexusCoder.exe" >nul 2>&1

rem Unattended install straight over the current installation, launched
rem fully hidden regardless of what subsystem the installer/stub is.
set NEXUSCODER_SILENT_INSTALL=1
set NEXUSCODER_INSTALL_DIR=${installDir}
cscript //nologo //B "${vbsPath}"

rem Wait for the completion marker the installer writes when it is actually
rem done, instead of tracking a process name. Bounded to 45s.
set NEXUSCODER_WAIT_TRIES=0
:waitinstaller
if exist "${doneMarker}" goto relaunch
if exist "${failMarker}" goto relaunch
set /a NEXUSCODER_WAIT_TRIES+=1
if %NEXUSCODER_WAIT_TRIES% gtr 45 goto relaunch
timeout /t 1 /nobreak >nul
goto waitinstaller

:relaunch
start "" "${relaunchPath}"
del /f /q "${installerPath}" >nul 2>&1
del /f /q "${vbsPath}" >nul 2>&1
del /f /q "${doneMarker}" >nul 2>&1
del /f /q "${failMarker}" >nul 2>&1
del /f /q "%~f0" >nul 2>&1
exit
`;

      fs.writeFileSync(batchPath, batchScript, 'utf8');

      // Detached and window-hidden: a black console flashing up mid-update
      // looks like something went wrong.
      const child = spawn('cmd.exe', ['/c', batchPath], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      });
      child.unref();

      // Gracefully terminate this process so the installer can replace files.
      setTimeout(() => {
        process.exit(0);
      }, 800);

      return { success: true, message: 'Installing update silently. NexusCoder will restart automatically.' };
    } catch (err) {
      console.error('Failed to launch silent installer via batch:', err);
      // Fallback: run the installer directly, still unattended.
      try {
        const child = spawn(installerPath, ['--silent', `--install-dir=${installDir}`], {
          detached: true,
          stdio: 'ignore',
          windowsHide: true
        });
        child.unref();
        setTimeout(() => process.exit(0), 800);
        return { success: true, message: 'Installer launched in direct silent mode.' };
      } catch (fallbackErr) {
        throw new Error(`Failed to execute update installer: ${err.message}`);
      }
    }
  }

  fetchJson(url, customHeaders = {}) {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https://') ? https : http;
      client.get(url, {
        headers: {
          'User-Agent': 'NexusCoder-AppUpdater',
          ...customHeaders
        }
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return resolve(this.fetchJson(res.headers.location, customHeaders));
        }

        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }

        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error(`Failed to parse response JSON: ${e.message}`));
          }
        });
      }).on('error', reject);
    });
  }
}
