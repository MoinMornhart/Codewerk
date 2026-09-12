'use strict';

// Talks to Claude through Claude Code (Claude Agent SDK), using the learner's own Claude login.
// Kept free of Electron imports so it can be tested with a fake SDK.
const { z } = require('zod');

const SERVER = 'codewerk';
const TOOL = { exercise: 'set_exercise', profile: 'update_learning_profile' };
const ALLOWED_TOOLS = Object.values(TOOL).map((name) => `mcp__${SERVER}__${name}`);

let sdkPromise = null;
function loadSdk() {
  // The SDK is an ES module; dynamic import works from CommonJS.
  if (!sdkPromise) sdkPromise = import('@anthropic-ai/claude-agent-sdk');
  return sdkPromise;
}

const exerciseShape = {
  title: z.string().describe('Short title of the exercise'),
  instructions: z.string().describe('Task text in Markdown: what to build, example input/output, hints'),
  starter_code: z.string().describe('Skeleton with comments only – never the solution. May be empty.'),
};

const profileShape = {
  level: z.number().int().describe('Current level 0–10'),
  lesson: z.number().int().describe('Current lesson number within the level'),
  phase: z.string().describe('Current phase, e.g. Onboarding, Placement, Lesson, Project, Exam'),
  progress_percent: z.number().int().describe('Progress within the current level, 0–100'),
  streak: z.number().int().describe('Lessons in a row'),
  goals: z.string().describe('Learner goal, weekly time budget, session length, learning style'),
  mastered: z.array(z.string()).describe('Mastered concepts (green)'),
  shaky: z.array(z.string()).describe('Shaky concepts (yellow)'),
  open: z.array(z.string()).describe('Open concepts (red)'),
  mistakes: z.array(z.object({
    topic: z.string(),
    clean_reviews: z.number().int().describe('Error-free reviews so far, 0–3'),
    next_review: z.string().describe('When to ask again, e.g. "Lesson 7"'),
  })).describe('Open mistake list'),
  projects: z.array(z.object({
    level: z.number().int(),
    name: z.string(),
    rating: z.string().describe('Correctness/readability/structure, e.g. "4/3/4"'),
  })).describe('Completed projects'),
  glossary: z.array(z.object({ term: z.string(), meaning: z.string() })).describe('All terms learned so far'),
  recommendation: z.string().describe('What the learner should work on next'),
};

function createToolServer(sdk, handlers, lang) {
  const de = lang !== 'en';
  const reply = (text) => ({ content: [{ type: 'text', text }] });
  return sdk.createSdkMcpServer({
    name: SERVER,
    version: '1.0.0',
    alwaysLoad: true, // built-in tools (incl. tool search) are disabled, so schemas must be in the prompt
    tools: [
      sdk.tool(
        TOOL.exercise,
        'Load an exercise into the learner\'s code editor in the app: title, task text (Markdown) and starter code (a skeleton with comments, never the solution).',
        exerciseShape,
        async (args) => {
          handlers.onExercise(args);
          return reply(de
            ? 'Die Übung ist im Editor geladen. Warte jetzt, bis der Lernende seinen Code schickt.'
            : 'The exercise is loaded in the editor. Now wait until the learner sends their code.');
        },
      ),
      sdk.tool(
        TOOL.profile,
        'Save the complete learning profile of the current course. Always pass the full profile, not just changes.',
        profileShape,
        async (args) => {
          handlers.onProfile(args);
          return reply(de ? 'Lernprofil gespeichert.' : 'Learning profile saved.');
        },
      ),
    ],
  });
}

function buildSystemPrompt(promptText, course, lang) {
  const de = lang !== 'en';
  const lines = [
    promptText.trim(),
    '',
    de ? '## Aktueller Kurs' : '## Current course',
    `**${course.name}**`,
    course.notes[de ? 'de' : 'en'],
    de
      ? 'Antworte auf Deutsch, Fachbegriffe englisch mit deutscher Übersetzung.'
      : 'Answer in English.',
  ];
  return lines.join('\n');
}

// Claude Code treats messages that start with "/" as its own slash commands,
// so the course commands (/weiter, /status …) are sent as plain text.
function toPrompt(text, lang) {
  const trimmed = String(text).trim();
  if (!trimmed.startsWith('/')) return trimmed;
  return `${lang === 'en' ? 'Command' : 'Befehl'}: ${trimmed}`;
}

