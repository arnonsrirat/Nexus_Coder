const API_BASE = '/api';

// Every request gets a hard timeout so a stalled backend/network call can
// never leave the UI stuck on a spinner forever.
function fetch(input, init = {}) {
  return window.fetch(input, { ...init, signal: init.signal || AbortSignal.timeout(15000) });
}

export async function fetchConfig() {
  const res = await fetch(`${API_BASE}/config`);
  if (!res.ok) throw new Error('Failed to fetch config');
  return res.json();
}

export async function saveConfig(config) {
  const res = await fetch(`${API_BASE}/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  if (!res.ok) throw new Error('Failed to save config');
  return res.json();
}

export async function fetchModels() {
  const res = await fetch(`${API_BASE}/models`);
  if (!res.ok) throw new Error('Failed to fetch models');
  return res.json();
}

export async function setWorkspaceFolder(folderPath) {
  const res = await fetch(`${API_BASE}/workspace/set`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folderPath })
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to set workspace');
  }
  return res.json();
}

export async function fetchWorkspaceTree() {
  const res = await fetch(`${API_BASE}/workspace/tree`);
  if (!res.ok) throw new Error('Failed to fetch workspace tree');
  return res.json();
}

export async function fetchFileContent(filePath) {
  const res = await fetch(`${API_BASE}/workspace/file?path=${encodeURIComponent(filePath)}`);
  if (!res.ok) throw new Error('Failed to fetch file');
  return res.json();
}

export async function saveFileContent(filePath, content) {
  const res = await fetch(`${API_BASE}/workspace/save-file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: filePath, content })
  });
  if (!res.ok) throw new Error('Failed to save file');
  return res.json();
}

export async function browseFilesystem(currentPath = '', drives = false) {
  const query = drives ? 'drives=true' : `path=${encodeURIComponent(currentPath)}`;
  const res = await fetch(`${API_BASE}/filesystem/browse?${query}`);
  if (!res.ok) throw new Error('Failed to browse directory');
  return res.json();
}

export async function fetchChats() {
  const res = await fetch(`${API_BASE}/chats`);
  if (!res.ok) throw new Error('Failed to fetch chats');
  return res.json();
}

export async function fetchChatById(id) {
  const res = await fetch(`${API_BASE}/chats/${id}`);
  if (!res.ok) throw new Error('Failed to fetch chat');
  return res.json();
}

export async function createChat(data = {}) {
  const res = await fetch(`${API_BASE}/chats/new`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create chat');
  return res.json();
}

export async function branchChat(baseChatId = null) {
  const res = await fetch(`${API_BASE}/chats/branch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ baseChatId })
  });
  if (!res.ok) throw new Error('Failed to branch chat');
  return res.json();
}

export async function compactContext() {
  const res = await fetch(`${API_BASE}/chats/compact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error('Failed to compact context');
  return res.json();
}

export async function fetchContextStats() {
  const res = await fetch(`${API_BASE}/chats/context-stats`);
  if (!res.ok) throw new Error('Failed to fetch context stats');
  return res.json();
}

export async function renameChat(id, title) {
  const res = await fetch(`${API_BASE}/chats/${id}/rename`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  });
  if (!res.ok) throw new Error('Failed to rename chat');
  return res.json();
}

export async function deleteChat(id) {
  const res = await fetch(`${API_BASE}/chats/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete chat');
  return res.json();
}

export async function fetchGitDiff() {
  const res = await fetch(`${API_BASE}/workspace/git-diff`);
  if (!res.ok) return { isGit: false, diff: '' };
  return res.json();
}

// App Auto-Updater APIs
export async function fetchUpdateStatus() {
  const res = await fetch(`${API_BASE}/updater/status`);
  if (!res.ok) throw new Error('Failed to fetch updater status');
  return res.json();
}

export async function checkUpdates(repo = null) {
  const query = repo ? `?repo=${encodeURIComponent(repo)}` : '';
  const res = await fetch(`${API_BASE}/updater/check${query}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to check for updates');
  }
  return res.json();
}

export async function downloadUpdate() {
  const res = await fetch(`${API_BASE}/updater/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to start download');
  }
  return res.json();
}

export async function applyUpdate() {
  const res = await fetch(`${API_BASE}/updater/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to apply update');
  }
  return res.json();
}

export async function cleanUpdateCache() {
  const res = await fetch(`${API_BASE}/updater/clean-cache`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to clean update cache');
  }
  return res.json();
}


