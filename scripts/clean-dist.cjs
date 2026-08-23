#!/usr/bin/env node
// Wipes previous build artifacts so only the freshly built version remains in
// dist-exe. This also clears the leftover win-unpacked / win-unpacked.tmp
// folders that otherwise make electron-builder fail with EPERM on Windows.
const fs = require('fs');
const path = require('path');

const distExe = path.join(__dirname, '..', 'dist-exe');

if (!fs.existsSync(distExe)) {
  console.log('dist-exe is already clean.');
  process.exit(0);
}

let removed = 0;
let failed = 0;

for (const entry of fs.readdirSync(distExe)) {
  const target = path.join(distExe, entry);
  try {
    fs.rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    removed++;
  } catch (err) {
    failed++;
    console.warn(`Could not remove ${entry}: ${err.message}`);
    console.warn('  -> Close NexusCoder if it is still running, then rebuild.');
  }
}

console.log(`Cleaned dist-exe (${removed} removed${failed ? `, ${failed} failed` : ''}).`);
if (failed) process.exit(1);
