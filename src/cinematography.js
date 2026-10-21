// Deterministic, audio-driven camera direction (seconds, world units).
// No render-time timers: pausing or seeking the song does not desynchronize the shot.
export const CAMERA_KEYS = {
  // Three deliberate beats, not a constant orbit around the character.
  desktop: [
    { at: 0, eye: [.35, 3.35, 11.4], look: [0, 1.45, 0], fov: 44 },
    { at: 72, eye: [.85, 3.05, 9.55], look: [.55, 1.55, 0], fov: 42 },
    { at: 142, eye: [1.05, 2.9, 7.1], look: [.9, 1.72, 0], fov: 39 },
    { at: 169, eye: [1.05, 2.9, 7.1], look: [.9, 1.72, 0], fov: 39 }
  ],
  mobile: [
    { at: 0, eye: [.25, 3.15, 11.2], look: [0, 1.15, 0], fov: 51 },
    { at: 72, eye: [.75, 3, 9.9], look: [.45, 1.35, 0], fov: 50 },
    { at: 142, eye: [.95, 2.88, 7.8], look: [.85, 1.58, 0], fov: 47 },
    { at: 169, eye: [.95, 2.88, 7.8], look: [.85, 1.58, 0], fov: 47 }
  ]
};
export const FINALE_DURATION = 5.8;
export const FINALE_POSE = {
  desktop: { eye: [1.28, 2.82, 5.65], look: [1.15, 2.02, 0], fov: 37 },
  mobile: { eye: [1.28, 2.82, 6.1], look: [1.12, 1.95, 0], fov: 44 }
};
export function clamp01(value) { return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)); }
export function smooth(value) { const x = clamp01(value); return x * x * (3 - 2 * x); }
export function lerp(a, b, f) { return a + (b - a) * f; }
export function interpolatePose(a, b, f) {
  const t = clamp01(f);
  return {
    eye: a.eye.map((v, i) => lerp(v, b.eye[i], t)),
    look: a.look.map((v, i) => lerp(v, b.look[i], t)),
    fov: lerp(a.fov, b.fov, t)
  };
}
export function cameraPoseAt(seconds, mobile = false) {
  const keys = mobile ? CAMERA_KEYS.mobile : CAMERA_KEYS.desktop;
  const time = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  for (let i = 0; i < keys.length - 1; i++) {
    const left = keys[i], right = keys[i + 1];
    if (time <= right.at) return interpolatePose(left, right, smooth((time - left.at) / (right.at - left.at)));
  }
  return interpolatePose(keys[keys.length - 1], keys[keys.length - 1], 0);
}
export function finalePoseAt(origin, elapsed, mobile = false) {
  const target = FINALE_POSE[mobile ? 'mobile' : 'desktop'];
  // Lifting the head starts later than the camera movement.
  const cameraAmount = smooth(elapsed / FINALE_DURATION);
  const lookUpAmount = smooth((elapsed - 2.1) / 3.1);
  return { camera: interpolatePose(origin, target, cameraAmount), lookUpAmount, cameraAmount };
}
