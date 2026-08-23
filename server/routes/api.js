import express from 'express';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { OpenRouterClient } from '../agent/openrouter.js';

export function createApiRouter(agentEngine, configStore, appVersion = '0.0.0', appUpdater = null) {
  const router = express.Router();

  // Get current settings
  router.get('/config', (req, res) => {
    res.json({
      model: agentEngine.model,
      workspaceRoot: agentEngine.workspaceRoot,
      autoApprove: agentEngine.autoApprove,
      hasApiKey: !!configStore.apiKey,
      recentWorkspaces: configStore.recentWorkspaces || [],
      version: appVersion,
      updateRepo: configStore.updateRepo || 'arnonsrirat/Nexus_Coder',
      autoCheckUpdates: configStore.autoCheckUpdates !== false,
      theme: configStore.theme || 'default'
    });
  });

  // Update settings
  router.post('/config', (req, res) => {
    const { apiKey, model, autoApprove, updateRepo, autoCheckUpdates, theme } = req.body;
    if (apiKey !== undefined) {
      configStore.apiKey = apiKey;
      agentEngine.setApiKey(apiKey);
    }
    if (model) {
      configStore.model = model;
      agentEngine.setModel(model);
    }
    if (autoApprove !== undefined) {
      configStore.autoApprove = autoApprove;
      agentEngine.setAutoApprove(autoApprove);
    }
    if (updateRepo !== undefined) {
      configStore.updateRepo = updateRepo;
    }
    if (autoCheckUpdates !== undefined) {
      configStore.autoCheckUpdates = autoCheckUpdates;
    }
    if (theme !== undefined) {
      configStore.theme = theme;
    }
    configStore.save();
    res.json({ success: true, config: configStore.getPublicConfig() });
  });

  // Get models from OpenRouter
  router.get('/models', async (req, res) => {
    try {
      const client = new OpenRouterClient(configStore.apiKey || '');
      const models = await client.fetchModels();
      res.json({ models });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Set workspace directory
  router.post('/workspace/set', (req, res) => {
    const { folderPath } = req.body;
    if (!folderPath || !fs.existsSync(folderPath)) {
      return res.status(400).json({ error: 'Folder does not exist.' });
    }

    agentEngine.setWorkspace(folderPath);
    configStore.addRecentWorkspace(folderPath);

    res.json({
      success: true,
      workspaceRoot: folderPath,
      name: path.basename(folderPath)
    });
  });

  // Browse local filesystem directories for the folder selector modal
  router.get('/filesystem/browse', (req, res) => {
    try {
      const targetDir = req.query.path || process.cwd();
      let dirToScan = targetDir;

      // Handle drive listing on Windows if requested
      if (req.query.drives === 'true') {
        const drives = [];
        for (let i = 65; i <= 90; i++) {
          const driveLetter = String.fromCharCode(i) + ':\\';
          if (fs.existsSync(driveLetter)) {
            drives.push({ name: driveLetter, path: driveLetter, type: 'drive' });
          }
        }
        return res.json({ currentPath: '', entries: drives, parentPath: null });
      }

      if (!fs.existsSync(dirToScan)) {
        dirToScan = process.cwd();
      }

      const entries = fs.readdirSync(dirToScan, { withFileTypes: true });
      const filtered = [];

      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === '$RECYCLE.BIN' || entry.name === 'System Volume Information') {
          continue;
        }
        if (entry.isDirectory()) {
          filtered.push({
            name: entry.name,
            path: path.join(dirToScan, entry.name),
            type: 'directory'
          });
        }
      }

      filtered.sort((a, b) => a.name.localeCompare(b.name));

      const parentPath = path.dirname(dirToScan) !== dirToScan ? path.dirname(dirToScan) : null;

      res.json({
        currentPath: dirToScan,
        parentPath: parentPath,
        entries: filtered
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get project file tree
  router.get('/workspace/tree', (req, res) => {
    const ws = agentEngine.workspaceRoot;
    if (!ws || !fs.existsSync(ws)) {
      return res.json({ tree: [] });
    }

    const IGNORED = new Set(['.git', 'node_modules', 'dist', 'build', '.next', '.cache', '__pycache__', '.venv', 'venv']);

    function getTree(dir, relPath = '') {
      let entries = [];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch (e) {
        return [];
      }

      entries.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });

      const nodes = [];
      for (const entry of entries) {
        if (IGNORED.has(entry.name) || entry.name.startsWith('.')) continue;

        const full = path.join(dir, entry.name);
        const rel = relPath ? `${relPath}/${entry.name}` : entry.name;

        if (entry.isDirectory()) {
          nodes.push({
            name: entry.name,
            path: rel,
            fullPath: full,
            type: 'directory',
            children: getTree(full, rel)
          });
        } else {
          nodes.push({
            name: entry.name,
            path: rel,
            fullPath: full,
            type: 'file',
            size: fs.statSync(full).size
          });
        }
      }
      return nodes;
    }

    const tree = getTree(ws);
    res.json({
      workspaceRoot: ws,
      workspaceName: path.basename(ws),
      tree: tree
    });
  });

  // Read file content
  router.get('/workspace/file', (req, res) => {
    const filePath = req.query.path;
    const ws = agentEngine.workspaceRoot;
    if (!ws || !filePath) {
      return res.status(400).json({ error: 'Invalid path or no workspace' });
    }

    const fullPath = path.isAbsolute(filePath) ? filePath : path.resolve(ws, filePath);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      res.json({
        path: filePath,
        name: path.basename(filePath),
        content: content
      });
    } catch (e) {
      res.status(500).json({ error: 'Unable to read file content' });
    }
  });

  // Save edited file
  router.post('/workspace/save-file', (req, res) => {
    const { path: filePath, content } = req.body;
    const ws = agentEngine.workspaceRoot;
    if (!ws || !filePath) {
      return res.status(400).json({ error: 'Invalid path or workspace' });
    }

    const fullPath = path.isAbsolute(filePath) ? filePath : path.resolve(ws, filePath);
    try {
      fs.writeFileSync(fullPath, content, 'utf8');
      res.json({ success: true, path: filePath });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Get Git diff status
  router.get('/workspace/git-diff', (req, res) => {
    const ws = agentEngine.workspaceRoot;
    if (!ws || !fs.existsSync(path.join(ws, '.git'))) {
      return res.json({ isGit: false, diff: '' });
    }

    try {
      const diff = execSync('git diff HEAD', { cwd: ws, encoding: 'utf8', timeout: 5000 });
      const status = execSync('git status --short', { cwd: ws, encoding: 'utf8', timeout: 5000 });
      res.json({
        isGit: true,
        diff: diff,
        status: status
      });
    } catch (e) {
      res.json({ isGit: true, diff: '', status: '', error: e.message });
    }
  });

  // Chat Sessions History API
  router.get('/chats', (req, res) => {
    try {
      const list = agentEngine.sessionStore ? agentEngine.sessionStore.listSessions() : [];
      res.json({ chats: list });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/chats/:id', (req, res) => {
    try {
      const session = agentEngine.sessionStore ? agentEngine.sessionStore.getSession(req.params.id) : null;
      if (!session) return res.status(404).json({ error: 'Chat not found' });
      res.json({ chat: session });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/chats/new', (req, res) => {
    try {
      const session = agentEngine.sessionStore ? agentEngine.sessionStore.createSession(req.body) : { id: `chat_${Date.now()}` };
      res.json({ success: true, chat: session });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/chats/:id/rename', (req, res) => {
    try {
      const session = agentEngine.sessionStore ? agentEngine.sessionStore.getSession(req.params.id) : null;
      if (!session) return res.status(404).json({ error: 'Chat not found' });
      session.title = req.body.title || session.title;
      agentEngine.sessionStore.saveSession(session);
      res.json({ success: true, chat: session });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.delete('/chats/:id', (req, res) => {
    try {
      const deleted = agentEngine.sessionStore ? agentEngine.sessionStore.deleteSession(req.params.id) : false;
      res.json({ success: deleted });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // App Updater APIs
  router.get('/updater/status', (req, res) => {
    if (!appUpdater) {
      return res.json({ status: 'idle', currentVersion: appVersion, updateInfo: null });
    }
    res.json(appUpdater.getStatus());
  });

  router.get('/updater/check', async (req, res) => {
    if (!appUpdater) {
      return res.status(500).json({ error: 'Updater service not initialized' });
    }
    try {
      const targetRepo = req.query.repo || configStore.updateRepo || null;
      const info = await appUpdater.checkForUpdates(targetRepo);
      res.json({ success: true, info });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/updater/download', async (req, res) => {
    if (!appUpdater) {
      return res.status(500).json({ error: 'Updater service not initialized' });
    }
    try {
      // Run download in background
      appUpdater.startDownload().catch((err) => {
        console.error('Updater download error in background:', err);
      });
      res.json({ success: true, message: 'Download started' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/updater/apply', (req, res) => {
    if (!appUpdater) {
      return res.status(500).json({ error: 'Updater service not initialized' });
    }
    try {
      const result = appUpdater.applyUpdate();
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
