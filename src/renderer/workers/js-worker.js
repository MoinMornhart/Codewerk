/* Runs one piece of learner JavaScript. console.* and prompt() are redirected to the app. */
'use strict';

const AsyncFunction = (async () => {}).constructor;

function format(value) {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.stack || String(value);
  if (typeof value === 'undefined') return 'undefined';
  if (typeof value === 'function') return value.toString();
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function splitLines(text) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

self.onmessage = async (event) => {
  const { code, stdin } = event.data;
  const lines = splitLines(stdin);
  const post = (stream, text) => self.postMessage({ type: 'out', stream, text });
  const printer = (stream) => (...args) => post(stream, args.map(format).join(' ') + '\n');

  const learnerConsole = {
    log: printer('stdout'),
    info: printer('stdout'),
    debug: printer('stdout'),
    table: printer('stdout'),
    warn: printer('stderr'),
    error: printer('stderr'),
  };
  const learnerPrompt = (message) => {
    if (message !== undefined) post('stdout', String(message));
    const line = lines.length ? lines.shift() : null;
    if (line !== null) post('stdin', line + '\n');
    return line;
  };

  try {
    // Passing console/prompt as parameters shadows the worker globals for the learner code.
    await new AsyncFunction('console', 'prompt', 'alert', code)(learnerConsole, learnerPrompt, printer('stdout'));
  } catch (err) {
    post('stderr', (err && err.name ? `${err.name}: ${err.message}` : String(err)) + '\n');
  }
  self.postMessage({ type: 'done' });
};
