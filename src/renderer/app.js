'use strict';

(function () {
  const api = window.codewerk;
  const I18N = window.CW_I18N;
  const MD = window.CW_MD;
  const Runners = window.CW_RUNNERS;

  const state = {
    info: null,
    settings: null,
    lang: 'de',
    courses: [],
    currentId: null,
    data: null, // { transcript, profile, exercise, editorCode, day, busy }
    busy: false,
    running: false,
    stream: null,
    lastRun: null,
    updateStatus: null,
    saveTimer: null,
  };

  const $ = (selector) => document.querySelector(selector);
  const t = (key, vars) => I18N.t(state.lang, key, vars);
  const md = (text) => MD.render(text, { toEditorLabel: t('to_editor') });
  const clamp = (n) => Math.max(0, Math.min(100, Number(n) || 0));
  const course = () => state.courses.find((c) => c.id === state.currentId) || null;

  function el(tag, props, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props || {})) {
      if (value == null || value === false) continue;
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key === 'html') node.innerHTML = value;
      else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value === true ? '' : value);
    }
    for (const child of children.flat()) if (child != null) node.append(child);
    return node;
  }

  // ---------- language ----------

  function applyI18n() {
    document.documentElement.lang = state.lang;
    document.querySelectorAll('[data-i18n]').forEach((node) => { node.textContent = t(node.dataset.i18n); });
    document.querySelectorAll('[data-i18n-ph]').forEach((node) => { node.placeholder = t(node.dataset.i18nPh); });
    $('#lang-toggle').textContent = state.lang === 'de' ? 'EN' : 'DE';
    renderCommandChips();
  }

  async function setLang(lang) {
    if (lang === state.lang) return;
    state.lang = lang;
    await saveSetting({ uiLang: lang });
    applyI18n();
    if (!$('#home').hidden) renderHome();
    else if (state.data) {
      renderCourseHeader();
      renderMessages();
      renderExercise();
      renderProfile();
    }
  }

  // ---------- home ----------

  function showView(name) {
    $('#home').hidden = name !== 'home';
    $('#course').hidden = name !== 'course';
  }

  function renderHome() {
    const grid = $('#course-grid');
    grid.replaceChildren();
    state.courses.forEach((c, index) => {
      const p = c.profile;
      const status = c.day === 0
        ? t('course_new')
        : [t('course_day', { n: c.day }), p ? t('course_level', { n: p.level }) : null].filter(Boolean).join(' · ');
      grid.append(el('button', { class: 'course-tile', type: 'button', style: `--accent:${c.color}`, onclick: () => openCourse(c.id) },
        el('span', { class: 'tile-num', text: String(index + 1).padStart(2, '0') }),
        el('span', { class: 'tile-name', text: c.name }),
        el('span', { class: 'tile-desc', text: t(`course_desc_${c.id}`) }),
        el('span', { class: 'tile-status', text: status }),
        el('span', { class: 'progress' }, el('span', { class: 'progress-bar', style: `width:${clamp(p && p.progress_percent)}%` })),
        el('span', { class: 'tile-action', text: c.day === 0 ? t('course_start') : t('course_open') })));
    });
  }

  async function goHome() {
    state.courses = await api.listCourses();
    renderHome();
    showView('home');
  }

  // ---------- course ----------

  async function openCourse(id) {
    state.currentId = id;
    state.lastRun = null;
    state.stream = null;
    state.data = await api.getCourse(id);
    const c = course();
    const view = $('#course');
    view.style.setProperty('--accent', c.color);
    view.style.setProperty('--accent-ink', c.ink);
    $('#course-name').textContent = c.name;
    $('#editor-lang').textContent = c.name;
    $('#editor').value = state.data.editorCode || '';
    $('#stdin').value = '';
    $('#run-status').textContent = '';
    resetOutput();
    renderCourseHeader();
    renderMessages();
    renderExercise();
    renderProfile();
    showView('course');
    setBusy(Boolean(state.data.busy));
    if (c.runtime === 'python') Runners.preloadPython();
    $('#composer-input').focus();
  }

  function renderCourseHeader() {
    const d = state.data;
    const parts = [];
    if (d.profile) parts.push(t('course_level', { n: d.profile.level }));
    parts.push(d.day ? t('course_day', { n: d.day }) : t('course_new'));
    $('#course-badge').textContent = parts.join(' · ');
    $('#new-day').hidden = d.day === 0;
  }

  // ---------- chat ----------

  function scrollDown(force) {
    const box = $('#messages');
    const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 160;
    if (force || nearBottom) box.scrollTop = box.scrollHeight;
  }

  function bubble(role, text) {
    return el('div', { class: `msg ${role}` }, el('div', { class: 'md', html: md(text) }));
  }

  function toolChip(name, title) {
    if (name === 'set_exercise') return el('div', { class: 'chip-line', text: `📝 ${t('chip_exercise', { title: title || '' })}` });
    if (name === 'update_learning_profile') return el('div', { class: 'chip-line', text: `💾 ${t('chip_profile')}` });
    return null;
  }

  function dayDivider(text) {
    return el('div', { class: 'day-divider' }, el('span', { text: String(text).replace(/^\[|\]$/g, '') }));
  }

  function startPanel() {
    const first = state.data.day === 0;
    return el('div', { class: 'start-panel' },
      el('h3', { text: t('start_title') }),
      el('p', { class: 'muted', text: first ? t('start_text_first') : t('start_text_next') }),
      el('button', {
        class: 'primary',
        type: 'button',
        text: first ? t('start_first') : t('start_next', { n: state.data.day + 1 }),
        onclick: () => startDay(),
      }));
  }

  function renderMessages() {
    const box = $('#messages');
    box.replaceChildren();
    state.stream = null;
    for (const item of state.data.transcript) {
      if (item.type === 'day') box.append(dayDivider(item.text));
      else if (item.type === 'user') box.append(bubble('user', item.text));
      else if (item.type === 'mentor') box.append(bubble('mentor', item.text));
      else if (item.type === 'tool') {
        const chip = toolChip(item.name, item.title);
        if (chip) box.append(chip);
      }
    }
    if (!state.data.transcript.length) box.append(startPanel());
    if (state.busy) showThinking();
    scrollDown(true);
  }

  function showThinking() {
    removeThinking();
    $('#messages').append(el('div', { class: 'msg mentor thinking', id: 'thinking', text: t('mentor_thinking') }));
    scrollDown();
  }

  function removeThinking() {
    const node = document.getElementById('thinking');
    if (node) node.remove();
  }

  function appendLive(node) {
    removeThinking();
    $('#messages').append(node);
    if (state.busy) showThinking();
    scrollDown();
  }

  function ensureStreamBubble() {
    if (!state.stream) {
      removeThinking();
      const body = el('div', { class: 'md' });
      const node = el('div', { class: 'msg mentor' }, body);
      $('#messages').append(node);
      state.stream = { node, body, text: '', scheduled: false };
    }
    return state.stream;
  }

  function showError(error) {
    const code = error && error.code;
    let text;
    if (code === 'auth') text = t('err_auth');
    else if (code === 'limit') text = t('err_limit');
    else if (code === 'busy') text = t('err_busy');
    else text = t('err_generic', { msg: (error && error.message) || '?' });
    const box = el('div', { class: 'msg error' }, el('div', { text }));
    if (code === 'auth') box.append(el('button', { type: 'button', text: t('open_settings'), onclick: openSettings }));
    $('#messages').append(box);
    scrollDown(true);
  }

  function setBusy(busy) {
    state.busy = busy;
    for (const selector of ['#send-btn', '#submit-btn', '#new-day']) $(selector).disabled = busy;
    document.querySelectorAll('#command-chips button, .start-panel button').forEach((b) => { b.disabled = busy; });
    if (!busy) removeThinking();
  }

  async function runMentor(call) {
    const id = state.currentId;
    setBusy(true);
    showThinking();
    let res;
    try {
      res = await call();
    } catch (err) {
      res = { ok: false, error: { code: 'generic', message: err.message } };
    }
    setBusy(false);
    state.courses = await api.listCourses();
    if (id !== state.currentId || $('#course').hidden) {
      if (!$('#home').hidden) renderHome();
      return res;
    }
    // Re-render from the saved transcript so the chat always matches what was stored.
    state.data = await api.getCourse(id);
    renderCourseHeader();
    renderMessages();
    renderExercise();
    renderProfile();
    if (!res.ok) showError(res.error);
    return res;
  }

  async function sendToMentor(text) {
    const clean = String(text || '').trim();
    if (!clean || state.busy) return;
    const box = $('#messages');
    const panel = box.querySelector('.start-panel');
    if (panel) panel.remove();
    box.append(bubble('user', clean));
    scrollDown(true);
    const id = state.currentId;
    await runMentor(() => api.send(id, clean));
  }

  async function startDay() {
    if (state.busy) return;
    if (state.data.transcript.length && !window.confirm(t('new_day_confirm'))) return;
    const id = state.currentId;
    $('#messages').replaceChildren();
    await runMentor(() => api.startDay(id));
  }

  function renderCommandChips() {
    const box = $('#command-chips');
    box.replaceChildren();
    for (const cmd of t('cmd_list').split(' ')) {
      box.append(el('button', { type: 'button', text: cmd, disabled: state.busy, onclick: () => sendToMentor(cmd) }));
    }
  }

  // ---------- editor & running code ----------

  function insertText(textarea, text) {
    textarea.focus();
    // execCommand keeps the browser's undo history; setRangeText is the fallback.
    if (!document.execCommand('insertText', false, text)) {
      textarea.setRangeText(text, textarea.selectionStart, textarea.selectionEnd, 'end');
      textarea.dispatchEvent(new Event('input'));
    }
  }

  function onEditorKey(event) {
    const editor = event.target;
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      runCode();
    } else if (event.key === 'Tab' && !event.shiftKey) {
      event.preventDefault();
      insertText(editor, '    ');
    } else if (event.key === 'Enter' && !event.shiftKey && !event.altKey) {
      // Keep the indentation of the current line; indent one more after ":" "{" "(" "[".
      event.preventDefault();
      const before = editor.value.slice(0, editor.selectionStart);
      const line = before.slice(before.lastIndexOf('\n') + 1);
      const indent = /^[ \t]*/.exec(line)[0];
      const extra = /[:{([]\s*$/.test(line) ? '    ' : '';
      insertText(editor, '\n' + indent + extra);
    }
  }

  function setEditorCode(code) {
    const editor = $('#editor');
    editor.value = code;
    editor.dispatchEvent(new Event('input'));
  }

  function resetOutput() {
    $('#output').replaceChildren(el('span', { class: 'muted', text: t('output_empty') }));
  }

  async function runCode() {
    const c = course();
    if (!c || state.running) return state.lastRun;
    const code = $('#editor').value;
    const stdin = $('#stdin').value;
    const out = $('#output');
    const status = $('#run-status');
    out.replaceChildren();
    state.running = true;
    $('#run-btn').disabled = true;
    const loading = c.runtime === 'python' && !Runners.isPythonLoaded();
    status.textContent = loading ? t('python_loading') : t('running');
    const append = (stream, text) => {
      if (status.textContent === t('python_loading')) status.textContent = t('running');
      out.append(el('span', { class: `out-${stream}`, text }));
      out.scrollTop = out.scrollHeight;
    };
    const started = performance.now();
    let result;
    try {
      if (c.runtime === 'python' || c.runtime === 'javascript') {
        result = await Runners.run(c.runtime, code, stdin, { onOutput: append });
      } else {
        const r = await api.runNative(c.runtime, code, stdin);
        if (r.missing) append('stderr', t('runtime_missing', { tool: r.missing.tool, hint: r.missing.hint }) + '\n');
        if (r.stdout) append('stdout', r.stdout);
        if (r.stderr) append('stderr', r.stderr);
        result = { text: (r.stdout || '') + (r.stderr || ''), timedOut: r.timedOut, exitCode: r.missing ? null : r.code };
      }
    } catch (err) {
      const message = String(err && err.message ? err.message : err);
      append('stderr', message + '\n');
      result = { text: message, timedOut: false };
    }
    if (result.timedOut) append('stderr', `\n${t('timeout')}\n`);
    if (!out.childNodes.length) out.append(el('span', { class: 'muted', text: t('submit_no_output') }));
    const ms = Math.round(performance.now() - started);
    if (result.timedOut) status.textContent = '';
    else if (typeof result.exitCode === 'number' && result.exitCode !== 0) status.textContent = t('exit_code', { n: result.exitCode });
    else status.textContent = t('finished', { ms });
    state.running = false;
    $('#run-btn').disabled = false;
    state.lastRun = { code, output: result.text || '', timedOut: Boolean(result.timedOut) };
    return state.lastRun;
  }

  async function submitCode() {
    if (state.busy) return;
    const c = course();
    const code = $('#editor').value;
    if (!code.trim()) return;
    let run = state.lastRun;
    if (!run || run.code !== code) run = await runCode();
    if (!run) return;
    const exercise = state.data.exercise;
    let output = run.output.replace(/\s+$/, '');
    if (!output) output = t('submit_no_output');
    if (run.timedOut) output += `\n${t('submit_timeout')}`;
    if (output.length > 4000) output = output.slice(0, 4000) + '\n…';
    const text = [
      t('submit_intro', { title: exercise ? exercise.title : '–' }),
      '',
      '```' + c.fence,
      code.replace(/\s+$/, ''),
      '```',
      '',
      t('submit_output'),
      '',
      '```text',
      output,
      '```',
    ].join('\n');
    await sendToMentor(text);
  }

  function renderExercise() {
    const exercise = state.data.exercise;
    const title = $('#exercise-title');
    title.textContent = exercise ? exercise.title : '';
    title.hidden = !exercise;
    const body = $('#exercise-body');
    if (exercise) body.innerHTML = md(exercise.instructions || '');
    else body.replaceChildren(el('p', { class: 'muted', text: t('exercise_none') }));
  }

  // ---------- profile ----------

  function renderProfile() {
    const pane = $('#profile-pane');
    pane.replaceChildren(el('h3', { text: t('p_title') }));
    const p = state.data && state.data.profile;
    if (!p) {
      pane.append(el('p', { class: 'muted', text: t('p_empty') }));
      return;
    }
    const stat = (label, value) => el('div', { class: 'stat' }, el('span', { class: 'muted', text: label }), el('strong', { text: String(value) }));
    const section = (label, ...content) => [el('h4', { text: label }), ...content];
    const tags = (items, kind) => el('div', { class: 'tags' }, items.map((x) => el('span', { class: `tag ${kind}`, text: x })));
    pane.append(
      el('div', { class: 'stats' },
        stat(t('p_level'), p.level),
        stat(t('p_day'), state.data.day),
        stat(t('p_streak'), p.streak),
        stat(t('p_progress'), `${clamp(p.progress_percent)}%`)),
      el('span', { class: 'progress' }, el('span', { class: 'progress-bar', style: `width:${clamp(p.progress_percent)}%` })),
    );
    if (p.phase) pane.append(...section(t('p_phase'), el('p', { text: p.phase })));
    if (p.goals) pane.append(...section(t('p_goals'), el('p', { class: 'muted', text: p.goals })));
    if (p.mastered && p.mastered.length) pane.append(...section(t('p_mastered'), tags(p.mastered, 'good')));
    if (p.shaky && p.shaky.length) pane.append(...section(t('p_shaky'), tags(p.shaky, 'warn')));
    if (p.open && p.open.length) pane.append(...section(t('p_open'), tags(p.open, 'bad')));
    if (p.mistakes && p.mistakes.length) {
      pane.append(...section(t('p_mistakes'), el('ul', { class: 'plain-list' }, p.mistakes.map((m) => el('li', {},
        el('strong', { text: m.topic }),
        el('div', { class: 'muted small', text: `${t('p_reviews', { n: m.clean_reviews })} · ${t('p_next_review', { when: m.next_review })}` }))))));
    }
    if (p.projects && p.projects.length) {
      pane.append(...section(t('p_projects'), el('ul', { class: 'plain-list' }, p.projects.map((x) => el('li', { text: `L${x.level} · ${x.name} – ${x.rating}` })))));
    }
    if (p.glossary && p.glossary.length) {
      pane.append(...section(t('p_glossary'), el('dl', { class: 'glossary' }, p.glossary.flatMap((g) => [el('dt', { text: g.term }), el('dd', { text: g.meaning })]))));
    }
    if (p.recommendation) pane.append(...section(t('p_reco'), el('p', { text: p.recommendation })));
  }

  function toggleProfile() {
    const pane = $('#profile-pane');
    pane.hidden = !pane.hidden;
    $('#course').classList.toggle('with-profile', !pane.hidden);
  }

  // ---------- settings & updates ----------

  function openSettings() {
    renderSettings();
    const dialog = $('#settings-dialog');
    if (!dialog.open) dialog.showModal();
  }

  function renderSettings() {
    const s = state.settings;
    $('#model-select').value = s.model || '';
    $('#effort-select').value = s.effort;
    $('#lang-select').value = state.lang;
    $('#key-status').textContent = s.hasApiKey ? t('api_key_stored') : t('api_key_none');
    $('#remove-key').hidden = !s.hasApiKey;
    $('#settings-version').textContent = t('version_label', { v: state.info.version });
    $('#danger-zone').hidden = !state.currentId || $('#course').hidden;
    renderUpdateStatus();
  }

  async function saveSetting(patch) {
    const result = await api.setSettings(patch);
    state.settings = result;
    if (result.error) window.alert(result.error);
    if ($('#settings-dialog').open) renderSettings();
  }

  function renderUpdateStatus() {
    const u = state.updateStatus;
    const banner = $('#update-banner');
    const install = $('#update-install');
    let message = '';
    banner.hidden = true;
    install.hidden = true;
    if (u) {
      switch (u.status) {
        case 'checking': message = t('update_checking'); break;
        case 'available': message = t('update_available', { v: u.version }); banner.hidden = false; break;
        case 'downloading': message = t('update_progress', { p: Math.round(u.percent || 0) }); banner.hidden = false; break;
        case 'ready': message = t('update_ready', { v: u.version }); banner.hidden = false; install.hidden = false; break;
        case 'none': message = t('update_none'); break;
        case 'dev': message = t('update_dev'); break;
        case 'error': message = t('update_error', { msg: u.message }); break;
        default: break;
      }
    }
    $('#update-text').textContent = message;
    $('#update-status').textContent = message;
  }

  // ---------- wiring ----------

  function bindEvents() {
    $('#back-home').addEventListener('click', goHome);
    $('#new-day').addEventListener('click', () => startDay());
    $('#toggle-profile').addEventListener('click', toggleProfile);

    $('#composer').addEventListener('submit', (event) => {
      event.preventDefault();
      if (state.busy) return;
      const input = $('#composer-input');
      const text = input.value;
      input.value = '';
      sendToMentor(text);
    });
    $('#composer-input').addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        $('#composer').requestSubmit();
      }
    });

    const editor = $('#editor');
    editor.addEventListener('keydown', onEditorKey);
    editor.addEventListener('input', () => {
      clearTimeout(state.saveTimer);
      const id = state.currentId;
      const code = editor.value;
      state.saveTimer = setTimeout(() => api.saveEditor(id, code), 400);
    });
    $('#run-btn').addEventListener('click', () => runCode());
    $('#submit-btn').addEventListener('click', () => submitCode());

    // "To editor" buttons inside rendered code blocks (chat and exercise text).
    document.addEventListener('click', (event) => {
      const button = event.target.closest('.to-editor');
      if (!button) return;
      const code = button.closest('.code-block').querySelector('code').textContent;
      const current = $('#editor').value;
      if (current.trim() && current !== code && !window.confirm(t('confirm_replace'))) return;
      setEditorCode(code);
    });

    $('#lang-toggle').addEventListener('click', () => setLang(state.lang === 'de' ? 'en' : 'de'));
    $('#open-settings').addEventListener('click', openSettings);
    $('#model-select').addEventListener('change', (e) => saveSetting({ model: e.target.value }));
    $('#effort-select').addEventListener('change', (e) => saveSetting({ effort: e.target.value }));
    $('#lang-select').addEventListener('change', (e) => setLang(e.target.value));
    $('#save-key').addEventListener('click', async () => {
      const input = $('#api-key');
      const key = input.value.trim();
      if (!key) return;
      input.value = '';
      await saveSetting({ apiKey: key });
    });
    $('#remove-key').addEventListener('click', () => saveSetting({ apiKey: '' }));
    $('#check-updates').addEventListener('click', async () => {
      state.updateStatus = { status: 'checking' };
      renderUpdateStatus();
      const result = await api.checkUpdates();
      if (result.status === 'dev' || result.status === 'error') {
        state.updateStatus = result;
        renderUpdateStatus();
      }
    });
    $('#update-install').addEventListener('click', () => api.installUpdate());
    $('#reset-course').addEventListener('click', async () => {
      const c = course();
      if (!c || !window.confirm(t('reset_confirm', { name: c.name }))) return;
      await api.resetCourse(c.id);
      $('#settings-dialog').close();
      state.courses = await api.listCourses();
      await openCourse(c.id);
    });

    api.onDelta(({ courseId, delta }) => {
      if (courseId !== state.currentId) return;
      const s = ensureStreamBubble();
      s.text += delta;
      if (!s.scheduled) {
        s.scheduled = true;
        requestAnimationFrame(() => {
          s.scheduled = false;
          s.body.innerHTML = md(s.text);
          scrollDown();
        });
      }
    });
    api.onSegment(({ courseId }) => {
      if (courseId !== state.currentId) return;
      state.stream = null;
      if (state.busy) showThinking();
    });
    api.onProfile(({ courseId, profile }) => {
      if (courseId !== state.currentId) return;
      state.data.profile = profile;
      renderProfile();
      renderCourseHeader();
      appendLive(toolChip('update_learning_profile'));
    });
    api.onExercise(({ courseId, exercise }) => {
      if (courseId !== state.currentId) return;
      state.data.exercise = exercise;
      state.lastRun = null;
      setEditorCode(exercise.starter_code || '');
      renderExercise();
      appendLive(toolChip('set_exercise', exercise.title));
    });
    api.onUpdate((status) => {
      state.updateStatus = status;
      renderUpdateStatus();
    });
  }

  async function init() {
    state.info = await api.getInfo();
    state.settings = await api.getSettings();
    state.lang = state.settings.uiLang;
    state.courses = await api.listCourses();
    Runners.configure({ pyodideURL: state.info.pyodideURL });
    $('#app-version').textContent = `v${state.info.version}`;
    bindEvents();
    applyI18n();
    renderHome();
    showView('home');
    if (state.info.selftest) await selftest();
  }

  // ---------- selftest (npm run selftest) ----------

  async function selftest() {
    const results = [];
    const check = async (name, fn) => {
      try {
        results.push({ name, ok: true, detail: await fn() });
      } catch (err) {
        results.push({ name, ok: false, detail: String(err && err.message ? err.message : err) });
      }
    };
    const expect = (condition, message) => { if (!condition) throw new Error(message); };
    const run = (runtime, code, stdin, opts) => Runners.run(runtime, code, stdin || '', opts);

    await check('i18n', () => { const text = $('#home-title').textContent; expect(text.length > 0, 'empty title'); return text; });
    await check('five course tiles', () => { const n = document.querySelectorAll('.course-tile').length; expect(n === 5, `tiles: ${n}`); return n; });
    await check('markdown escapes html', () => { const h = MD.render('<img src=x onerror=alert(1)>'); expect(!h.includes('<img'), h); return 'ok'; });
    await check('js print', async () => { const r = await run('javascript', 'console.log(1 + 2)'); expect(r.text.trim() === '3', JSON.stringify(r.text)); return r.text.trim(); });
    await check('js prompt', async () => { const r = await run('javascript', "const n = prompt('Zahl?');\nconsole.log(Number(n) * 2);", '21'); expect(r.text.includes('42'), JSON.stringify(r.text)); return r.text; });
    await check('js error', async () => { const r = await run('javascript', 'undefinedFunction()'); expect(r.text.includes('ReferenceError'), JSON.stringify(r.text)); return r.text.trim(); });
    await check('js timeout', async () => { const r = await run('javascript', 'while (true) {}', '', { timeoutMs: 1500 }); expect(r.timedOut, 'no timeout'); return 'stopped'; });
    await check('python print', async () => { const r = await run('python', 'print(2 ** 10)'); expect(r.text.trim() === '1024', JSON.stringify(r.text)); return r.text.trim(); });
    await check('python input', async () => { const r = await run('python', "name = input('Name: ')\nprint('Hallo', name)", 'Ada'); expect(r.text.includes('Hallo Ada'), JSON.stringify(r.text)); return r.text; });
    await check('python two inputs', async () => { const r = await run('python', 'a = input()\nb = input()\nprint(int(a) + int(b))', '2\n3'); expect(r.text.trim().endsWith('5'), JSON.stringify(r.text)); return r.text; });
    await check('python traceback', async () => { const r = await run('python', 'x = 1 / 0'); expect(r.text.includes('ZeroDivisionError'), JSON.stringify(r.text)); expect(!r.text.includes('_pyodide'), `internal frames: ${r.text}`); return r.text.trim(); });
    await check('python __main__', async () => { const r = await run('python', "if __name__ == '__main__':\n    print('main')"); expect(r.text.trim() === 'main', JSON.stringify(r.text)); return 'ok'; });
    await check('python isolated runs', async () => { await run('python', 'geheim = 5'); const r = await run('python', 'print(geheim)'); expect(r.text.includes('NameError'), JSON.stringify(r.text)); return 'ok'; });
    await check('python timeout + recovery', async () => {
      const r = await run('python', 'while True:\n    pass', '', { timeoutMs: 3000 });
      expect(r.timedOut, 'no timeout');
      const again = await run('python', "print('wieder da')");
      expect(again.text.includes('wieder da'), JSON.stringify(again.text));
      return 'ok';
    });
    await check('open course', async () => { await openCourse('python'); expect(!$('#course').hidden, 'course hidden'); expect(document.querySelector('.start-panel'), 'no start panel'); return 'ok'; });
    await check('native runtimes', async () => api.detectRuntimes(true));

    api.selftestResult({ ok: results.every((r) => r.ok), results });
  }

  init().catch((err) => {
    document.body.prepend(el('pre', { class: 'fatal', text: String(err && err.stack ? err.stack : err) }));
    if (api && api.selftestResult) api.selftestResult({ ok: false, results: [{ name: 'init', ok: false, detail: String(err) }] });
  });
})();
