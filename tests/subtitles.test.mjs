import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseLRC, splitCaption, cueIndexAt } from '../src/music.js';

const file = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('single-line and bilingual LRC captions can coexist', () => {
  assert.deepEqual(splitCaption('Tớ thích cậu.'), { original: '', translation: 'Tớ thích cậu.' });
  assert.deepEqual(splitCaption('Original line || Lời dịch'), { original: 'Original line', translation: 'Lời dịch' });
  assert.deepEqual(splitCaption(' || Dịch'), { original: '', translation: 'Dịch' });
});

test('timestamp search supports seeking backwards and a positive subtitle delay', () => {
  const lines = parseLRC('[00:02.00]Start\n[00:07.20]Middle\n[00:10.00]End');
  assert.equal(cueIndexAt(lines, 0), -1);
  assert.equal(cueIndexAt(lines, 2), 0);
  assert.equal(cueIndexAt(lines, 7.2), 1);
  assert.equal(cueIndexAt(lines, 3, 2), -1);
  assert.equal(cueIndexAt(lines, 4, 2), 0);
  assert.equal(cueIndexAt(lines, 11, 2), 1);
  assert.equal(cueIndexAt(lines, 100), 2);
  assert.equal(cueIndexAt([], 100), -1);
});

test('every music controller element is represented by a real HTML ID', () => {
  const html = file('index.html');
  const music = file('src/music.js');
  for (const [, id] of music.matchAll(/\$\('([^']+)'\)/g)) {
    assert.ok(html.includes('id="' + id + '"'), 'Missing DOM id: ' + id);
  }
  assert.match(html, /type="range" id="seek-slider"/);
  assert.match(html, /type="file" accept="\.lrc/);
  assert.match(html, /<details class="subtitle-tools"/);
  assert.match(music, /setSubtitleDelay/);
  assert.match(music, /player\.seekTo/);
});

test('caption preview stays client-side, avoids innerHTML and respects UTF-8 file limits', () => {
  const music = file('src/music.js');
  const scope = music.slice(music.indexOf('function installLyrics('), music.indexOf('function draw()'));
  assert.match(scope, /parseLRC/);
  assert.doesNotMatch(scope, /innerHTML/);
  assert.match(scope, /file\.text\(\)/);
  assert.match(scope, /file\.size > 300000/);
  assert.match(music, /el\.current\.textContent/);
});

test('mobile resize uses the actual initialized viewport variable', () => {
  const scene = file('src/scene.js');
  assert.match(scene, /mobileViewport = w <= 700/);
  assert.match(scene, /mobileViewport \? 1\.35 : 1\.7/);
  assert.match(scene, /visibilitychange/);
  assert.match(scene, /const rightForearm = new THREE\.Group/);
});
