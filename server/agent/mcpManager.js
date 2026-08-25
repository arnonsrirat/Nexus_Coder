import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { EventEmitter } from 'events';

const MCP_CONFIG_FILE = path.join(os.homedir(), '.nexuscoder-mcp.json');

// Standard Model Context Protocol version
const MCP_PROTOCOL_VERSION = '2024-11-05';

export const BUILTIN_MCP_TEMPLATES = [
  {
    id: 'tpl-filesystem',
    name: 'Filesystem MCP',
    description: 'Direct file read, write, search, and directory operations via official MCP filesystem server',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
    env: {},
    category: 'Files & Storage',
    icon: 'Folder'
  },
  {
    id: 'tpl-fetch',
    name: 'Web Fetch & Scraping MCP',
    description: 'Fetch web pages, extract markdown, and convert HTML to structured content',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-fetch'],
    env: {},
    category: 'Web & Search',
    icon: 'Globe'
  },
  {
    id: 'tpl-memory',
    name: 'Knowledge Graph Memory MCP',
    description: 'Persistent knowledge graph memory across agent sessions and projects',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
    env: {},
    category: 'Memory & State',
    icon: 'Brain'
  },
  {
    id: 'tpl-github',
    name: 'GitHub API MCP',
    description: 'Interact with GitHub repositories, issues, pull requests, and git refs',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    env: { GITHUB_PERSONAL_ACCESS_TOKEN: '' },
    category: 'Developer Tools',
    icon: 'Github'
  },
  {
    id: 'tpl-sqlite',
    name: 'SQLite Database MCP',
    description: 'Inspect schemas, run SQL queries, and manage local SQLite databases',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sqlite', '--db-path', './data.db'],
    env: {},
    category: 'Databases',
    icon: 'Database'
  },
  {
    id: 'tpl-puppeteer',
    name: 'Puppeteer Browser MCP',
    description: 'Automate browser navigation, take screenshots, and interact with web pages',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-puppeteer'],
    env: {},
    category: 'Web & Automation',
    icon: 'Chrome'
  }
];

