'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT = path.join(ROOT, '.vercel', 'output');
const STATIC = path.join(OUT, 'static');

const SKIP_DIRS = new Set([
  '.git',
  '.github',
  '.vercel',
  '.devcontainer',
  'node_modules',
  'scripts',
]);

const SKIP_FILES = new Set([
  'package.json',
  'package-lock.json',
  'vercel.json',
  '.gitignore',
  'requirements.txt',
]);

const SKIP_EXT = new Set(['.py', '.ipynb', '.pth', '.pyc']);

function shouldSkip(name, isDir) {
  if (name === '.well-known') return false;
  if (name.startsWith('.')) return true;
  if (isDir) return SKIP_DIRS.has(name);
  if (SKIP_FILES.has(name)) return true;
  return SKIP_EXT.has(path.extname(name).toLowerCase());
}

function copyTree(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    if (shouldSkip(ent.name, ent.isDirectory())) continue;
    const from = path.join(src, ent.name);
    const to = path.join(dest, ent.name);
    if (ent.isDirectory()) copyTree(from, to);
    else fs.copyFileSync(from, to);
  }
}

fs.rmSync(OUT, { recursive: true, force: true });
copyTree(ROOT, STATIC);

const indexPath = path.join(STATIC, 'index.html');
if (!fs.existsSync(indexPath)) {
  console.error('vercel-build: missing index.html in static output');
  process.exit(1);
}

const grokFunc = path.join(OUT, 'functions', 'api', 'grok.func');
fs.mkdirSync(grokFunc, { recursive: true });
fs.copyFileSync(
  path.join(ROOT, 'scripts', 'grok-handler.js'),
  path.join(grokFunc, 'index.js')
);
fs.writeFileSync(
  path.join(grokFunc, '.vc-config.json'),
  JSON.stringify({
    runtime: 'nodejs22.x',
    handler: 'index.js',
    launcherType: 'Nodejs',
    shouldAddHelpers: true,
    maxDuration: 30,
  }, null, 2) + '\n'
);

const waitlistFunc = path.join(OUT, 'functions', 'api', 'waitlist.func');
fs.mkdirSync(waitlistFunc, { recursive: true });
fs.copyFileSync(
  path.join(ROOT, 'scripts', 'waitlist-handler.js'),
  path.join(waitlistFunc, 'index.js')
);
fs.writeFileSync(
  path.join(waitlistFunc, '.vc-config.json'),
  JSON.stringify({
    runtime: 'nodejs22.x',
    handler: 'index.js',
    launcherType: 'Nodejs',
    shouldAddHelpers: true,
    maxDuration: 15,
  }, null, 2) + '\n'
);

fs.writeFileSync(
  path.join(OUT, 'config.json'),
  JSON.stringify({
    version: 3,
    // Tägliche Löschfristen-Prüfung (Datenschutz), 03:17 UTC; Vercel sendet Authorization: Bearer CRON_SECRET
    crons: [{ path: '/api/waitlist?admin=retention', schedule: '17 3 * * *' }],
    routes: [
      { src: '^/api/grok$', dest: '/api/grok' },
      { src: '^/api/waitlist$', dest: '/api/waitlist' },
      { handle: 'filesystem' },
    ],
  }, null, 2) + '\n'
);

console.log('vercel-build: wrote static files /api/grok and /api/waitlist to .vercel/output');
