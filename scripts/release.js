#!/usr/bin/env node
'use strict';

// Publishes the current version: pushes commits and tags, builds the Windows installer
// and uploads it as a GitHub release. Installed apps pick it up through auto-update.
// Run `npm run bump -- …` first so the version commit and tag exist.
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

const { version } = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const tag = `v${version}`;

if (git(['status', '--porcelain'])) fail('Es gibt nicht committete Änderungen. Erst `npm run bump -- …` ausführen.');
if (!git(['tag', '--points-at', 'HEAD']).split(/\s+/).includes(tag)) {
  fail(`Der aktuelle Commit hat nicht den Tag ${tag}. Erst \`npm run bump -- …\` ausführen.`);
}

let token = process.env.GH_TOKEN;
if (!token) {
  try {
    token = execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim();
  } catch {
    fail('Kein GitHub-Token gefunden. `gh auth login` ausführen oder GH_TOKEN setzen.');
  }
}

console.log(`→ Push von main und ${tag} …`);
execFileSync('git', ['push', 'origin', 'HEAD', '--follow-tags'], { cwd: ROOT, stdio: 'inherit' });

console.log(`→ Baue und veröffentliche Codewerk ${version} …`);
const cli = path.join(ROOT, 'node_modules', 'electron-builder', 'cli.js');
const result = spawnSync(process.execPath, [cli, '--win', '--publish', 'always'], {
  cwd: ROOT,
  stdio: 'inherit',
  env: { ...process.env, GH_TOKEN: token },
});
if (result.status !== 0) fail('electron-builder ist fehlgeschlagen.');
console.log(`✓ Release ${tag} veröffentlicht.`);
