import * as THREE from 'three';
import { cameraPoseAt, finalePoseAt, FINALE_DURATION } from './cinematography.js';

// Everything in this scene is built with geometry: no stock footage or 2D character cut-outs.
export function createScene(canvas, options = {}) {
  const small = matchMedia('(max-width: 700px)').matches;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.35 : 1.7));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.34;
  renderer.shadowMap.enabled = !small;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x09131e);
  scene.fog = new THREE.FogExp2(0x0c1922, 0.035);
  const camera = new THREE.PerspectiveCamera(small ? 51 : 44, innerWidth / innerHeight, .1, 120);
  let mobileViewport = innerWidth <= 700;
  const initialPose = cameraPoseAt(0, mobileViewport);
  camera.position.fromArray(initialPose.eye);
  camera.lookAt(new THREE.Vector3().fromArray(initialPose.look));

  scene.add(new THREE.HemisphereLight(0x8cb0d4, 0x202118, 1.12));
  const moonlight = new THREE.DirectionalLight(0x9fbee3, 2.25);
  moonlight.position.set(-5, 11, -8);
  scene.add(moonlight);
  if (!small) {
    moonlight.castShadow = true;
    moonlight.shadow.mapSize.set(1024, 1024);
    moonlight.shadow.camera.left = -9;
    moonlight.shadow.camera.right = 9;
    moonlight.shadow.camera.top = 9;
    moonlight.shadow.camera.bottom = -9;
    moonlight.shadow.normalBias = .045;
  }
  const fireLight = new THREE.PointLight(0xff8641, 65, 12, 1.8);
  fireLight.position.set(-1.52, 1.25, .95);
  scene.add(fireLight);
  const fill = new THREE.PointLight(0xf5c49d, 11, 8, 1.8);
  fill.position.set(3, 3.2, 4.5);
  scene.add(fill);

  const mat = (hex, rough = .95, metal = 0) => new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: metal, flatShading: true });
  const bark = mat(0x5b382b), cutWood = mat(0xa17a54), stone = mat(0x56605a), jacket = mat(0x596e65), trouser = mat(0x454c58), boots = mat(0x262a32), skin = mat(0xd39b7e), hair = mat(0x251e20), scarf = mat(0xb16e59);
  function mesh(geometry, material, parent = scene, x = 0, y = 0, z = 0) {
    const item = new THREE.Mesh(geometry, material);
    item.position.set(x, y, z);
    item.castShadow = true;
    item.receiveShadow = true;
    parent.add(item);
    return item;
  }
  const ball = (parent, material, x, y, z, sx, sy, sz) => {
    const o = mesh(new THREE.SphereGeometry(1, 12, 9), material, parent, x, y, z);
    o.scale.set(sx, sy, sz);
    return o;
  };
  function between(parent, a, b, radius, material, segments = 9) {
    const p1 = new THREE.Vector3(...a), p2 = new THREE.Vector3(...b);
    const obj = mesh(new THREE.CylinderGeometry(radius * .92, radius, p1.distanceTo(p2), segments), material, parent);
    obj.position.copy(p1.clone().add(p2).multiplyScalar(.5));
    obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p2.clone().sub(p1).normalize());
    return obj;
  }
  function makeGlowTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const cx = c.getContext('2d');
    const g = cx.createRadialGradient(64, 64, 1, 64, 64, 63);
    g.addColorStop(0, 'rgba(255,251,208,1)');
    g.addColorStop(.16, 'rgba(255,198,106,.85)');
    g.addColorStop(.4, 'rgba(249,113,54,.25)');
    g.addColorStop(1, 'rgba(229,91,32,0)');
    cx.fillStyle = g; cx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }
  const glowTexture = makeGlowTexture();
  function glow(parent, x, y, z, scale, color = 0xffbb77, opacity = 1) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
    sprite.position.set(x, y, z);
    sprite.scale.set(scale, scale, 1);
    parent.add(sprite);
    return sprite;
  }

  // Low rolling terrain, dark silhouette woods, crescent-like moonlight, and drifting stars.
  const geo = new THREE.PlaneGeometry(110, 110, 50, 50);
  geo.rotateX(-Math.PI / 2);
  const positions = geo.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i), r = Math.hypot(x, z);
    positions.setY(i, (Math.sin(x * .52) * Math.cos(z * .38) + Math.sin(z * .17 + x * .24)) * .42 * Math.min(1, Math.max(0, (r - 4) / 8)) - .12);
  }
  geo.computeVertexNormals();
  const ground = mesh(geo, mat(0x25342e), scene, 0, -.17, 0);
  ground.castShadow = false; ground.receiveShadow = true;
  const clearings = [];
  const rng = (() => { let n = 91724; return () => { n = (n * 1664525 + 1013904223) >>> 0; return n / 4294967296; }; })();
  const treeDark = [mat(0x182e2c), mat(0x203a35), mat(0x29433c), mat(0x1c2a2c)];
  const trunk = mat(0x332e27);
  function addPine(x, z, h, m) {
    const group = new THREE.Group(); group.position.set(x, 0, z); scene.add(group);
    const trunkMesh = mesh(new THREE.CylinderGeometry(.075 * h, .11 * h, .36 * h, 6), trunk, group, 0, .26 * h, 0);
    trunkMesh.castShadow = false;
    for (let j = 0; j < 3; j++) {
      const c = mesh(new THREE.ConeGeometry(h * (.29 - j * .045), h * .55, 7), m, group, 0, h * (.42 + j * .2), 0);
      c.castShadow = false;
    }
    return group;
  }
  for (let i = 0; i < (small ? 65 : 110); i++) {
    const x = (rng() - .5) * 55, z = -6 - rng() * 32;
    if (Math.abs(x) < 5 && z > -9) continue;
    addPine(x, z, 2.6 + rng() * 7.2, treeDark[Math.floor(rng() * treeDark.length)]);
  }
  for (let i = 0; i < 22; i++) {
    const x = (rng() - .5) * 33, z = 4 + rng() * 15;
    if (Math.abs(x) < 5 && z < 9) continue;
    addPine(x, z, 3 + rng() * 4.5, treeDark[Math.floor(rng() * 2)]);
  }
  const moonHalo = glow(scene, -8, 10, -27, 9, 0xa0b9e2, .21);
  const moon = mesh(new THREE.SphereGeometry(1.1, 24, 16), new THREE.MeshBasicMaterial({ color: 0xc7d4df }), scene, -8, 10, -26.6);
  moon.castShadow = false;
  glow(scene, -8, 10, -27, 3.6, 0xc2d3e5, .19);
  const starVerts = [], starColors = [];
  for (let i = 0; i < 660; i++) {
    const x = (rng() - .5) * 86, y = 4 + rng() * 33, z = -26 - rng() * 49;
    starVerts.push(x, y, z);
    const c = new THREE.Color().setHSL(.58 + rng() * .12, .17, .42 + rng() * .35);
    starColors.push(c.r, c.g, c.b);
  }
  const stGeo = new THREE.BufferGeometry();
  stGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVerts, 3));
  stGeo.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
  const stars = new THREE.Points(stGeo, new THREE.PointsMaterial({ size: .14, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: .85, depthWrite: false }));
  scene.add(stars);
  for (let i = 0; i < 70; i++) {
    const x = (rng() - .5) * 13, z = (rng() - .5) * 13, d = Math.hypot(x + .2, z);
    if (d < 2 || d > 7) continue;
    const patch = ball(scene, mat(i % 2 ? 0x455344 : 0x344538), x, .015, z, .05 + rng() * .13, .08 + rng() * .19, .05 + rng() * .12);
    patch.castShadow = false;
    clearings.push(patch);
  }
  for (let i = 0; i < 65; i++) {
    const x = (rng() - .5) * 14, z = (rng() - .5) * 12;
    if (Math.hypot(x + 1.4, z - .7) < 1.7) continue;
    const pebble = ball(scene, stone, x, .035, z, .06 + rng() * .15, .05, .08 + rng() * .1);
    pebble.castShadow = false;
  }

  // Hand-built campfire with moving translucent flames, embers, glowing rocks and smoke.
  const fire = new THREE.Group(); fire.position.set(-1.55, 0, .9); scene.add(fire);
  const burnt = mat(0x432b26), embers = new THREE.MeshBasicMaterial({ color: 0xff9e43 });
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    const rock = ball(fire, i % 3 ? stone : mat(0x766b5b), Math.cos(a) * .82, .12, Math.sin(a) * .61, .22 + rng() * .12, .18 + rng() * .08, .19 + rng() * .1);
    rock.rotation.y = a;
  }
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI / 5;
    const log = mesh(new THREE.CylinderGeometry(.16, .2, 2.1, 9), bark, fire, Math.sin(a) * .1, .27, Math.cos(a) * .13);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = a;
    const endA = ball(fire, cutWood, Math.cos(a) * .86, .27, Math.sin(a) * .86, .13, .13, .13);
    endA.visible = false;
  }
  const coals = [];
  for (let i = 0; i < 14; i++) {
    const a = rng() * Math.PI * 2, d = rng() * .46;
    coals.push(ball(fire, embers, Math.sin(a) * d, .24, Math.cos(a) * d, .035 + rng() * .05, .02, .045));
  }
  glow(fire, 0, .78, 0, 3.75, 0xff8c41, .78);
  glow(fire, 0, .32, .04, 2.5, 0xffcf82, .52);
  // Semi-transparent shader sheets create flowing flame tongues instead of stiff cones.
  const flameVertex = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  const flameFragment = `
    precision mediump float;
    varying vec2 vUv;
    uniform float uTime;
    uniform float uSeed;
    uniform float uOpacity;
    void main() {
      float h = vUv.y;
      float wind = sin(h * 5.8 + uTime * 2.5 + uSeed) * (.03 + h * .12);
      wind += sin(h * 12.0 - uTime * 3.4 + uSeed * 1.7) * h * .025;
      float width = mix(.40, .008, pow(h, .85));
      float center = .5 + wind;
      float edge = 1.0 - smoothstep(width * .62, width, abs(vUv.x - center));
      float top = 1.0 - smoothstep(.82, 1.0, h);
      float bottom = smoothstep(0.0, .12, h);
      float flicker = .88 + .12 * sin(uTime * 12.0 + h * 10.0 + uSeed);
      float a = edge * top * bottom * flicker * uOpacity;
      vec3 red = vec3(1.0, .17, .04);
      vec3 orange = vec3(1.0, .46, .13);
      vec3 gold = vec3(1.0, .88, .48);
      vec3 color = mix(red, orange, smoothstep(.0, .65, h));
      color = mix(color, gold, pow(max(0.0, 1.0 - abs(vUv.x - center) / max(width, .005)), 3.0) * (1.0 - h) * .96);
      gl_FragColor = vec4(color, max(0.0, a));
    }
  `;
  const flames = [];
  for (let i = 0; i < (small ? 7 : 11); i++) {
    const h = 1.14 + rng() * 1.14;
    const material = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uSeed: { value: rng() * 100 }, uOpacity: { value: .6 } },
      vertexShader: flameVertex, fragmentShader: flameFragment,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    });
    const flame = mesh(new THREE.PlaneGeometry(.78 + rng() * .38, h, 1, 1), material,
      fire, (rng() - .5) * .4, .3 + h * .42, (rng() - .5) * .37);
    flame.rotation.y = (i / 11) * Math.PI;
    flames.push({ item: flame, base: flame.position.clone(), speed: 2.2 + rng() * 2, offset: rng() * 11, height: h });
    flame.castShadow = false;
  }
  const sparkG = new THREE.Group(); fire.add(sparkG);
  const sparks = [];
  for (let i = 0; i < (small ? 36 : 78); i++) {
    const p = glow(sparkG, 0, 0, 0, .09 + rng() * .16, 0xffa04e, .5 + rng() * .5);
    sparks.push({ mesh: p, seed: rng(), speed: .4 + rng() * 1.7, offset: rng() * 3.4, drift: (rng() - .5) * 1.3 });
  }
  const smokeMat = new THREE.MeshBasicMaterial({ color: 0x98a4a1, transparent: true, opacity: .05, depthWrite: false });
  const smoke = [];
  for (let i = 0; i < 7; i++) {
    const p = ball(fire, smokeMat.clone(), 0, .5, 0, .3, .34, .3);
    p.castShadow = false;
    smoke.push({ mesh: p, phase: rng(), sway: (rng() - .5) * .6 });
  }

  // The boy is rigged from meshes so his shoulders breathe and his face actually turns up.
  const boy = new THREE.Group(); boy.position.set(1.33, .02, -.05); scene.add(boy);
  const logBench = mesh(new THREE.CylinderGeometry(.34, .39, 2.35, 12), bark, scene, 1.29, .52, -.67);
  logBench.rotation.z = Math.PI / 2;
  for (const x of [.13, 2.45]) {
    const end = mesh(new THREE.CylinderGeometry(.345, .345, .035, 16), cutWood, scene, x, .52, -.67);
    end.rotation.z = Math.PI / 2;
  }
  ball(boy, trouser, 0, .99, .04, .41, .31, .33);
  const chest = new THREE.Group(); chest.position.y = 1.34; boy.add(chest);
  const torso = mesh(new THREE.CylinderGeometry(.34, .41, .83, 10), jacket, chest, 0, .04, -.09);
  torso.rotation.x = -.05;
  ball(chest, jacket, 0, .41, -.1, .38, .26, .29);
  // Hoodie collar, neck and shoulders.
  ball(chest, jacket, 0, .47, -.24, .28, .27, .25);
  between(chest, [-.28, .33, .0], [-.46, -.16, .36], .15, jacket);
  between(chest, [.28, .33, .0], [.46, -.16, .36], .15, jacket);
  const sleeveLeft = between(chest, [-.46, -.16, .36], [-.29, -.43, .77], .125, jacket);
  const sleeveRight = between(chest, [.46, -.16, .36], [.29, -.43, .77], .125, jacket);
  ball(chest, skin, -.29, -.43, .8, .115, .1, .13);
  ball(chest, skin, .29, -.43, .8, .115, .1, .13);
  for (const sign of [-1, 1]) {
    const x = sign * .22;
    between(boy, [x, .98, .1], [x * 1.48, .67, .8], .19, trouser);
    ball(boy, trouser, x * 1.48, .65, .8, .195, .18, .19);
    between(boy, [x * 1.48, .65, .8], [x * 1.5, .24, .88], .145, trouser);
    ball(boy, boots, x * 1.5, .18, 1.02, .19, .17, .33);
  }
  ball(boy, skin, 0, 1.83, -.02, .15, .17, .15);
  const collar = mesh(new THREE.TorusGeometry(.23, .105, 8, 20), scarf, boy, 0, 1.83, -.03);
  collar.rotation.x = Math.PI / 2;
  const scarfTail = mesh(new THREE.BoxGeometry(.16, .46, .09), scarf, boy, -.16, 1.58, .27);
  scarfTail.rotation.z = -.15;
  const headPivot = new THREE.Group(); headPivot.position.set(0, 2.13, .06); boy.add(headPivot);
  headPivot.rotation.x = .22;
  const head = ball(headPivot, skin, 0, 0, 0, .37, .44, .37);
  ball(headPivot, skin, -.37, -.02, 0, .08, .13, .1);
  ball(headPivot, skin, .37, -.02, 0, .08, .13, .1);
  // Each eye and brow faces toward the front of the viewer, with a small downward gaze.
  const eyes = mat(0x302626);
  const eyeMeshes = [];
  for (const sign of [-1, 1]) {
    eyeMeshes.push(ball(headPivot, eyes, sign * .146, -.07, .336, .023, .023, .011));
    const brow = mesh(new THREE.CapsuleGeometry(.014, .065, 2, 5), hair, headPivot, sign * .15, .03, .327);
    brow.rotation.z = Math.PI / 2 + sign * .09;
  }
  ball(headPivot, mat(0xb77f68), 0, -.13, .358, .055, .065, .075);
  // A subtle resting mouth: a flat line, deliberately NOT a smile in the close-up.
  const mouth = mesh(new THREE.CapsuleGeometry(.009, .046, 3, 8), mat(0x795b52), headPivot, 0, -.238, .341);
  mouth.rotation.z = Math.PI / 2;
  mouth.rotation.x = -.06;
  mouth.castShadow = false;
  ball(headPivot, hair, 0, .34, -.09, .39, .225, .38);
  for (let i = 0; i < 7; i++) {
    const px = -.31 + i * .105;
    const lock = mesh(new THREE.ConeGeometry(.105, .3 + (i % 2) * .1, 5), hair, headPivot, px, .29 + Math.sin(i * 1.3) * .045, .21);
    lock.rotation.z = -.45 + i * .12;
    lock.rotation.x = -.26;
  }
  const earCover = ball(headPivot, hair, -.29, .19, -.07, .16, .2, .27);
  earCover.rotation.z = .2;

  // A small real, extruded 3D heart that double-pulses, with translucent glow rings.
  const heartShape = new THREE.Shape();
  heartShape.moveTo(0, -.42);
  heartShape.bezierCurveTo(-.07, -.34, -.48, -.10, -.47, .14);
  heartShape.bezierCurveTo(-.45, .41, -.13, .49, 0, .21);
  heartShape.bezierCurveTo(.13, .49, .45, .41, .47, .14);
  heartShape.bezierCurveTo(.48, -.10, .07, -.34, 0, -.42);
  const heartMat = new THREE.MeshStandardMaterial({ color: 0xf36b68, emissive: 0xb93c3c, emissiveIntensity: 2.5, transparent: true, opacity: .94, roughness: .4 });
  const heart = mesh(new THREE.ExtrudeGeometry(heartShape, { depth: .12, bevelEnabled: true, bevelThickness: .09, bevelSize: .05, bevelSegments: 2, steps: 1 }), heartMat, boy, .04, 1.53, .52);
  heart.scale.setScalar(.26);
  heart.castShadow = false;
  const heartGlow = glow(boy, .04, 1.53, .54, 1.13, 0xff6666, .24);
  const heartLight = new THREE.PointLight(0xf26862, 4.5, 2, 2);
  heartLight.position.set(.04, 1.53, .72);
  boy.add(heartLight);

  const fireflies = [];
  for (let i = 0; i < (small ? 5 : 9); i++) {
    const x = (rng() - .5) * 11, y = .7 + rng() * 4.4, z = (rng() - .5) * 10;
    const p = glow(scene, x, y, z, .09 + rng() * .11, i % 3 ? 0xffad63 : 0xa9d3c5, .23 + rng() * .5);
    fireflies.push({ mesh: p, x, y, z, speed: .3 + rng(), phase: rng() * 6.28 });
  }

  let playing = false, finaleStart = 0, finaleDone = false, active = true, frame = 0;
  let storyTime = 0, prevFrameTime = 0, finaleOrigin = null;
  const clock = new THREE.Clock();
  const currentLook = new THREE.Vector3().fromArray(initialPose.look);
  const targetEye = new THREE.Vector3();
  const targetLook = new THREE.Vector3();
  function update() {
    if (!active) return;
    const t = clock.getElapsedTime();
    const movement = reduced ? .15 : 1;
    const delta = Math.min(.07, Math.max(.001, t - prevFrameTime));
    prevFrameTime = t;
    const elapsedFinale = finaleStart ? Math.max(0, t - finaleStart) : 0;
    const stage = finaleStart ? finalePoseAt(finaleOrigin, elapsedFinale, mobileViewport) : null;
    const e = stage ? stage.lookUpAmount : 0;
    fireLight.intensity = 48 + (Math.sin(t * 7) * 5 + Math.sin(t * 13) * 3) * movement;
    for (const p of flames) {
      p.item.position.x = p.base.x + Math.sin(t * p.speed + p.offset) * .115 * movement;
      p.item.scale.y = 1 + (.18 * Math.sin(t * p.speed * .8 + p.offset) * movement);
      p.item.rotation.z = Math.sin(t * 2.8 + p.offset) * .12 * movement;
      p.item.material.uniforms.uTime.value = t;
      p.item.material.uniforms.uOpacity.value = .57 + Math.sin(t * 4 + p.offset) * .15;
    }
    for (const spark of sparks) {
      const u = (t * spark.speed * .31 + spark.seed) % 1;
      spark.mesh.position.set(Math.sin(t * 1.2 + spark.offset) * .28 + spark.drift * u, .45 + u * 3.4, Math.cos(t * .8 + spark.offset) * .29);
      spark.mesh.material.opacity = (1 - u) * .86;
      spark.mesh.scale.setScalar((.1 + u * .07) * (1 - u * .5));
    }
    for (const s of smoke) {
      const p = (t * .13 + s.phase) % 1;
      s.mesh.position.set(s.sway + Math.sin(t * .4 + s.phase * 7) * .33, .7 + p * 4.4, -p * .4);
      s.mesh.scale.setScalar(.16 + p * .58);
      s.mesh.material.opacity = Math.sin(p * Math.PI) * .052;
    }
    for (const fly of fireflies) {
      fly.mesh.position.set(fly.x + Math.sin(t * fly.speed + fly.phase) * .28 * movement, fly.y + Math.cos(t * (fly.speed * .62) + fly.phase) * .31 * movement, fly.z);
      fly.mesh.material.opacity = (.23 + .3 * (1 + Math.sin(t * 1.7 + fly.phase)) / 2);
    }
    // Two pulses close together suggest a human heartbeat.
    const beat = Math.pow(Math.max(0, Math.sin(t * 7.1)), 18) + .56 * Math.pow(Math.max(0, Math.sin(t * 7.1 - .98)), 20);
    const hb = Math.min(1.4, beat) * (playing ? 1 : .55);
    const pulse = 1 + hb * .115;
    heart.scale.setScalar(.26 * pulse);
    heartGlow.scale.setScalar(1.13 + hb * .26);
    heartGlow.material.opacity = .21 + hb * .16;
    heartLight.intensity = 2.1 + hb * 2.2;
    if (!reduced) {
      boy.position.y = .02 + Math.sin(t * 1.32) * .006;
      chest.rotation.x = Math.sin(t * 1.32) * .009;
    }
    // The boy first watches the fire, glances away, then lifts his chin and meets the viewer.
    const contemplation = Math.sin(storyTime * .08 + .7) * .045 * (1 - e);
    // Keep the expression restrained: gentle look-up, tiny sidelong glance, no direct stare.
    headPivot.rotation.x = .22 - .205 * e + Math.sin(t * 1.1) * .007 * movement * (1 - e);
    headPivot.rotation.y = -.22 + .14 * e + contemplation * .28;
    headPivot.position.y = 2.13 + .026 * e + Math.sin(t * 1.55) * .008 * movement;
    boy.rotation.y = -.02 - .02 * e;
    scarfTail.rotation.z = -.15 + Math.sin(t * 1.8) * .018 * movement;
    // Blinks become less frequent during the final moment.
    const blinkWave = Math.pow(Math.max(0, Math.sin(t * .77 + .25)), 44) * (1 - .72 * e);
    for (const eye of eyeMeshes) eye.scale.y = .023 * Math.max(.35, 1 - blinkWave * .6);
    const pose = stage ? stage.camera : cameraPoseAt(reduced ? 0 : storyTime, mobileViewport);
    targetEye.fromArray(pose.eye);
    targetLook.fromArray(pose.look);
    if (!finaleStart && !reduced) {
      targetEye.x += Math.sin(t * .11) * .022;
      targetEye.y += Math.sin(t * .16) * .015;
    }
    const smoothFactor = 1 - Math.exp(-delta * (finaleStart ? 2.35 : 1.0));
    camera.position.lerp(targetEye, smoothFactor);
    currentLook.lerp(targetLook, smoothFactor);
    camera.fov += (pose.fov - camera.fov) * smoothFactor;
    camera.updateProjectionMatrix();
    camera.lookAt(currentLook);
    if (finaleStart && !finaleDone && elapsedFinale >= FINALE_DURATION) {
      finaleDone = true;
      if (typeof options.onFinaleReady === 'function') options.onFinaleReady();
    }
    stars.material.opacity = .74 + .12 * Math.sin(t * .36);
    moonHalo.material.opacity = .2 + Math.sin(t * .28) * .035;
    renderer.render(scene, camera);
    frame++;
  }
  renderer.setAnimationLoop(update);
  function resize() {
    const w = innerWidth, h = innerHeight;
    mobileViewport = w <= 700;
    camera.aspect = w / h;
    camera.fov = cameraPoseAt(storyTime, mobileViewport).fov;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.35 : 1.7));
    renderer.setSize(w, h, false);
  }
  addEventListener('resize', resize);
  return {
    setPlaying(value) { playing = !!value; },
    setMusicTime(seconds) { if (Number.isFinite(seconds)) storyTime = Math.max(0, seconds); },
    finale() {
      if (!finaleStart) {
        finaleOrigin = { eye: camera.position.toArray(), look: currentLook.toArray(), fov: camera.fov };
        finaleStart = clock.getElapsedTime() || .001;
        playing = false;
      }
    },
    reset() { finaleStart = 0; finaleOrigin = null; finaleDone = false; playing = false; storyTime = 0; },
    dispose() { active = false; renderer.setAnimationLoop(null); removeEventListener('resize', resize); renderer.dispose(); }
  };
}