/* Runs learner Python code with Pyodide inside a module Web Worker
   (current Pyodide versions no longer support classic workers).
   The worker stays alive between runs so Pyodide only loads once. */

let pyodide = null;
let stdinLines = [];
const outDecoder = new TextDecoder();
const errDecoder = new TextDecoder();

function post(stream, text) {
  if (text) self.postMessage({ type: 'out', stream, text });
}

function splitLines(text) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

// Pyodide tracebacks start inside its own runner; keep only the learner's frames.
function cleanTraceback(message) {
  const text = String(message || '');
  const lines = text.split('\n');
  const first = lines.findIndex((line) => line.includes('File "<exec>"'));
  if (first === -1) return text;
  const head = text.startsWith('Traceback') ? 'Traceback (most recent call last):\n' : '';
  return head + lines.slice(first).join('\n');
}

async function init(indexURL) {
  const { loadPyodide } = await import(`${indexURL}pyodide.mjs`);
  pyodide = await loadPyodide({ indexURL });
  pyodide.setStdout({
    write: (buffer) => {
      post('stdout', outDecoder.decode(buffer, { stream: true }));
      return buffer.length;
    },
  });
  pyodide.setStderr({
    write: (buffer) => {
      post('stderr', errDecoder.decode(buffer, { stream: true }));
      return buffer.length;
    },
  });
  pyodide.setStdin({
    // Without autoEOF every returned line would be followed by an EOF,
    // so a second input() call would fail.
    autoEOF: false,
    stdin: () => {
      if (!stdinLines.length) return null; // EOF → input() raises EOFError
      const line = stdinLines.shift();
      post('stdin', line + '\n'); // echo like a terminal would
      return line + '\n';
    },
  });
}

async function run(code, stdin) {
  stdinLines = splitLines(stdin);
  const globals = pyodide.globals.get('dict')();
  globals.set('__name__', '__main__');
  try {
    await pyodide.runPythonAsync(code, { globals });
  } catch (err) {
    post('stderr', cleanTraceback(err && err.message ? err.message : err).replace(/\s*$/, '\n'));
  } finally {
    globals.destroy();
    try {
      pyodide.runPython('import sys\nsys.stdout.flush()\nsys.stderr.flush()');
    } catch {
      // ignore flush problems
    }
  }
}

self.onmessage = async (event) => {
  const msg = event.data;
  if (msg.type === 'init') {
    try {
      await init(msg.indexURL);
      self.postMessage({ type: 'ready' });
    } catch (err) {
      self.postMessage({ type: 'load-error', message: String(err && err.message ? err.message : err) });
    }
  } else if (msg.type === 'run') {
    await run(msg.code, msg.stdin);
    self.postMessage({ type: 'done' });
  }
};
