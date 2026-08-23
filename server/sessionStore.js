import fs from 'fs';
import path from 'path';
import os from 'os';

const SESSIONS_DIR = path.join(os.homedir(), '.nexuscoder-chats');

export class SessionStore {
  constructor() {
    this.ensureDir();
  }

  ensureDir() {
    try {
      if (!fs.existsSync(SESSIONS_DIR)) {
        fs.mkdirSync(SESSIONS_DIR, { recursive: true });
      }
    } catch (e) {
      console.warn('Could not create sessions directory:', e.message);
    }
  }

  listSessions() {
    this.ensureDir();
    try {
      const files = fs.readdirSync(SESSIONS_DIR);
      const sessions = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        try {
          const raw = fs.readFileSync(path.join(SESSIONS_DIR, file), 'utf8');
          const data = JSON.parse(raw);
          sessions.push({
            id: data.id || file.replace('.json', ''),
            title: data.title || 'Untitled Conversation',
            createdAt: data.createdAt || Date.now(),
            updatedAt: data.updatedAt || Date.now(),
            messageCount: data.messages ? data.messages.length : 0,
            model: data.model || '',
            mode: data.mode || 'agent'
          });
        } catch (e) {}
      }

      sessions.sort((a, b) => b.updatedAt - a.updatedAt);
      return sessions;
    } catch (e) {
      console.error('Error listing sessions:', e);
      return [];
    }
  }

  getSession(id) {
    this.ensureDir();
    const filePath = path.join(SESSIONS_DIR, `${id}.json`);
    if (!fs.existsSync(filePath)) return null;

    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw);
    } catch (e) {
      console.error(`Error loading session ${id}:`, e);
      return null;
    }
  }

  saveSession(session) {
    if (!session || !session.id) return;
    this.ensureDir();
    const filePath = path.join(SESSIONS_DIR, `${session.id}.json`);
    try {
      session.updatedAt = Date.now();
      fs.writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf8');
    } catch (e) {
      console.error(`Error saving session ${session.id}:`, e);
    }
  }

  deleteSession(id) {
    this.ensureDir();
    const filePath = path.join(SESSIONS_DIR, `${id}.json`);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        return true;
      } catch (e) {
        console.error(`Error deleting session ${id}:`, e);
        return false;
      }
    }
    return false;
  }

  createSession(initialData = {}) {
    const id = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const session = {
      id,
      title: initialData.title || 'New Conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: initialData.model || 'anthropic/claude-3.7-sonnet',
      mode: initialData.mode || 'agent',
      messages: initialData.messages || [],
      activePlan: null,
      activeCanvas: null
    };

    this.saveSession(session);
    return session;
  }
}
