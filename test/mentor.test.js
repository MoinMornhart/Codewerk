'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const mentor = require('../src/main/mentor');
const { courseById } = require('../src/shared/courses');

// Minimal stand-in for @anthropic-ai/claude-agent-sdk: records the query options and
// lets each test script the message stream, including calls into the app's tools.
function fakeSdk(script) {
  const calls = [];
  const tools = {};
  return {
    calls,
    tools,
    tool: (name, description, shape, handler) => ({ name, description, shape, handler }),
    createSdkMcpServer: (config) => {
      for (const t of config.tools) tools[t.name] = t;
      return { type: 'sdk', name: config.name, alwaysLoad: config.alwaysLoad };
    },
    query: ({ prompt, options }) => {
      calls.push({ prompt, options });
      return script({ tools, prompt, options });
    },
  };
}

function freshState() {
  return { sessionId: null, transcript: [], profile: null, exercise: null, editorCode: '', day: 1 };
}

function baseOpts(sdk, state, sent) {
  return {
    sdk,
    course: courseById('python'),
    state,
    prompt: 'Hallo',
    lang: 'de',
    promptText: '# Mentor',
    send: (channel, payload) => sent.push([channel, payload]),
    save: () => {},
    cwd: 'C:/tmp',
    env: {},
  };
}

test('ein Zug mit Streaming, Übung und Text landet im Transcript', async () => {
  const sdk = fakeSdk(async function* ({ tools }) {
    yield { type: 'system', subtype: 'init', session_id: 'sess-1' };
    yield { type: 'stream_event', event: { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hal' } } };
    yield { type: 'assistant', message: { content: [{ type: 'text', text: 'Hallo! Hier ist deine Übung.' }] } };
    yield { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'mcp__codewerk__set_exercise', input: {} }] } };
    await tools.set_exercise.handler({ title: 'Erste Ausgabe', instructions: 'Gib **Hallo** aus.', starter_code: '# hier' });
    yield { type: 'result', subtype: 'success', is_error: false, result: 'ok', session_id: 'sess-1' };
  });
  const state = freshState();
  const sent = [];
  const result = await mentor.runTurn(baseOpts(sdk, state, sent));

  assert.deepEqual(result, { ok: true });
  assert.equal(state.sessionId, 'sess-1');
  assert.equal(state.exercise.title, 'Erste Ausgabe');
  assert.equal(state.editorCode, '# hier');
  assert.deepEqual(state.transcript.map((x) => x.type), ['mentor', 'tool']);
  assert.ok(sent.some(([ch, p]) => ch === 'mentor:delta' && p.delta === 'Hal'));
  assert.ok(sent.some(([ch]) => ch === 'exercise:set'));
});

test('die Optionen sperren alle eingebauten Werkzeuge und setzen Kurs-Kontext', async () => {
  const sdk = fakeSdk(async function* () {
    yield { type: 'result', subtype: 'success', is_error: false, result: '' };
  });
  const state = freshState();
  state.sessionId = 'alt';
  await mentor.runTurn({ ...baseOpts(sdk, state, []), model: 'opus', effort: 'medium' });
  const { options } = sdk.calls[0];

  assert.deepEqual(options.tools, []);
  assert.deepEqual(options.settingSources, []);
  assert.deepEqual(options.allowedTools, ['mcp__codewerk__set_exercise', 'mcp__codewerk__update_learning_profile']);
  assert.equal(options.mcpServers.codewerk.alwaysLoad, true);
  assert.equal(options.resume, 'alt');
  assert.equal(options.model, 'opus');
  assert.equal(options.effort, 'medium');
  assert.equal(options.includePartialMessages, true);
  assert.match(options.systemPrompt, /## Aktueller Kurs\n\*\*Python\*\*/);
  assert.match(options.systemPrompt, /Pyodide/);
});

test('Profil-Tool speichert das Profil', async () => {
  const profile = { level: 1, lesson: 2, phase: 'Lektion', progress_percent: 30, streak: 2, goals: 'Spiel', mastered: ['print'], shaky: [], open: ['if'], mistakes: [], projects: [], glossary: [], recommendation: 'Schleifen' };
  const sdk = fakeSdk(async function* ({ tools }) {
    await tools.update_learning_profile.handler(profile);
    yield { type: 'result', subtype: 'success', is_error: false, result: '' };
  });
  const state = freshState();
  const sent = [];
  await mentor.runTurn(baseOpts(sdk, state, sent));
  assert.deepEqual(state.profile, profile);
  assert.ok(sent.some(([ch]) => ch === 'profile:update'));
});

test('fehlende Anmeldung wird als auth-Fehler erkannt', async () => {
  const sdk = fakeSdk(async function* () {
    yield { type: 'assistant', error: 'authentication_failed', message: { content: [{ type: 'text', text: 'Invalid API key' }] } };
    yield { type: 'result', subtype: 'success', is_error: true, result: 'Invalid API key' };
  });
  const result = await mentor.runTurn(baseOpts(sdk, freshState(), []));
  assert.deepEqual(result.error.code, 'auth');
});

test('eine Ausnahme im SDK wird zu einem normalen Fehler', async () => {
  const sdk = fakeSdk(async function* () {
    throw new Error('spawn failed');
  });
  const result = await mentor.runTurn(baseOpts(sdk, freshState(), []));
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'generic');
  assert.match(result.error.message, /spawn failed/);
});

test('Kursbefehle werden nicht als Claude-Code-Slash-Befehle gesendet', () => {
  assert.equal(mentor.toPrompt('/status', 'de'), 'Befehl: /status');
  assert.equal(mentor.toPrompt('/next', 'en'), 'Command: /next');
  assert.equal(mentor.toPrompt('Hallo', 'de'), 'Hallo');
});

test('Startnachricht enthält Tag, Profil und andere Kurse', () => {
  const state = { day: 3, profile: { level: 2, progress_percent: 40 } };
  const text = mentor.buildKickoff({
    course: courseById('python'),
    state,
    others: [{ name: 'Java', level: 1, progress_percent: 10, goals: 'Ausbildung' }],
    lang: 'de',
    date: '2026-09-11',
  });
  assert.match(text, /^\[Codewerk · Python · Tag 3\]/);
  assert.match(text, /"level": 2/);
  assert.match(text, /- Java: Level 1, 10 %/);
  assert.match(text, /Datum: 2026-09-11/);
});
