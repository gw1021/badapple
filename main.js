// Tilt-based Apple Catcher Game
// - Gyroscope accelerometer control with iOS permission
// - Touch/drag fallback and desktop keyboard arrows
// - Score, lives, increasing difficulty, calibration, restart

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const hudScore = document.getElementById('score');
const hudLives = document.getElementById('lives');

const overlay = document.getElementById('overlay');
const gameoverOverlay = document.getElementById('gameover');
const finalScoreEl = document.getElementById('finalScore');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const calibrateBtn = document.getElementById('calibrateBtn');
const touchModeBtn = document.getElementById('touchModeBtn');
const touchGuide = document.getElementById('touchGuide');

// Game state
const state = {
  playing: false,
  score: 0,
  lives: 3,
  basketX: 0,
  basketY: 0,
  basketW: 110,
  basketH: 24,
  apples: [], // now generic: items can be apple or bomb
  spawnInterval: 1200,
  lastSpawn: 0,
  appleBaseSpeed: 160,
  gravity: 10,
  inputMode: 'tilt', // 'tilt' | 'touch' | 'keys'
  tiltZero: 0, // calibration offset
  tiltAlpha: 0.12, // smoothing
  smoothedTilt: 0,
  bombChance: 0.3, // 30% chance a spawn is a bomb
  basketFlashColor: null,
  basketFlashUntil: 0,
};

// Resize canvas to full screen with DPR scaling
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(canvas.clientWidth * dpr);
  canvas.height = Math.floor(canvas.clientHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  state.basketY = canvas.clientHeight - 64;
}

function clamp(v, min, max) { return v < min ? min : v > max ? max : v; }

function resetGame() {
  state.playing = true;
  state.score = 0;
  state.lives = 3;
  state.apples = [];
  state.spawnInterval = 1200;
  state.appleBaseSpeed = 160;
  state.lastSpawn = performance.now();
  state.basketX = canvas.clientWidth / 2 - state.basketW / 2;
  hudScore.textContent = '0';
  hudLives.textContent = '3';
  overlay.classList.remove('visible');
  gameoverOverlay.classList.remove('visible');
}

function endGame() {
  state.playing = false;
  finalScoreEl.textContent = state.score.toString();
  gameoverOverlay.classList.add('visible');
}

// Apple object helper
function spawnDrop() {
  const size = 26 + Math.random() * 10; // px
  const x = Math.random() * (canvas.clientWidth - size);
  const y = -size - 10;
  const speed = state.appleBaseSpeed + Math.random() * 80;
  const spin = (Math.random() * 2 - 1) * 0.05;
  const type = Math.random() < state.bombChance ? 'bomb' : 'apple';
  state.apples.push({ type, x, y, size, speed, spin, rot: 0 });
}

// Input handling
let tiltSupported = false;
let lastTouchX = null;
let keys = { left: false, right: false };

function handleDeviceOrientation(e) {
  // gamma: left-right tilt on most devices
  const gamma = e.gamma;
  if (typeof gamma !== 'number') return;
  tiltSupported = true;
  const raw = gamma - state.tiltZero; // apply calibration
  // normalize: cap to [-30, 30] degrees
  const capped = clamp(raw, -30, 30);
  // smoothing
  state.smoothedTilt = state.smoothedTilt + state.tiltAlpha * (capped - state.smoothedTilt);
}

function requestSensorPermissionIfNeeded() {
  const w = window;
  // iOS 13+ requires permission
  const needsPermission = typeof w.DeviceOrientationEvent !== 'undefined' &&
    typeof w.DeviceOrientationEvent.requestPermission === 'function';
  if (needsPermission) {
    return w.DeviceOrientationEvent.requestPermission().then((res) => {
      if (res === 'granted') return true; else return false;
    }).catch(() => false);
  }
  // Other platforms: no explicit permission
  return Promise.resolve(true);
}

function setupTilt() {
  window.addEventListener('deviceorientation', handleDeviceOrientation, true);
}

function calibrateTilt() {
  // Set current orientation as zero; use last measured tilt
  state.tiltZero += state.smoothedTilt;
  state.smoothedTilt = 0;
}

// Touch fallback
function setupTouch() {
  const el = canvas;
  let active = false;
  el.addEventListener('pointerdown', (e) => {
    active = true; lastTouchX = e.clientX;
  });
  el.addEventListener('pointermove', (e) => {
    if (!active) return;
    const dx = e.clientX - lastTouchX;
    state.basketX += dx;
    lastTouchX = e.clientX;
  });
  el.addEventListener('pointerup', () => { active = false; lastTouchX = null; });
  el.addEventListener('pointercancel', () => { active = false; lastTouchX = null; });
}

// Keyboard for desktop testing
function setupKeys() {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
  });
}

function updateBasket(dt) {
  let vx = 0;
  if (state.inputMode === 'tilt' && tiltSupported) {
    // Map [-30, 30] to horizontal velocity
    vx = state.smoothedTilt / 30; // -1..1
    const maxSpeed = 520; // px/s
    state.basketX += vx * maxSpeed * dt;
  } else if (state.inputMode === 'touch') {
    // handled in pointermove by dragging
  } else if (state.inputMode === 'keys') {
    const speed = 420;
    if (keys.left) state.basketX -= speed * dt;
    if (keys.right) state.basketX += speed * dt;
  }
  state.basketX = clamp(state.basketX, 0, canvas.clientWidth - state.basketW);
}

