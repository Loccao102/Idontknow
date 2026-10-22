import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseLRC } from '../src/music.js';

test('LRC cues are parsed and sorted', () => {
  const out = parseLRC('[00:12.00]Later\n[00:01.50]Soon');
  assert.deepEqual(out, [
    { time: 1.5, words: 'Soon' },
    { time: 12, words: 'Later' }
  ]);
});

test('multiple timestamps and offset work', () => {
  const out = parseLRC('[offset:500]\n[00:01.00][00:02.00]A line');
  assert.deepEqual(out.map(cue => cue.time), [1.5, 2.5]);
});

test('Vietnamese meaning captions carry timestamps and text', () => {
  const raw = readFileSync(new URL('../assets/captions.lrc', import.meta.url), 'utf8');
  const out = parseLRC(raw);
  assert.ok(out.length >= 10);
  assert.equal(out[0].time, 0);
  assert.ok(out.every(cue => typeof cue.words === 'string' && cue.words.trim()));
});

test('main story selectors are present in HTML', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const selectors = [...main.matchAll(/\$\('([^']+)'\)/g)].map(x => x[1]);
  for (const id of selectors) assert.ok(html.includes('id="' + id + '"'), 'Missing #'+id);
});

test('configured song ID and source mode are present', () => {
  const js = readFileSync(new URL('../src/config.js', import.meta.url), 'utf8');
  assert.match(js, /rHvQakk1zMA/);
  assert.match(js, /mode: 'youtube'/);
});

test('Vietnamese captions match song themes and are not mislabeled as literal lyrics', () => {
  const lrc = readFileSync(new URL('../assets/captions.lrc', import.meta.url), 'utf8');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const cfg = readFileSync(new URL('../src/config.js', import.meta.url), 'utf8');
  assert.match(lrc, /diễn giải tiếng Việt/i);
  assert.match(lrc, /ngượng ngùng/i);
  assert.match(lrc, /đơn phương/i);
  assert.match(html, /Ý NGHĨA BÀI HÁT/);
  assert.match(cfg, /chưa phải bản dịch từng câu/);
});
