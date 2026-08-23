#!/usr/bin/env node
// The Windows build produces a single portable binary that behaves two ways:
// launched as "NexusCoder Setup <version>.exe" it opens the in-app setup UI,
// launched under any other name it just runs the studio. Ship both names by
// copying the signed artifact - the copy keeps its signature because the bytes
// are identical.
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist-exe');
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const version = pkg.version;

const setupExe = path.join(distDir, `NexusCoder Setup ${version}.exe`);
const portableExe = path.join(distDir, `NexusCoder ${version}.exe`);

if (!fs.existsSync(setupExe)) {
  console.error(`✖ Expected installer not found: ${setupExe}`);
  process.exit(1);
}

fs.copyFileSync(setupExe, portableExe);

const mb = (file) => `${(fs.statSync(file).size / (1024 * 1024)).toFixed(1)} MB`;

console.log('📦 Release artifacts ready:');
console.log(`   • Installer : ${path.basename(setupExe)}  (${mb(setupExe)})`);
console.log(`   • Portable  : ${path.basename(portableExe)}  (${mb(portableExe)})`);
