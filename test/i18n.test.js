'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const I18N = require('../src/renderer/i18n.js');

test('Deutsch und Englisch haben dieselben Schlüssel', () => {
  const de = Object.keys(I18N.dict.de).sort();
  const en = Object.keys(I18N.dict.en).sort();
  assert.deepEqual(en, de);
});

test('Platzhalter werden ersetzt', () => {
  assert.equal(I18N.t('de', 'course_day', { n: 3 }), 'Tag 3');
  assert.equal(I18N.t('en', 'course_day', { n: 3 }), 'Day 3');
});

test('jeder im HTML benutzte Schlüssel existiert', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'index.html'), 'utf8');
  const keys = [...html.matchAll(/data-i18n(?:-ph)?="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(keys.length > 10);
  for (const key of keys) assert.ok(key in I18N.dict.de, `fehlt: ${key}`);
});

test('beide Mentor-Prompts existieren und nennen die Tools', () => {
  for (const lang of ['de', 'en']) {
    const prompt = fs.readFileSync(path.join(__dirname, '..', 'prompts', `mentor.${lang}.md`), 'utf8');
    assert.ok(prompt.includes('set_exercise'), `${lang}: set_exercise`);
    assert.ok(prompt.includes('update_learning_profile'), `${lang}: update_learning_profile`);
    assert.ok(prompt.includes('LEVEL 10'), `${lang}: Levelsystem`);
  }
});
