// Orb Runner: a small starter game.
// Structure: state -> input -> update(dt) -> draw() -> repeat via requestAnimationFrame.

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;

// ---------- Input ----------
const keys = new Set();

window.addEventListener("keydown", (e) => {
  // Stop arrow keys and space from scrolling the page
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
    e.preventDefault();
  }
  keys.add(e.key.toLowerCase());

  if (e.key === " " && (state.mode === "title" || state.mode === "over")) {
    startGame();
  }
  if (e.key.toLowerCase() === "p") togglePause();
});

window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

function isDown(...names) {
  return names.some((n) => keys.has(n));
}

// Touch / drag: dragging anywhere on the canvas moves the player by the same amount,
// like a trackpad, so your finger never covers the player.
let drag = null;
const touchMove = { x: 0, y: 0 };

canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault(); // stops Safari selecting text or showing the long-press menu
  if (state.mode !== "playing") return;
  drag = { x: e.clientX, y: e.clientY };
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener("pointermove", (e) => {
  if (!drag) return;
  // Convert screen pixels to canvas pixels (the canvas is scaled to fit the screen)
  const scale = W / canvas.getBoundingClientRect().width;
  touchMove.x += (e.clientX - drag.x) * scale;
  touchMove.y += (e.clientY - drag.y) * scale;
  drag = { x: e.clientX, y: e.clientY };
});

function endDrag() {
  drag = null;
}
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);

function togglePause() {
  if (state.mode === "playing" || state.mode === "paused") {
    state.mode = state.mode === "playing" ? "paused" : "playing";
  }
}

const startBtn = document.getElementById("start-btn");
const pauseBtn = document.getElementById("pause-btn");

startBtn.addEventListener("click", () => {
  startBtn.blur(); // so pressing Space later doesn't "click" it again
  startGame();
});

pauseBtn.addEventListener("click", () => {
  pauseBtn.blur();
  togglePause();
});

// Show the right buttons for the current screen (called every frame, cheap)
function updateButtons() {
  const showStart = state.mode === "title" || state.mode === "over";
  startBtn.hidden = !showStart;
  startBtn.textContent = state.mode === "over" ? "Play again" : "Start";
  pauseBtn.textContent = state.mode === "paused" ? "Resume" : "Pause";
  pauseBtn.disabled = showStart;
}

// Pause automatically when the tab is hidden (switching apps on a phone)
document.addEventListener("visibilitychange", () => {
  if (document.hidden && state.mode === "playing") state.mode = "paused";
});

// ---------- High score (saved in the browser) ----------
function loadBest() {
  try {
    return Number(localStorage.getItem("orbRunnerBest")) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    localStorage.setItem("orbRunnerBest", String(value));
  } catch {
    // Storage can be blocked (private mode); the game still works without it
  }
}

// ---------- Game state ----------
const state = {
  mode: "title", // title | playing | paused | over
  score: 0,
  best: loadBest(),
  time: 0,
  player: null,
  orb: null,
  hazards: [],
  spawnTimer: 0,
};

function startGame() {
  state.mode = "playing";
  state.score = 0;
  state.time = 0;
  state.hazards = [];
  state.spawnTimer = 0;
  touchMove.x = 0;
  touchMove.y = 0;
  state.player ={ x: W / 2, y: H / 2, r: 14, speed: 260 };
  state.orb = randomOrb();
}

function randomOrb() {
  return {
    x: 30 + Math.random() * (W - 60),
    y: 30 + Math.random() * (H - 60),
    r: 9,
  };
}

// Hazards enter from a random edge and drift across the screen
function spawnHazard() {
  const size = 18 + Math.random() * 18;
  const speed = 90 + Math.random() * 60 + state.time * 4; // faster over time
  const edge = Math.floor(Math.random() * 4);
  let x, y, vx, vy;

  if (edge === 0) { x = -size; y = Math.random() * H; vx = speed; vy = 0; }
  else if (edge === 1) { x = W + size; y = Math.random() * H; vx = -speed; vy = 0; }
  else if (edge === 2) { x = Math.random() * W; y = -size; vx = 0; vy = speed; }
  else { x = Math.random() * W; y = H + size; vx = 0; vy = -speed; }

  state.hazards.push({ x, y, vx, vy, size });
}

