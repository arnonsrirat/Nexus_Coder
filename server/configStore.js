import fs from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_FILE = path.join(os.homedir(), '.nexuscoder-config.json');

export class ConfigStore {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    this.model = 'anthropic/claude-3.7-sonnet';
    this.autoApprove = false;
    this.workspaceRoot = '';
    this.recentWorkspaces = [];
    this.updateRepo = 'arnonsrirat/Nexus_Coder';
    this.autoCheckUpdates = true;
    this.theme = 'default';
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
        const data = JSON.parse(raw);
        if (data.apiKey) this.apiKey = data.apiKey;
        if (data.model) this.model = data.model;
        if (data.autoApprove !== undefined) this.autoApprove = data.autoApprove;
        if (data.workspaceRoot) this.workspaceRoot = data.workspaceRoot;
        if (Array.isArray(data.recentWorkspaces)) this.recentWorkspaces = data.recentWorkspaces;
        if (data.updateRepo !== undefined) this.updateRepo = data.updateRepo;
        if (data.autoCheckUpdates !== undefined) this.autoCheckUpdates = data.autoCheckUpdates;
        if (data.theme !== undefined) this.theme = data.theme;
      }
    } catch (e) {
      console.warn('Could not load config file:', e.message);
    }
  }

  save() {
    try {
      const data = {
        apiKey: this.apiKey,
        model: this.model,
        autoApprove: this.autoApprove,
        workspaceRoot: this.workspaceRoot,
        recentWorkspaces: this.recentWorkspaces.slice(0, 10),
        updateRepo: this.updateRepo,
        autoCheckUpdates: this.autoCheckUpdates,
        theme: this.theme
      };
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      console.warn('Could not save config file:', e.message);
    }
  }

  addRecentWorkspace(dir) {
    if (!dir) return;
    this.workspaceRoot = dir;
    this.recentWorkspaces = [dir, ...this.recentWorkspaces.filter(p => p !== dir)].slice(0, 8);
    this.save();
  }

  getPublicConfig() {
    return {
      model: this.model,
      autoApprove: this.autoApprove,
      workspaceRoot: this.workspaceRoot,
      hasApiKey: !!this.apiKey,
      recentWorkspaces: this.recentWorkspaces,
      updateRepo: this.updateRepo,
      autoCheckUpdates: this.autoCheckUpdates,
      theme: this.theme
    };
  }
}
