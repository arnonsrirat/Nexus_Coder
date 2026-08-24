import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import chokidar from 'chokidar';
import { exec } from 'child_process';
import dotenv from 'dotenv';
import { AgentEngine } from './agent/engine.js';
import { ConfigStore } from './configStore.js';
import { createApiRouter } from './routes/api.js';

import { SessionStore } from './sessionStore.js';
import { AppUpdater } from './updater.js';

dotenv.config();

const currentDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

const app = express();
const PORT = process.env.PORT || 3001;

// Resolve app version from package.json for display in the UI (works both
// running from source and from the bundled dist-server/server.cjs).
let appVersion = '0.0.0';
const possiblePkgPaths = [
  path.join(currentDir, '../package.json'),
  path.join(currentDir, 'package.json'),
  path.join(process.cwd(), 'package.json'),
  path.join(process.cwd(), 'resources/app/package.json')
];
for (const p of possiblePkgPaths) {
  try {
    if (fs.existsSync(p)) {
      appVersion = JSON.parse(fs.readFileSync(p, 'utf8')).version || appVersion;
      break;
    }
  } catch (e) {}
}

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Initialize config, session store, agent engine & app updater
const configStore = new ConfigStore();
const sessionStore = new SessionStore();
const agentEngine = new AgentEngine();
agentEngine.sessionStore = sessionStore;
const appUpdater = new AppUpdater(appVersion);

if (configStore.apiKey) {
  agentEngine.setApiKey(configStore.apiKey);
}
if (configStore.model) {
  agentEngine.setModel(configStore.model);
}
if (configStore.autoApprove !== undefined) {
  agentEngine.setAutoApprove(configStore.autoApprove);
}
if (configStore.workspaceRoot) {
  agentEngine.setWorkspace(configStore.workspaceRoot);
}

// Reopen the most recent conversation so relaunching the app resumes where
// the user left off instead of showing an empty chat.
try {
  const recent = sessionStore.listSessions()[0];
  if (recent) {
    const session = sessionStore.getSession(recent.id);
    if (session) {
      agentEngine.currentSessionId = session.id;
      agentEngine.messages = session.messages || [];
      agentEngine.uiMessages = session.uiMessages || [];
      agentEngine.mode = session.mode || 'agent';
      agentEngine.activePlan = session.activePlan || null;
      agentEngine.activeCanvas = session.activeCanvas || null;
      console.log(`💬 Restored last conversation: ${session.title || session.id}`);
    }
  }
} catch (e) {
  console.warn('Could not restore last conversation:', e.message);
}

// API Routes
app.use('/api', createApiRouter(agentEngine, configStore, appVersion, appUpdater));

// Robust, ASAR-safe static file serving for Electron and standalone Web
const mimeTypes = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json'
};

const possibleDistPaths = [
  path.join(currentDir, '../client/dist'),
  path.join(currentDir, 'client/dist'),
  path.join(process.cwd(), 'client/dist'),
  path.join(process.cwd(), 'resources/app/client/dist'),
  path.join(process.cwd(), 'resources/client/dist')
];

let clientDistPath = null;
for (const p of possibleDistPaths) {
  try {
    if (fs.existsSync(path.join(p, 'index.html'))) {
      clientDistPath = p;
      console.log(`📁 Found frontend client bundle at: ${p}`);
      break;
    }
  } catch (e) {}
}

if (clientDistPath) {
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
      return next();
    }

    const reqPath = req.path === '/' ? '/index.html' : req.path;
    // Block path traversal outside the bundle directory.
    let filePath = path.resolve(clientDistPath, '.' + reqPath);
    if (!filePath.startsWith(path.resolve(clientDistPath))) {
      filePath = path.join(clientDistPath, 'index.html');
    }

    try {
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(clientDistPath, 'index.html');
      }
    } catch (err) {
      filePath = path.join(clientDistPath, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', ext === '.html' ? 'no-cache' : 'public, max-age=31536000');

    // Stream instead of readFileSync: the main bundle is several megabytes and
    // reading it synchronously blocks the event loop for every other request.
    res.sendFile(filePath, (err) => {
      if (err && !res.headersSent) {
        console.error(`Error serving static file ${req.path}:`, err.message);
        next();
      }
    });
  });
}

// Create HTTP and WebSocket Server
const server = http.createServer(app);
const wss = new WebSocketServer({ server, maxPayload: 100 * 1024 * 1024 });