class McpServerInstance extends EventEmitter {
  constructor(config, workspaceRoot = '') {
    super();
    this.id = config.id || `mcp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.name = config.name || 'MCP Server';
    this.description = config.description || '';
    this.type = config.type || 'stdio'; // 'stdio' | 'sse'
    this.command = config.command || 'npx';
    this.args = Array.isArray(config.args) ? config.args : [];
    this.env = config.env || {};
    this.url = config.url || '';
    this.enabled = config.enabled !== false;
    this.workspaceRoot = workspaceRoot;

    // Runtime state
    this.status = 'disconnected'; // 'connected' | 'connecting' | 'disconnected' | 'error'
    this.error = null;
    this.process = null;
    this.tools = [];
    this.resources = [];
    this.prompts = [];
    this.serverInfo = null;
    this.lastPing = null;
    this.latencyMs = null;

    // JSON-RPC message management
    this.requestId = 1;
    this.pendingRequests = new Map();
    this.buffer = '';
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      type: this.type,
      command: this.command,
      args: this.args,
      env: this.env,
      url: this.url,
      enabled: this.enabled,
      status: this.status,
      error: this.error,
      serverInfo: this.serverInfo,
      tools: this.tools,
      resources: this.resources,
      prompts: this.prompts,
      toolsCount: this.tools.length,
      latencyMs: this.latencyMs,
      lastPing: this.lastPing
    };
  }

  async connect(cwd = null) {
    if (this.status === 'connected' || this.status === 'connecting') {
      return;
    }

    const workingDir = cwd || this.workspaceRoot || process.cwd();
    this.status = 'connecting';
    this.error = null;
    this.emit('status_change', { status: this.status });

    if (this.type === 'stdio') {
      await this.connectStdio(workingDir);
    } else {
      this.status = 'error';
      this.error = 'SSE transport is currently only supported for stdio bridged endpoints.';
      this.emit('status_change', { status: this.status, error: this.error });
    }
  }

  connectStdio(workingDir) {
    return new Promise((resolve) => {
      try {
        const expandedArgs = this.args.map(arg => {
          if (arg === '.' && workingDir) return workingDir;
          return arg;
        });

        const mergedEnv = {
          ...process.env,
          ...this.env
        };

        const proc = spawn(this.command, expandedArgs, {
          cwd: workingDir,
          env: mergedEnv,
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: process.platform === 'win32'
        });

        this.process = proc;

        proc.stdout.on('data', (chunk) => {
          this.handleStdioData(chunk.toString('utf8'));
        });

        proc.stderr.on('data', (chunk) => {
          const errText = chunk.toString('utf8').trim();
          if (errText) {
            console.log(`[MCP ${this.name} stderr]:`, errText);
          }
        });

        proc.on('error', (err) => {
          console.error(`[MCP ${this.name}] Process spawn error:`, err);
          this.status = 'error';
          this.error = `Failed to start: ${err.message}`;
          this.emit('status_change', { status: this.status, error: this.error });
          resolve();
        });

        proc.on('close', (code) => {
          console.log(`[MCP ${this.name}] Process exited with code ${code}`);
          this.status = 'disconnected';
          this.process = null;
          this.tools = [];
          this.emit('status_change', { status: this.status });
        });

        // Perform MCP Handshake
        this.performHandshake()
          .then(() => {
            this.status = 'connected';
            this.error = null;
            this.emit('status_change', { status: this.status });
            resolve();
          })
          .catch((err) => {
            console.warn(`[MCP ${this.name}] Handshake warning:`, err.message);
            this.status = 'error';
            this.error = err.message;
            this.emit('status_change', { status: this.status, error: this.error });
            resolve();
          });

      } catch (err) {
        this.status = 'error';
        this.error = err.message;
        this.emit('status_change', { status: this.status, error: this.error });
        resolve();
      }
    });
  }

  handleStdioData(data) {
    this.buffer += data;
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const msg = JSON.parse(trimmed);
        this.handleJsonRpcMessage(msg);
      } catch (e) {
        // Not a JSON-RPC message (might be debug text)
      }
    }
  }

  handleJsonRpcMessage(msg) {
    if (msg.id && this.pendingRequests.has(msg.id)) {
      const { resolve, reject } = this.pendingRequests.get(msg.id);
      this.pendingRequests.delete(msg.id);

      if (msg.error) {
        reject(new Error(msg.error.message || JSON.stringify(msg.error)));
      } else {
        resolve(msg.result);
      }
    }
  }

  sendJsonRpcRequest(method, params = {}, timeoutMs = 20000) {
    return new Promise((resolve, reject) => {
      if (!this.process || !this.process.stdin.writable) {
        return reject(new Error(`MCP Server "${this.name}" is not running.`));
      }

      const id = this.requestId++;
      const payload = {
        jsonrpc: '2.0',
        id,
        method,
        params
      };

      const timer = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`MCP request "${method}" timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);

      this.pendingRequests.set(id, {
        resolve: (res) => { clearTimeout(timer); resolve(res); },
        reject: (err) => { clearTimeout(timer); reject(err); }
      });

