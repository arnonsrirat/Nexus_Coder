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
    this.downloadAbortController = null;
    this.listeners = new Set();
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

  async checkForUpdates(customRepoOrUrl = null) {
    this.status = 'checking';
    this.emit('status_change', this.getStatus());

    try {
      const repo = customRepoOrUrl || this.defaultRepo;
      let updateData = null;

      if (repo.startsWith('http://') || repo.startsWith('https://')) {
        // Custom URL (JSON manifest or direct release)
        updateData = await this.fetchJson(repo);
      } else {
        // GitHub Repository
        const apiUrl = `https://api.github.com/repos/${repo}/releases/latest`;
        const release = await this.fetchJson(apiUrl, {
          'User-Agent': 'NexusCoder-AppUpdater',
          'Accept': 'application/vnd.github.v3+json'
        });

        const latestTag = release.tag_name || release.name || '0.0.0';
        const latestVersion = latestTag.replace(/^v/i, '');
        const isUpdateAvailable = compareSemver(latestVersion, this.currentVersion) > 0;

        // Look for Windows installer asset
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
          fileName: asset ? asset.name : `NexusCoder-v${latestVersion}.exe`,
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

    this.status = 'downloading';
    this.downloadProgress = { percent: 0, speed: '0 KB/s', transferred: 0, total: this.updateInfo.fileSize || 0 };
    this.emit('status_change', this.getStatus());

    const tempDir = path.join(os.tmpdir(), 'nexuscoder-update');
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
          // Handle HTTP redirects
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

  applyUpdate() {
    if (!this.downloadedFilePath || !fs.existsSync(this.downloadedFilePath)) {
      throw new Error('No downloaded update file found to apply.');
    }

    const filePath = this.downloadedFilePath;
    console.log(`🚀 Executing installer update: ${filePath}`);

    try {
      // Launch installer detached so it continues running after this process terminates
      const child = spawn(filePath, ['/S'], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();

      // Gracefully exit current process to allow updater to replace files
      setTimeout(() => {
        process.exit(0);
      }, 1000);

      return { success: true, message: 'Installer launched. Application will restart shortly.' };
    } catch (err) {
      console.error('Failed to launch installer:', err);
      // Fallback: try open without silent flag
      try {
        const child = spawn(filePath, [], { detached: true, stdio: 'ignore' });
        child.unref();
        setTimeout(() => process.exit(0), 1000);
        return { success: true, message: 'Installer launched in standard mode.' };
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