function broadcast(event, data) {
  const payload = JSON.stringify({ event, data });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// Pipe agent engine events to WebSocket clients
agentEngine.addListener((event, data) => {
  broadcast(event, data);
});

// Pipe app updater events to WebSocket clients
appUpdater.addListener((event, data) => {
  broadcast(event, data);
});

// File watcher for real-time workspace sync (with debounce and heavy resource filtering)
let fileWatcher = null;
let fileChangeTimer = null;
const activeTerminalProcesses = new Map();

// Directories and binary extensions that must never be walked or watched.
// Watching these consumes massive RAM/handles and spikes CPU usage.
const WATCH_IGNORED_DIRS = new Set([
  'node_modules', 'dist', 'build', 'out', 'target', '.git', '.next', '.nuxt',
  '.cache', '.gradle', '.idea', '.vscode', 'vendor', 'coverage', 'tmp', 'temp',
  '__pycache__', '.venv', 'venv', 'env', 'Pods', 'DerivedData', 'bin', 'obj'
]);

const WATCH_IGNORED_EXTS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svg', '.mp4', '.webm',
  '.mp3', '.wav', '.zip', '.tar', '.gz', '.7z', '.rar', '.exe', '.dll',
  '.dylib', '.so', '.bin', '.iso', '.sqlite', '.sqlite3', '.db', '.log', '.map'
]);

function isIgnoredPath(targetPath) {
  const segments = String(targetPath).split(/[\\/]/);
  for (const segment of segments) {
    if (!segment) continue;
    if (WATCH_IGNORED_DIRS.has(segment)) return true;
    if (segment.startsWith('.') && segment !== '.' && segment !== '..') return true;
  }
  const ext = path.extname(targetPath).toLowerCase();
  if (WATCH_IGNORED_EXTS.has(ext)) return true;
  return false;
}

function setupFileWatcher(workspacePath) {
  if (fileWatcher) {
    try { fileWatcher.close(); } catch (e) {}
    fileWatcher = null;
  }
  if (!workspacePath) return;

  const rootPrefix = path.resolve(workspacePath);

  fileWatcher = chokidar.watch(workspacePath, {
    ignored: (targetPath) => {
      const resolved = path.resolve(targetPath);
      if (resolved === rootPrefix) return false;
      const relative = path.relative(rootPrefix, resolved);
      if (!relative || relative.startsWith('..')) return false;
      return isIgnoredPath(relative);
    },
    persistent: true,
    ignoreInitial: true,
    depth: 4,
    usePolling: false, // Use native OS events for minimal CPU
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 }
  });

  fileWatcher.on('error', (err) => {
    console.warn('File watcher error:', err?.message || err);
  });

  fileWatcher.on('all', (event, filePath) => {
    if (fileChangeTimer) clearTimeout(fileChangeTimer);
    fileChangeTimer = setTimeout(() => {
      broadcast('workspace_file_changed', {
        event,
        path: path.relative(workspacePath, filePath),
        fullPath: filePath
      });
    }, 300);
  });
}

function cleanupResources() {
  if (fileWatcher) {
    try { fileWatcher.close(); fileWatcher = null; } catch (e) {}
  }
  for (const [id, p] of activeTerminalProcesses.entries()) {
    try { p.kill('SIGKILL'); } catch (e) {}
  }
  activeTerminalProcesses.clear();
}
process.on('SIGINT', () => { cleanupResources(); process.exit(0); });
process.on('SIGTERM', () => { cleanupResources(); process.exit(0); });
process.on('exit', () => { cleanupResources(); });

// Keep-alive: a long tool-running phase can leave the socket silent for
// minutes, and idle connections get dropped by the OS/proxy. Ping every 25s
// and drop peers that stop answering so the client reconnects promptly.
const HEARTBEAT_MS = 25000;
const heartbeat = setInterval(() => {
  wss.clients.forEach((client) => {
    if (client.isAlive === false) {
      try { client.terminate(); } catch (e) { /* already gone */ }
      return;
    }
    client.isAlive = false;
    try { client.ping(); } catch (e) { /* send failed - next sweep terminates */ }
  });
}, HEARTBEAT_MS);

wss.on('close', () => clearInterval(heartbeat));

