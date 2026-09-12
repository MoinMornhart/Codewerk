'use strict';

// Runs Java, C# and C++ exercises with compilers installed on this PC.
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const TOOLS = {
  java: { tool: 'Java (JDK)', commands: ['java'], hint: 'winget install Microsoft.OpenJDK.21' },
  csharp: { tool: '.NET SDK', commands: ['dotnet'], hint: 'winget install Microsoft.DotNet.SDK.10' },
  cpp: { tool: 'C++ (g++)', commands: ['g++', 'clang++'], hint: 'winget install BrechtSanders.WinLibs.POSIX.UCRT' },
};
const OUTPUT_LIMIT = 200 * 1024;

let found = null; // lang → command name or null

function which(command) {
  const finder = process.platform === 'win32' ? 'where' : 'which';
  const result = spawnSync(finder, [command], { encoding: 'utf8', windowsHide: true });
  return result.status === 0 && result.stdout.trim() ? command : null;
}

function detect(refresh = false) {
  if (!found || refresh) {
    found = {};
    for (const [lang, spec] of Object.entries(TOOLS)) {
      found[lang] = spec.commands.map(which).find(Boolean) || null;
    }
  }
  return Object.fromEntries(Object.entries(found).map(([lang, cmd]) => [lang, Boolean(cmd)]));
}

function kill(child) {
  if (process.platform === 'win32' && child.pid) {
    // /T also ends child processes (e.g. the program started by `dotnet run`).
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true });
  } else {
    child.kill('SIGKILL');
  }
}

function runProcess(command, args, { cwd, input = '', timeoutMs, env = {} }) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let settled = false;
    const child = spawn(command, args, { cwd, env: { ...process.env, ...env }, windowsHide: true });
    const timer = setTimeout(() => {
      timedOut = true;
      kill(child);
    }, timeoutMs);
    const append = (current, chunk) => (current.length < OUTPUT_LIMIT ? current + chunk.toString('utf8') : current);
    const finish = (code, extra = '') => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ stdout, stderr: stderr + extra, code, timedOut });
    };
    child.stdout.on('data', (chunk) => { stdout = append(stdout, chunk); });
    child.stderr.on('data', (chunk) => { stderr = append(stderr, chunk); });
    child.on('error', (err) => finish(-1, err.message));
    child.on('close', (code) => finish(code));
    child.stdin.on('error', () => {});
    child.stdin.end(input);
  });
}

async function run(lang, code, input) {
  const spec = TOOLS[lang];
  if (!spec) return { stdout: '', stderr: `Unbekannte Sprache: ${lang}`, code: -1, timedOut: false };
  detect();
  const command = found[lang];
  if (!command) {
    return { stdout: '', stderr: '', code: -1, timedOut: false, missing: { tool: spec.tool, hint: spec.hint } };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'codewerk-run-'));
  try {
    if (lang === 'java') {
      fs.writeFileSync(path.join(dir, 'Main.java'), code);
      return await runProcess(command, ['-Dstdout.encoding=UTF-8', '-Dstderr.encoding=UTF-8', 'Main.java'], {
        cwd: dir, input, timeoutMs: 30000,
      });
    }
    if (lang === 'csharp') {
      fs.writeFileSync(path.join(dir, 'Program.cs'), code);
      return await runProcess(command, ['run', 'Program.cs'], {
        cwd: dir, input, timeoutMs: 90000, env: { DOTNET_NOLOGO: '1', DOTNET_CLI_TELEMETRY_OPTOUT: '1' },
      });
    }
    // C++: compile first, then run the binary with its own, shorter time limit.
    fs.writeFileSync(path.join(dir, 'main.cpp'), code);
    const exe = path.join(dir, process.platform === 'win32' ? 'main.exe' : 'main');
    const build = await runProcess(command, ['-std=c++17', '-Wall', '-o', exe, 'main.cpp'], { cwd: dir, timeoutMs: 60000 });
    if (build.code !== 0 || build.timedOut) return build;
    const result = await runProcess(exe, [], { cwd: dir, input, timeoutMs: 10000 });
    return { ...result, stderr: build.stderr + result.stderr };
  } finally {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // a killed process may still hold the file for a moment – the OS cleans temp later
    }
  }
}

module.exports = { detect, run, TOOLS };
