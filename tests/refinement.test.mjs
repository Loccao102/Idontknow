import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CAMERA_KEYS } from '../src/cinematography.js';

const file = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('stage is focused on the boy, campfire and music without decorative hearts', () => {
  const scene = file('src/scene.js');
  const main = file('src/main.js');
  const html = file('index.html');
  assert.doesNotMatch(scene, /floatingHearts|loveTexture|heartCanvas/);
  assert.doesNotMatch(main, /const thoughts|thoughtIndex/);
  assert.doesNotMatch(html, /id="thought"/);
  assert.match(scene, /new THREE\.CapsuleGeometry\(\.009, \.046/);
  assert.doesNotMatch(scene, /new THREE\.TorusGeometry\(\.065, \.008/);
});

test('camera sticks to a small number of uninterrupted cinematic beats', () => {
  assert.equal(CAMERA_KEYS.desktop.length, 4);
  assert.equal(CAMERA_KEYS.mobile.length, 4);
  for (const beats of [CAMERA_KEYS.desktop, CAMERA_KEYS.mobile]) {
    assert.ok(beats.every((beat, i) => i === 0 || beat.at > beats[i - 1].at));
    assert.deepEqual(beats.at(-1).eye, beats.at(-2).eye);
  }
});

test('readable letter overrides are shipped after the base stylesheet', () => {
  const html = file('index.html');
  const css = file('src/refinement.css');
  assert.ok(html.indexOf('src/refinement.css') > html.indexOf('src/styles.css'));
  assert.match(css, /\.letter-sheet\s*\{/);
  assert.match(css, /max-height: 91svh/);
  assert.match(css, /-webkit-overflow-scrolling: touch/);
  assert.match(css, /\.letter-sheet p\s*\{/);
  assert.match(css, /\.letter-close\s*\{/);
  assert.match(css, /\.thought,/);
});
