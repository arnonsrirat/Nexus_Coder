#!/usr/bin/env node
// Bumps the patch version in the root, client, and server package.json files
// together so every build (npm run build:exe) ships as a distinct version.
const fs = require('fs');
const path = require('path');

const targets = [
  path.join(__dirname, '..', 'package.json'),
  path.join(__dirname, '..', 'client', 'package.json'),
  path.join(__dirname, '..', 'server', 'package.json')
];

function bumpPatch(version) {
  const parts = String(version || '1.0.0').split('.').map(n => parseInt(n, 10) || 0);
  while (parts.length < 3) parts.push(0);
  parts[2] += 1;
  return parts.join('.');
}

const rootPkgPath = targets[0];
const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
const newVersion = bumpPatch(rootPkg.version);

for (const file of targets) {
  if (!fs.existsSync(file)) continue;
  const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
  pkg.version = newVersion;
  fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
}

console.log(`Version bumped -> ${newVersion}`);