// WebSocket Connection handling
wss.on('connection', (ws) => {
  console.log('⚡ Client connected to WebSocket');

  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('error', (err) => console.warn('WebSocket client error:', err?.message || err));

  // Send initial state
  // Includes the live transcript so a reconnect (or app relaunch) restores the
  // conversation instead of showing an empty panel while work is in flight.
  ws.send(JSON.stringify({
    event: 'init_state',
    data: {
      model: agentEngine.model,
      workspaceRoot: agentEngine.workspaceRoot,
      autoApprove: agentEngine.autoApprove,
      hasApiKey: !!configStore.apiKey,
      isRunning: agentEngine.isRunning,
      isPausedForInput: agentEngine.isPausedForInput,
      pendingAction: agentEngine.pendingAction,
      recentWorkspaces: configStore.recentWorkspaces,
      mode: agentEngine.mode,
      reasoningEffort: agentEngine.reasoningEffort,
      chatId: agentEngine.currentSessionId,
      messages: agentEngine.uiMessages,
      activePlan: agentEngine.activePlan,
      activeCanvas: agentEngine.activeCanvas,
      contextStats: agentEngine.getContextStats()
    }
  }));

  ws.on('message', async (message) => {
    try {
      const parsed = JSON.parse(message.toString());
      const { type, payload } = parsed;

      switch (type) {
        case 'start_task':
          try {
            await agentEngine.startTask(
              payload.prompt, 
              payload.attachedFiles || [],
              {
                mode: payload.mode,
                reasoningEffort: payload.reasoningEffort,
                media: payload.media || []
              }
            );
          } catch (err) {
            ws.send(JSON.stringify({ event: 'error', data: { message: err.message } }));
          }
          break;

        case 'set_mode':
          agentEngine.setMode(payload.mode);
          break;

        case 'set_reasoning_effort':
          agentEngine.setReasoningEffort(payload.reasoningEffort);
          break;

        case 'respond_interactive_prompt':
          try {
            await agentEngine.resumeWithUserInput(payload.actionId, payload.response);
          } catch (err) {
            ws.send(JSON.stringify({ event: 'error', data: { message: err.message } }));
          }
          break;

        case 'stop_agent':
          agentEngine.stop();
          break;

        case 'clear_history':
          agentEngine.clearHistory();
          break;

        case 'continue_run':
          try {
            agentEngine.continueRun();
          } catch (err) {
            ws.send(JSON.stringify({ event: 'error', data: { message: err.message } }));
          }
          break;

        case 'compact_context':
          try {
            const result = agentEngine.compactContext({ force: true });
            ws.send(JSON.stringify({ event: 'context_compacted', data: result }));
          } catch (err) {
            ws.send(JSON.stringify({ event: 'error', data: { message: err.message } }));
          }
          break;

        case 'branch_chat':
          if (agentEngine.isRunning) {
            ws.send(JSON.stringify({
              event: 'error',
              data: { message: 'Stop the running task before branching chat.' }
            }));
            break;
          }
          try {
            const branchedChat = agentEngine.createBranchWithSummary(payload?.baseChatId);
            broadcast('chat_created', { chat: branchedChat });
          } catch (err) {
            ws.send(JSON.stringify({ event: 'error', data: { message: err.message } }));
          }
          break;

        case 'switch_chat':
          if (agentEngine.isRunning) {
            ws.send(JSON.stringify({
              event: 'error',
              data: { message: 'Stop the running task before switching chats.' }
            }));
            break;
          }
          const loaded = sessionStore.getSession(payload.chatId);
          if (loaded) {
            agentEngine.currentSessionId = loaded.id;
            agentEngine.messages = loaded.messages || [];
            agentEngine.uiMessages = loaded.uiMessages || [];
            const chatMode = loaded.mode || 'agent';
            agentEngine.mode = chatMode;
            agentEngine.activePlan = loaded.activePlan || null;
            agentEngine.activeCanvas = loaded.activeCanvas || null;
            broadcast('chat_switched', { chat: loaded });
            broadcast('mode_updated', { mode: chatMode });
            agentEngine.emitContextStats();
          }
          break;

        case 'new_chat':
          if (agentEngine.isRunning) {
            ws.send(JSON.stringify({
              event: 'error',
              data: { message: 'Stop the running task before starting a new chat.' }
            }));
            break;
          }

          const chosenMode = payload?.mode || agentEngine.mode || 'agent';
          agentEngine.mode = chosenMode;

          if (payload?.withSummary) {
            try {
              const branchedChat = agentEngine.createBranchWithSummary(payload?.baseChatId);
              branchedChat.mode = chosenMode;
              broadcast('chat_created', { chat: branchedChat });
              broadcast('mode_updated', { mode: chosenMode });
            } catch (err) {
              ws.send(JSON.stringify({ event: 'error', data: { message: err.message } }));
            }
            break;
          }

          const defaultTitle = chosenMode === 'system' ? 'System Diagnostic Session' : 'New Conversation';
          const newChat = sessionStore.createSession({
            title: payload?.title || defaultTitle,
            model: agentEngine.model,
            mode: chosenMode
          });
          agentEngine.currentSessionId = newChat.id;
          agentEngine.messages = [];
          agentEngine.uiMessages = [];
          agentEngine.activePlan = null;
          agentEngine.activeCanvas = null;
          broadcast('chat_created', { chat: newChat });
          broadcast('mode_updated', { mode: chosenMode });
          agentEngine.emitContextStats();
          break;

        case 'set_workspace':
          agentEngine.setWorkspace(payload.folderPath);
          configStore.addRecentWorkspace(payload.folderPath);
          setupFileWatcher(payload.folderPath);
          broadcast('workspace_updated', {
            workspaceRoot: payload.folderPath,
            name: path.basename(payload.folderPath)
          });
          break;

        case 'run_terminal_command': {
          if (!agentEngine.workspaceRoot) {
            ws.send(JSON.stringify({ event: 'terminal_output', data: { output: 'Error: No workspace open.\n' } }));
            return;
          }
          const cmd = payload.command;
          const procId = `proc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          broadcast('terminal_command_started', { command: cmd, procId });
          const proc = exec(cmd, { cwd: agentEngine.workspaceRoot, maxBuffer: 1024 * 1024 * 5 });
          activeTerminalProcesses.set(procId, proc);
          
          proc.stdout?.on('data', (data) => {
            broadcast('terminal_output', { data: data.toString(), procId });
          });
          proc.stderr?.on('data', (data) => {
            broadcast('terminal_output', { data: data.toString(), isError: true, procId });
          });
          proc.on('close', (code) => {
            activeTerminalProcesses.delete(procId);
            broadcast('terminal_command_completed', { command: cmd, exitCode: code, procId });
          });
          break;
        }

        case 'kill_terminal_command': {
          if (payload?.procId && activeTerminalProcesses.has(payload.procId)) {
            try {
              activeTerminalProcesses.get(payload.procId).kill('SIGTERM');
              activeTerminalProcesses.delete(payload.procId);
            } catch (e) {}
          } else {
            for (const [id, p] of activeTerminalProcesses.entries()) {
              try { p.kill('SIGTERM'); } catch (e) {}
            }
            activeTerminalProcesses.clear();
          }
          broadcast('terminal_output', { data: '\n[Process stopped by user]\n' });
          break;
        }

        default:
          console.warn('Unknown WS message type:', type);
      }
    } catch (err) {
      console.error('Error handling WS message:', err);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected from WebSocket');
  });
});

import net from 'net';

export function isPortAvailable(port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', () => resolve(false))
      .once('listening', () => {
        tester.once('close', () => resolve(true)).close();
      })
      .listen(port);
  });
}

export async function startServer(desiredPort = PORT) {
  let portToUse = desiredPort;
  const isAvailable = await isPortAvailable(portToUse);
  if (!isAvailable) {
    console.warn(`⚠️ Port ${portToUse} in use, falling back to auto-assigned port...`);
    portToUse = 0;
  }

  return new Promise((resolve, reject) => {
    server.listen(portToUse, () => {
      const actualPort = server.address().port;
      console.log(`🚀 OpenRouter Agentic Studio Backend running at http://localhost:${actualPort}`);

      // Start watching the workspace only AFTER the server is accepting
      // connections, and give the UI a moment to load its bundle first. The
      // initial watcher scan is heavy I/O; doing it before this point delayed
      // the window and left the user staring at a blank screen.
      if (agentEngine.workspaceRoot) {
        setTimeout(() => setupFileWatcher(agentEngine.workspaceRoot), 2000);
      }

      resolve({ server, port: actualPort });
    }).on('error', reject);
  });
}

// Auto-run if executed as standalone node process
if (process.argv[1] && process.argv[1].endsWith('index.js')) {
  startServer(PORT).catch(err => {
    console.error('Failed to start server:', err);
  });
}