function updateApples(dt) {
  // Difficulty ramp
  const targetSpawn = Math.max(420, 1200 - state.score * 6);
  state.spawnInterval += (targetSpawn - state.spawnInterval) * 0.02;
  state.appleBaseSpeed = 160 + Math.min(360, state.score * 3);

  if (performance.now() - state.lastSpawn > state.spawnInterval) {
    spawnDrop();
    state.lastSpawn = performance.now();
  }
  for (const a of state.apples) {
    a.y += (a.speed + state.gravity) * dt;
    a.rot += a.spin;
  }
  // Collision & cleanup
  const basket = { x: state.basketX, y: state.basketY, w: state.basketW, h: state.basketH };
  const kept = [];
  for (const a of state.apples) {
    const ax = a.x + a.size / 2;
    const ay = a.y + a.size;
    const hit = ax >= basket.x && ax <= basket.x + basket.w &&
                ay >= basket.y && ay <= basket.y + basket.h + 6;
    if (hit) {
      if (a.type === 'apple') {
        state.score += 1;
        hudScore.textContent = state.score.toString();
      } else if (a.type === 'bomb') {
        // bomb penalty
        state.lives -= 1;
        hudLives.textContent = Math.max(state.lives, 0).toString();
        flashBasket('#ff6b6b');
        if (state.lives <= 0) { endGame(); }
      }
      continue; // remove after catch
    }
    if (a.y > canvas.clientHeight + 60) {
      // Only penalize for missed apples; bombs falling off are safe
      if (a.type === 'apple') {
        state.lives -= 1;
        hudLives.textContent = Math.max(state.lives, 0).toString();
        if (state.lives <= 0) endGame();
      }
      continue; // drop removed
    }
    kept.push(a);
  }
  state.apples = kept;
}

function draw() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);
  // Background stars
  ctx.fillStyle = '#0d1022';
  ctx.fillRect(0, 0, w, h);
  // Basket (flash red when hit by bomb)
  const now = performance.now();
  const basketColor = now < state.basketFlashUntil && state.basketFlashColor ? state.basketFlashColor : '#7cffb2';
  ctx.fillStyle = basketColor;
  const r = 8;
  roundRect(ctx, state.basketX, state.basketY, state.basketW, state.basketH, r);
  ctx.fill();
  // Apples
  for (const a of state.apples) {
    if (a.type === 'apple') drawApple(a);
    else drawBomb(a);
  }
}

function drawApple(a) {
  const { x, y, size } = a;
  ctx.save();
  ctx.translate(x + size / 2, y + size / 2);
  ctx.rotate(a.rot);
  // body
  ctx.fillStyle = '#ff6b6b';
  ctx.beginPath();
  ctx.ellipse(0, 2, size * 0.42, size * 0.36, 0, 0, Math.PI * 2);
  ctx.fill();
  // shine
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.ellipse(-size * 0.1, -size * 0.02, size * 0.08, size * 0.14, 0.4, 0, Math.PI * 2);
  ctx.fill();
  // leaf
  ctx.fillStyle = '#7cffb2';
  ctx.beginPath();
  ctx.ellipse(size * 0.12, -size * 0.26, size * 0.14, size * 0.06, -0.5, 0, Math.PI * 2);
  ctx.fill();
  // stem
  ctx.strokeStyle = '#5a3a1b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.24);
  ctx.lineTo(0, -size * 0.34);
  ctx.stroke();
  ctx.restore();
}

function drawBomb(a) {
  const { x, y, size } = a;
  ctx.save();
  ctx.translate(x + size / 2, y + size / 2);
  ctx.rotate(a.rot);
  // body: dark grey
  ctx.fillStyle = '#2a2f3a';
  ctx.beginPath();
  ctx.arc(0, 4, size * 0.38, 0, Math.PI * 2);
  ctx.fill();
  // fuse
  ctx.strokeStyle = '#5a3a1b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.2);
  ctx.quadraticCurveTo(size * 0.12, -size * 0.34, size * 0.2, -size * 0.42);
  ctx.stroke();
  // spark
  ctx.fillStyle = '#ffcc66';
  ctx.beginPath();
  ctx.arc(size * 0.22, -size * 0.44, size * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function flashBasket(color = '#ff6b6b', duration = 220) {
  state.basketFlashColor = color;
  state.basketFlashUntil = performance.now() + duration;
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

let lastTs = 0;
function loop(ts) {
  const dt = Math.min(0.05, (ts - lastTs) / 1000) || 0.016;
  lastTs = ts;
  if (state.playing) {
    updateBasket(dt);
    updateApples(dt);
    draw();
  } else {
    draw();
  }
  requestAnimationFrame(loop);
}

// Wire UI
startBtn.addEventListener('click', async () => {
  state.inputMode = 'tilt';
  const ok = await requestSensorPermissionIfNeeded();
  if (ok) {
    setupTilt();
    tiltSupported = true; // assume, will be confirmed by events
    touchGuide.classList.add('hidden');
  } else {
    // fallback to touch
    state.inputMode = 'touch';
    touchGuide.classList.remove('hidden');
  }
  resetGame();
});

touchModeBtn.addEventListener('click', () => {
  state.inputMode = 'touch';
  touchGuide.classList.remove('hidden');
  resetGame();
});

restartBtn.addEventListener('click', () => {
  resetGame();
});

calibrateBtn.addEventListener('click', () => {
  calibrateTilt();
});

// Init
window.addEventListener('resize', resize);
resize();
setupTouch();
setupKeys();
requestAnimationFrame(loop);

// Prevent scroll/bounce on mobile
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