// ---------- Update ----------
function update(dt) {
  if (state.mode !== "playing") return;

  state.time += dt;
  const p = state.player;

  // Movement
  let dx = 0;
  let dy = 0;
  if (isDown("arrowleft", "a")) dx -= 1;
  if (isDown("arrowright", "d")) dx += 1;
  if (isDown("arrowup", "w")) dy -= 1;
  if (isDown("arrowdown", "s")) dy += 1;

  // Normalise so diagonal movement isn't faster
  if (dx !== 0 && dy !== 0) {
    dx *= Math.SQRT1_2;
    dy *= Math.SQRT1_2;
  }

  p.x += dx * p.speed * dt;
  p.y += dy * p.speed * dt;

  // Apply touch drag, capped so dragging fast isn't much faster than key speed.
  // Leftover movement carries over to the next frame, but only up to a small
  // amount so the player never lags far behind your finger.
  const tLen = Math.hypot(touchMove.x, touchMove.y);
  if (tLen > 0) {
    const step = Math.min(tLen, p.speed * 1.5 * dt);
    p.x += (touchMove.x / tLen) * step;
    p.y += (touchMove.y / tLen) * step;
    const left = tLen - step;
    const keep = Math.min(left, 40) / tLen;
    touchMove.x *= keep;
    touchMove.y *= keep;
  }

  p.x = clamp(p.x, p.r, W - p.r);
  p.y = clamp(p.y, p.r, H - p.r);

  // Collect orb
  if (distance(p, state.orb) < p.r + state.orb.r) {
    state.score += 1;
    state.orb = randomOrb();
  }

  // Spawn hazards, more often as time goes on
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawnHazard();
    state.spawnTimer = Math.max(0.35, 1.4 - state.time * 0.02);
  }

  // Move hazards and check collisions
  for (const h of state.hazards) {
    h.x += h.vx * dt;
    h.y += h.vy * dt;

    if (circleHitsSquare(p, h)) {
      gameOver();
      return;
    }
  }

  // Remove hazards that have left the screen
  state.hazards = state.hazards.filter(
    (h) => h.x > -60 && h.x < W + 60 && h.y > -60 && h.y < H + 60
  );
}

function gameOver() {
  state.mode = "over";
  if (state.score > state.best) {
    state.best = state.score;
    saveBest(state.best);
  }
}

// ---------- Draw ----------
function draw() {
  ctx.clearRect(0, 0, W, H);

  if (state.player) {
    // Orb
    ctx.fillStyle = "#f5c542";
    ctx.beginPath();
    ctx.arc(state.orb.x, state.orb.y, state.orb.r, 0, Math.PI * 2);
    ctx.fill();

    // Hazards
    ctx.fillStyle = "#e5484d";
    for (const h of state.hazards) {
      ctx.fillRect(h.x - h.size / 2, h.y - h.size / 2, h.size, h.size);
    }

    // Player
    ctx.fillStyle = "#4cc2ff";
    ctx.beginPath();
    ctx.arc(state.player.x, state.player.y, state.player.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Score
  ctx.fillStyle = "#e8e8f0";
  ctx.font = "18px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`Score: ${state.score}`, 12, 26);
  ctx.textAlign = "right";
  ctx.fillText(`Best: ${state.best}`, W - 12, 26);

  // Overlays
  if (state.mode === "title") {
    overlay("Orb Runner", "Collect gold orbs, dodge red blocks");
  } else if (state.mode === "paused") {
    overlay("Paused", "");
  } else if (state.mode === "over") {
    overlay("Game Over", `Score: ${state.score}`);
  }
}

function overlay(title, subtitle) {
  ctx.fillStyle = "rgba(10, 12, 18, 0.7)";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#e8e8f0";
  ctx.textAlign = "center";
  ctx.font = "bold 48px system-ui, -apple-system, sans-serif";
  ctx.fillText(title, W / 2, H / 2 - 50);
  ctx.font = "22px system-ui, -apple-system, sans-serif";
  ctx.fillText(subtitle, W / 2, H / 2 - 10);
}

// ---------- Helpers ----------
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function circleHitsSquare(c, sq) {
  const half = sq.size / 2;
  const nearestX = clamp(c.x, sq.x - half, sq.x + half);
  const nearestY = clamp(c.y, sq.y - half, sq.y + half);
  return Math.hypot(c.x - nearestX, c.y - nearestY) < c.r;
}

// ---------- Game loop ----------
let last = performance.now();

function loop(now) {
  // dt = seconds since last frame, capped so a background tab doesn't cause a huge jump
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  update(dt);
  draw();
  updateButtons();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