      try {
        this.process.stdin.write(JSON.stringify(payload) + '\n');
      } catch (err) {
        clearTimeout(timer);
        this.pendingRequests.delete(id);
        reject(err);
      }
    });
  }

  sendJsonRpcNotification(method, params = {}) {
    if (!this.process || !this.process.stdin.writable) return;
    const payload = {
      jsonrpc: '2.0',
      method,
      params
    };
    try {
      this.process.stdin.write(JSON.stringify(payload) + '\n');
    } catch (e) {}
  }

  async performHandshake() {
    const start = Date.now();
    // 1. Initialize
    const initRes = await this.sendJsonRpcRequest('initialize', {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {
        tools: {},
        resources: {},
        prompts: {}
      },
      clientInfo: {
        name: 'NexusCoder Studio',
        version: '1.0.31'
      }
    }, 15000);

    this.serverInfo = initRes?.serverInfo || { name: this.name };
    this.latencyMs = Date.now() - start;
    this.lastPing = Date.now();

    // 2. Initialized Notification
    this.sendJsonRpcNotification('notifications/initialized', {});

    // 3. Discover Tools
    try {
      const toolsRes = await this.sendJsonRpcRequest('tools/list', {}, 8000);
      this.tools = Array.isArray(toolsRes?.tools) ? toolsRes.tools : [];
    } catch (e) {
      console.warn(`[MCP ${this.name}] Failed to list tools:`, e.message);
      this.tools = [];
    }

    // 4. Discover Resources
    try {
      const resRes = await this.sendJsonRpcRequest('resources/list', {}, 8000);
      this.resources = Array.isArray(resRes?.resources) ? resRes.resources : [];
    } catch (e) {
      this.resources = [];
    }

    // 5. Discover Prompts
    try {
      const pRes = await this.sendJsonRpcRequest('prompts/list', {}, 8000);
      this.prompts = Array.isArray(pRes?.prompts) ? pRes.prompts : [];
    } catch (e) {
      this.prompts = [];
    }
  }

  async callTool(name, args = {}) {
    if (this.status !== 'connected') {
      await this.connect();
    }
    const res = await this.sendJsonRpcRequest('tools/call', {
      name,
      arguments: args
    }, 45000);
    return res;
  }

  async ping() {
    if (this.status !== 'connected') return false;
    const start = Date.now();
    try {
      await this.sendJsonRpcRequest('ping', {}, 5000);
      this.latencyMs = Date.now() - start;
      this.lastPing = Date.now();
      return true;
    } catch (e) {
      // If ping is not implemented, check tools/list instead
      try {
        await this.sendJsonRpcRequest('tools/list', {}, 5000);
        this.latencyMs = Date.now() - start;
        this.lastPing = Date.now();
        return true;
      } catch (err) {
        return false;
      }
    }
  }

  disconnect() {
    this.status = 'disconnected';
    if (this.process) {
      try {
        this.process.kill('SIGTERM');
      } catch (e) {}
      this.process = null;
    }
    for (const [, { reject }] of this.pendingRequests) {
      reject(new Error('Server disconnected'));
    }
    this.pendingRequests.clear();
    this.tools = [];
    this.emit('status_change', { status: this.status });
  }
}

export class McpManager extends EventEmitter {
  constructor(workspaceRoot = '') {
    super();
    this.workspaceRoot = workspaceRoot;
    /** @type {Map<string, McpServerInstance>} */
    this.servers = new Map();
    this.loadConfig();
  }

  setWorkspace(workspaceRoot) {
    this.workspaceRoot = workspaceRoot;
    for (const server of this.servers.values()) {
      server.workspaceRoot = workspaceRoot;
    }
  }

  loadConfig() {
    try {
      if (fs.existsSync(MCP_CONFIG_FILE)) {
        const raw = fs.readFileSync(MCP_CONFIG_FILE, 'utf8');
        const data = JSON.parse(raw);
        if (Array.isArray(data.servers)) {
          for (const s of data.servers) {
            this.addOrUpdateServer(s, false);
          }
        }
      } else {
        // Initialize with default standard templates (disabled by default until user enables)
        const defaultServers = [
          {
            id: 'mcp-filesystem',
            name: 'Filesystem MCP',
            description: 'Workspace file reader & writer via standard MCP protocol',
            type: 'stdio',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
            enabled: false
          },
          {
            id: 'mcp-fetch',
            name: 'Web Fetch & Scrape MCP',
            description: 'Extract web content and convert HTML to markdown',
            type: 'stdio',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-fetch'],
            enabled: false
          },
          {
            id: 'mcp-memory',
            name: 'Knowledge Graph Memory MCP',
            description: 'Persistent memory across sessions',
            type: 'stdio',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-memory'],
            enabled: false
          }
        ];
        for (const s of defaultServers) {
          this.addOrUpdateServer(s, false);
        }
        this.saveConfig();
      }
    } catch (e) {
      console.warn('Could not load MCP config:', e.message);
    }
  }

