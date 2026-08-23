import fs from 'fs';
import path from 'path';

const IGNORED_NAMES = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.cache',
  '__pycache__',
  '.venv',
  'venv',
  '.idea',
  '.vscode',
  'coverage',
  '.DS_Store',
  'package-lock.json'
]);

export function generateRepoMap(workspaceRoot, maxDepth = 4, maxFiles = 100) {
  if (!workspaceRoot || !fs.existsSync(workspaceRoot)) {
    return 'No workspace folder open.';
  }

  let totalFiles = 0;

  function buildTree(currentPath, depth = 0) {
    if (depth > maxDepth || totalFiles > maxFiles) {
      return depth > maxDepth ? '  ... (more subdirectories)' : '';
    }

    let entries;
    try {
      entries = fs.readdirSync(currentPath, { withFileTypes: true });
    } catch (e) {
      return '';
    }

    // Sort folders first, then files
    entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    const lines = [];
    const indent = '  '.repeat(depth);

    for (const entry of entries) {
      if (IGNORED_NAMES.has(entry.name) || entry.name.startsWith('.')) continue;

      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        lines.push(`${indent}📁 ${entry.name}/`);
        const sub = buildTree(fullPath, depth + 1);
        if (sub) lines.push(sub);
      } else {
        totalFiles++;
        lines.push(`${indent}📄 ${entry.name}`);
      }

      if (totalFiles > maxFiles) {
        lines.push(`${indent}  ... (more files truncated)`);
        break;
      }
    }

    return lines.join('\n');
  }

  const rootName = path.basename(workspaceRoot);
  const tree = buildTree(workspaceRoot, 0);
  return `Workspace: ${rootName} (${workspaceRoot})\n${tree || '(Empty project folder)'}`;
}
