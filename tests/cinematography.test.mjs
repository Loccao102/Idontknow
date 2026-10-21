import test from 'node:test';
import assert from 'node:assert/strict';
import { CAMERA_KEYS, FINALE_DURATION, cameraPoseAt, finalePoseAt, smooth, clamp01 } from '../src/cinematography.js';

test('smoothing always stays bounded and has easing at its edges', () => {
  assert.equal(smooth(-10), 0);
  assert.equal(smooth(0), 0);
  assert.equal(smooth(.5), .5);
  assert.equal(smooth(1), 1);
  assert.equal(smooth(10), 1);
  assert.equal(clamp01(Number.NaN), 0);
});
test('camera path interpolates smoothly for desktop and mobile', () => {
  for (const mobile of [false, true]) {
    const keys = mobile ? CAMERA_KEYS.mobile : CAMERA_KEYS.desktop;
    assert.deepEqual(cameraPoseAt(0, mobile).eye, keys[0].eye);
    assert.deepEqual(cameraPoseAt(999, mobile).look, keys.at(-1).look);
    for (let i = 0; i < keys.length - 1; i++) {
      const boundary = keys[i + 1].at;
      const a = cameraPoseAt(boundary - .001, mobile);
      const b = cameraPoseAt(boundary + .001, mobile);
      assert.ok(Math.hypot(...a.eye.map((n, j) => n - b.eye[j])) < .02);
      assert.ok(a.fov > 20 && a.fov < 80);
    }
  }
});
test('final reveal moves camera only and delays upward gaze', () => {
  const from = cameraPoseAt(150);
  const start = finalePoseAt(from, 0);
  assert.deepEqual(start.camera.eye, from.eye);
  assert.equal(start.lookUpAmount, 0);
  assert.equal(finalePoseAt(from, 1.7).lookUpAmount, 0);
  const middle = finalePoseAt(from, 3.2);
  assert.ok(middle.lookUpAmount > 0 && middle.lookUpAmount < 1);
  const finish = finalePoseAt(from, FINALE_DURATION);
  assert.equal(finish.cameraAmount, 1);
  assert.equal(finish.lookUpAmount, 1);
  assert.ok(finish.camera.eye[2] < from.eye[2]);
});