  saveConfig() {
    try {
      const data = {
        servers: Array.from(this.servers.values()).map(s => ({
          id: s.id,
          name: s.name,
          description: s.description,
          type: s.type,
          command: s.command,
          args: s.args,
          env: s.env,
          url: s.url,
          enabled: s.enabled
        }))
      };
      fs.writeFileSync(MCP_CONFIG_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      console.warn('Could not save MCP config:', e.message);
    }
  }

  addOrUpdateServer(config, autoSave = true) {
    if (!config || !config.name) return null;
    const id = config.id || `mcp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (this.servers.has(id)) {
      const existing = this.servers.get(id);
      existing.name = config.name;
      existing.description = config.description || existing.description;
      existing.type = config.type || existing.type;
      existing.command = config.command || existing.command;
      existing.args = config.args || existing.args;
      existing.env = config.env || existing.env;
      existing.url = config.url || existing.url;
      existing.enabled = config.enabled !== undefined ? config.enabled : existing.enabled;
      if (autoSave) this.saveConfig();
      this.emitUpdate();
      return existing;
    }

    const instance = new McpServerInstance({ ...config, id }, this.workspaceRoot);
    instance.on('status_change', () => {
      this.emitUpdate();
    });

    this.servers.set(id, instance);
    if (autoSave) this.saveConfig();
    this.emitUpdate();
    return instance;
  }

  removeServer(id) {
    if (this.servers.has(id)) {
      const server = this.servers.get(id);
      server.disconnect();
      this.servers.delete(id);
      this.saveConfig();
      this.emitUpdate();
      return true;
    }
    return false;
  }

  async connectServer(id) {
    const server = this.servers.get(id);
    if (!server) throw new Error(`MCP Server "${id}" not found.`);
    server.enabled = true;
    this.saveConfig();
    await server.connect(this.workspaceRoot);
    this.emitUpdate();
    return server.toJSON();
  }

  async disconnectServer(id) {
    const server = this.servers.get(id);
    if (!server) throw new Error(`MCP Server "${id}" not found.`);
    server.enabled = false;
    server.disconnect();
    this.saveConfig();
    this.emitUpdate();
    return server.toJSON();
  }

  async autoConnectEnabled() {
    const enabledServers = Array.from(this.servers.values()).filter(s => s.enabled);
    for (const server of enabledServers) {
      server.connect(this.workspaceRoot).catch(e => {
        console.warn(`[MCP AutoConnect] ${server.name} failed:`, e.message);
      });
    }
  }

  emitUpdate() {
    this.emit('servers_updated', this.getServersStatus());
  }

  getServersStatus() {
    const serverList = Array.from(this.servers.values()).map(s => s.toJSON());
    const connectedCount = serverList.filter(s => s.status === 'connected').length;
    const totalToolsCount = serverList.reduce((sum, s) => sum + (s.tools?.length || 0), 0);

    return {
      servers: serverList,
      summary: {
        totalServers: serverList.length,
        connectedCount,
        totalToolsCount,
        hasConnected: connectedCount > 0
      }
    };
  }

  /**
   * Convert all tools from connected MCP servers to OpenAI / OpenRouter function calling schemas
   */
  getOpenAiTools() {
    const tools = [];
    for (const server of this.servers.values()) {
      if (server.status !== 'connected' || !Array.isArray(server.tools)) continue;

      for (const mcpTool of server.tools) {
        const toolName = `mcp__${server.id}__${mcpTool.name}`;
        const description = `[MCP: ${server.name}] ${mcpTool.description || 'Custom MCP Tool'}`;
        
        tools.push({
          type: 'function',
          function: {
            name: toolName,
            description,
            parameters: mcpTool.inputSchema || {
              type: 'object',
              properties: {}
            }
          }
        });
      }
    }
    return tools;
  }

  /**
   * Dispatch tool execution if toolName is an MCP tool
   */
  async executeTool(toolName, args) {
    if (!toolName.startsWith('mcp__')) return null;

    const parts = toolName.split('__');
    if (parts.length < 3) throw new Error(`Invalid MCP tool identifier: ${toolName}`);

    const serverId = parts[1];
    const actualToolName = parts.slice(2).join('__');

    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`MCP Server with ID "${serverId}" is not configured.`);
    }
    if (server.status !== 'connected') {
      await server.connect(this.workspaceRoot);
    }

    const result = await server.callTool(actualToolName, args);
    return {
      status: 'success',
      server: server.name,
      tool: actualToolName,
      result
    };
  }
}