function buildKickoff({ course, state, others, lang, date }) {
  const de = lang !== 'en';
  const lines = [`[Codewerk · ${course.name} · ${de ? 'Tag' : 'Day'} ${state.day}]`];
  if (state.profile) {
    lines.push(de ? 'Neue Tages-Session. Gespeichertes Lernprofil:' : 'New daily session. Saved learning profile:');
    lines.push('```json', JSON.stringify(state.profile, null, 2), '```');
  } else {
    lines.push(de
      ? 'Erster Start dieses Kurses – es gibt noch kein Lernprofil. Beginne mit Phase 0.'
      : 'First start of this course – there is no learning profile yet. Begin with phase 0.');
  }
  if (others.length) {
    lines.push(de ? 'Stand in den anderen Kursen:' : 'Progress in the other courses:');
    for (const other of others) {
      const goals = other.goals ? ` – ${de ? 'Ziele' : 'goals'}: ${other.goals}` : '';
      lines.push(`- ${other.name}: Level ${other.level}, ${other.progress_percent} %${goals}`);
    }
  }
  lines.push(`${de ? 'Datum' : 'Date'}: ${date}`);
  return lines.join('\n');
}

const AUTH_ERRORS = new Set(['authentication_failed', 'oauth_org_not_allowed', 'verification_required', 'account_on_hold']);
const LIMIT_ERRORS = new Set(['rate_limit', 'billing_error']);

function classifyError(error) {
  if (AUTH_ERRORS.has(error)) return { code: 'auth', message: error };
  if (LIMIT_ERRORS.has(error)) return { code: 'limit', message: error };
  return { code: 'generic', message: String(error) };
}

async function runTurn(opts) {
  const { sdk, course, state, prompt, lang, send, save } = opts;
  const courseId = course.id;

  const server = createToolServer(sdk, {
    onExercise: (exercise) => {
      state.exercise = exercise;
      state.editorCode = exercise.starter_code || '';
      state.transcript.push({ type: 'tool', name: TOOL.exercise, title: exercise.title });
      send('exercise:set', { courseId, exercise });
      save();
    },
    onProfile: (profile) => {
      state.profile = profile;
      state.transcript.push({ type: 'tool', name: TOOL.profile });
      send('profile:update', { courseId, profile });
      save();
    },
  }, lang);

  const options = {
    systemPrompt: buildSystemPrompt(opts.promptText, course, lang),
    tools: [], // no files, no shell – only the two app tools
    mcpServers: { [SERVER]: server },
    allowedTools: ALLOWED_TOOLS,
    permissionMode: 'dontAsk',
    settingSources: [], // ignore the user's own Claude Code settings and CLAUDE.md files
    includePartialMessages: true,
    maxTurns: 12,
    cwd: opts.cwd,
    env: opts.env,
  };
  if (state.sessionId) options.resume = state.sessionId;
  if (opts.model) options.model = opts.model;
  if (opts.effort) options.effort = opts.effort;
  if (opts.claudePath) options.pathToClaudeCodeExecutable = opts.claudePath;

  let error = null;
  try {
    for await (const message of sdk.query({ prompt, options })) {
      if (message.type === 'system' && message.subtype === 'init') {
        state.sessionId = message.session_id;
      } else if (message.type === 'stream_event') {
        const event = message.event;
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          send('mentor:delta', { courseId, delta: event.delta.text });
        }
      } else if (message.type === 'assistant') {
        if (message.error) error = error || message.error;
        for (const block of message.message.content || []) {
          if (block.type === 'text' && block.text.trim()) state.transcript.push({ type: 'mentor', text: block.text });
        }
        // Each completed block ends the current chat bubble; the next text starts a new one.
        send('mentor:segment', { courseId });
      } else if (message.type === 'result') {
        if (message.session_id) state.sessionId = message.session_id;
        if (message.is_error && !error) {
          error = message.subtype === 'success'
            ? message.result || 'error'
            : (message.errors || []).join('; ') || message.subtype;
        }
      }
    }
  } catch (err) {
    if (!error) error = err && err.message ? err.message : String(err);
  }
  save();
  return error ? { ok: false, error: classifyError(error) } : { ok: true };
}

module.exports = {
  SERVER,
  TOOL,
  ALLOWED_TOOLS,
  loadSdk,
  buildSystemPrompt,
  buildKickoff,
  toPrompt,
  classifyError,
  runTurn,
};
