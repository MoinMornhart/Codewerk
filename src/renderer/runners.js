/* Runs learner code for the built-in runtimes (JavaScript, Python) in Web Workers.
   Java, C# and C++ run in the main process (see src/main/runner.js). */
(function (root) {
  'use strict';

  const DEFAULT_TIMEOUT = { javascript: 5000, python: 20000 };
  let pyodideURL = null;
  let py = null; // { worker, ready, loaded }

  function configure(options) {
    pyodideURL = options.pyodideURL;
  }

  function collector(onOutput) {
    const chunks = [];
    return {
      chunks,
      push(stream, text) {
        chunks.push({ stream, text });
        if (onOutput) onOutput(stream, text);
      },
    };
  }

  function finish(c, extra) {
    return Object.assign(
      { chunks: c.chunks, text: c.chunks.map((x) => x.text).join(''), timedOut: false, error: false },
      extra,
    );
  }

  function runJs(code, stdin, opts) {
    return new Promise((resolve) => {
      // A fresh worker per run: no state leaks between runs, and terminate() stops endless loops.
      const worker = new Worker('workers/js-worker.js');
      const c = collector(opts.onOutput);
      const timer = setTimeout(() => {
        worker.terminate();
        resolve(finish(c, { timedOut: true }));
      }, opts.timeoutMs || DEFAULT_TIMEOUT.javascript);
      worker.onmessage = (event) => {
        const msg = event.data;
        if (msg.type === 'out') c.push(msg.stream, msg.text);
        else if (msg.type === 'done') {
          clearTimeout(timer);
          worker.terminate();
          resolve(finish(c, {}));
        }
      };
      worker.onerror = (event) => {
        clearTimeout(timer);
        worker.terminate();
        c.push('stderr', (event.message || 'Worker error') + '\n');
        resolve(finish(c, { error: true }));
      };
      worker.postMessage({ code, stdin });
    });
  }

  function startPython() {
    const worker = new Worker('workers/py-worker.js', { type: 'module' });
    const ready = new Promise((resolve, reject) => {
      worker.onmessage = (event) => {
        if (event.data.type === 'ready') resolve();
        else if (event.data.type === 'load-error') reject(new Error(event.data.message));
      };
      worker.onerror = (event) => reject(new Error(event.message || 'Worker error'));
    });
    ready.catch(() => {}); // handled in runPython
    worker.postMessage({ type: 'init', indexURL: pyodideURL });
    py = { worker, ready, loaded: false };
    return py;
  }

  async function runPython(code, stdin, opts) {
    const current = py || startPython();
    const c = collector(opts.onOutput);
    try {
      await current.ready;
      current.loaded = true;
    } catch (err) {
      if (py === current) py = null;
      c.push('stderr', `Python konnte nicht geladen werden / could not be loaded: ${err.message}\n`);
      return finish(c, { error: true });
    }
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        // Killing the worker is the only way to stop an endless loop; it reloads on the next run.
        current.worker.terminate();
        if (py === current) py = null;
        resolve(finish(c, { timedOut: true }));
      }, opts.timeoutMs || DEFAULT_TIMEOUT.python);
      current.worker.onmessage = (event) => {
        const msg = event.data;
        if (msg.type === 'out') c.push(msg.stream, msg.text);
        else if (msg.type === 'done') {
          clearTimeout(timer);
          resolve(finish(c, {}));
        }
      };
      current.worker.postMessage({ type: 'run', code, stdin });
    });
  }

  function run(runtime, code, stdin, opts) {
    const options = opts || {};
    if (runtime === 'javascript') return runJs(code, stdin, options);
    if (runtime === 'python') return runPython(code, stdin, options);
    return Promise.reject(new Error(`Runtime ${runtime} läuft nicht im Browser.`));
  }

  root.CW_RUNNERS = {
    configure,
    run,
    isPythonLoaded: () => Boolean(py && py.loaded),
    preloadPython: () => { if (!py) startPython(); },
  };
})(this);
