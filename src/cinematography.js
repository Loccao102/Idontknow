// Deterministic, audio-driven camera direction (seconds, world units).
// No render-time timers: pausing or seeking the song does not desynchronize the shot.
export const CAMERA_KEYS = {
  desktop: [
    { at: 0,  eye: [.55, 3.55, 11.8], look: [-.3, 1.45, 0], fov: 44 },
    { at: 35, eye: [-1.25, 3.2, 10.1], look: [-.1, 1.58, 0], fov: 41 },
    { at: 76, eye: [2.65, 2.75, 8.4], look: [1, 1.65, -.1], fov: 40 },
    { at: 113, eye: [1.75, 2.55, 7.4], look: [.95, 1.67, .05], fov: 39 },
    { at: 150, eye: [.7, 3.25, 9.2], look: [.3, 1.55, 0], fov: 43 },
    { at: 169, eye: [.7, 3.25, 9.2], look: [.3, 1.55, 0], fov: 43 }
  ],
  mobile: [
    { at: 0, eye: [.35, 3.15, 11.4], look: [0, .72, 0], fov: 51 },
    { at: 35, eye: [-.65, 3.15, 10.4], look: [0, 1.05, 0], fov: 51 },
    { at: 76, eye: [1.75, 2.75, 9], look: [.75, 1.5, 0], fov: 51 },
    { at: 113, eye: [1.55, 2.65, 8], look: [1, 1.68, 0], fov: 49 },
    { at: 150, eye: [.55, 3.1, 10], look: [.2, 1.35, 0], fov: 51 },
    { at: 169, eye: [.55, 3.1, 10], look: [.2, 1.35, 0], fov: 51 }
  ]
};
export const FINALE_DURATION = 6.2;
export const FINALE_POSE = {
  desktop: { eye: [1.33, 2.85, 5.45], look: [1.27, 2.11, 0], fov: 37 },
  mobile: { eye: [1.35, 2.87, 6.15], look: [1.27, 2.11, 0], fov: 45 }
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
  const lookUpAmount = smooth((elapsed - 1.8) / 3.5);
  return { camera: interpolatePose(origin, target, cameraAmount), lookUpAmount, cameraAmount };
}
