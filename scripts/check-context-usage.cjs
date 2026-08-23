#!/usr/bin/env node
// Guards against the class of bug where a component references a value from
// AppContext (e.g. `workspaceRoot`) without destructuring it from useApp().
// Such a reference throws a ReferenceError during render and blanks the whole
// app, so it is worth catching mechanically rather than by eye.
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'client', 'src');
const contextFile = path.join(srcDir, 'context', 'AppContext.jsx');

// Collect the keys the context actually provides.
const contextSrc = fs.readFileSync(contextFile, 'utf8');
const valueBlock = contextSrc.slice(contextSrc.indexOf('const value = {'));
const providedKeys = new Set(
  [...valueBlock.matchAll(/^\s{4}([A-Za-z_$][\w$]*),/gm)].map(m => m[1])
);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.jsx?$/.test(entry.name)) files.push(full);
  }
  return files;
}

let problems = 0;

for (const file of walk(srcDir)) {
  if (file === contextFile) continue;
  const src = fs.readFileSync(file, 'utf8');
  if (!src.includes('useApp()')) continue;

  // Everything this file pulls out of the context, across all useApp() calls.
  const destructured = new Set();
  for (const m of src.matchAll(/const\s*\{([^}]*)\}\s*=\s*useApp\(\)/g)) {
    for (const raw of m[1].split(',')) {
      const name = raw.split(':').pop().trim();
      if (name) destructured.add(name);
    }
  }

  // Names declared locally in this file are fine.
  const localDecls = new Set(
    [...src.matchAll(/(?:const|let|var|function)\s+([A-Za-z_$][\w$]*)/g)].map(m => m[1])
  );
  for (const m of src.matchAll(/const\s*\[\s*([A-Za-z_$][\w$]*)\s*,\s*([A-Za-z_$][\w$]*)\s*\]/g)) {
    localDecls.add(m[1]);
    localDecls.add(m[2]);
  }
  for (const m of src.matchAll(/import\s+(?:\*\s+as\s+)?([A-Za-z_$][\w$]*)/g)) localDecls.add(m[1]);
  for (const m of src.matchAll(/\{\s*([^}]*)\s*\}\s*(?:=|from)/g)) {
    for (const raw of m[1].split(',')) {
      const name = raw.split(':').pop().trim().split(/\s+as\s+/).pop();
      if (name) localDecls.add(name);
    }
  }
  for (const m of src.matchAll(/function\s*[\w$]*\s*\(([^)]*)\)/g)) {
    for (const raw of m[1].split(',')) {
      const name = raw.split(/[:=]/)[0].trim().replace(/[{}]/g, '');
      if (name) localDecls.add(name);
    }
  }

  for (const key of providedKeys) {
    if (destructured.has(key) || localDecls.has(key)) continue;
    // Match the bare identifier only: not a property access like `data.model`,
    // and not an object-literal key like `{ autoApprove: true }`.
    const pattern = new RegExp(`(^|[^.\\w$'"\`])${key}\\b(?!\\s*:)`, 'm');
    if (pattern.test(src)) {
      problems++;
      const line = src.split('\n').findIndex(l => pattern.test(l)) + 1;
      console.error(
        `${path.relative(path.join(__dirname, '..'), file)}:${line} ` +
        `uses "${key}" from AppContext but never destructures it from useApp()`
      );
    }
  }
}

if (problems) {
  console.error(`\n${problems} missing context binding(s) - these throw at render time.`);
  process.exit(1);
}
console.log('Context bindings OK.');
