// Core game state, loop, and world management

// DOM references
const landingScreen = document.getElementById("landing");
const customizePanel = document.getElementById("customizePanel");
const gameWrapper = document.getElementById("gameWrapper");
const startBtn = document.getElementById("startBtn");
const customizeBtn = document.getElementById("customizeBtn");
const customizeBack = document.getElementById("customizeBack");
const playerNameInput = document.getElementById("playerName");
const mapSelect = document.getElementById("map");
const playerDisplay = document.getElementById("playerDisplay");
const mapDisplay = document.getElementById("mapDisplay");
const scoreDisplay = document.getElementById("scoreDisplay");
const waveDisplay = document.getElementById("waveDisplay");
const livesDisplay = document.getElementById("livesDisplay");
const healthFill = document.getElementById("healthFill");
const statusMessage = document.getElementById("statusMessage");
const powerStatus = document.getElementById("powerStatus");
const pierceTime = document.getElementById("pierceTime");
const mobileToggle = document.getElementById("mobileToggle");
const mobileControls = document.getElementById("mobileControls");
const shootBtn = document.getElementById("shootBtn");
const dashBtn = document.getElementById("dashBtn");
const joystickEl = document.getElementById("joystick");
const joystickKnob = joystickEl ? joystickEl.querySelector(".joystick-knob") : null;
const bodyColorInput = document.getElementById("bodyColor");
const barrelColorInput = document.getElementById("barrelColor");
const wheelColorInput = document.getElementById("wheelColor");
const outlineColorInput = document.getElementById("outlineColor");
const turretShapeSelect = document.getElementById("turretShape");
const barrelTipSelect = document.getElementById("barrelTip");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
// Initialize mouse position to canvas center to avoid undefined angles before first move.
mousePos = { x: canvas.width / 2, y: canvas.height / 2 };
const gameOverModal = document.getElementById("gameOverModal");
const modalRestart = document.getElementById("modalRestart");
const modalQuit = document.getElementById("modalQuit");

// Map visuals
const mapColors = {
  city: "#222a38",
  forest: "#0f2f1b",
  desert: "#c6ad6b",
};

// Map obstacle styles and destructible chance
const mapObstacleStyles = {
  city: { color: "#475569", stroke: "#7c90a8", count: 5, sizeRange: [60, 120], destructibleChance: 0.4, hpRange: [80, 130] },
  forest: { color: "#1f3b29", stroke: "#3f6f52", count: 4, sizeRange: [70, 130], destructibleChance: 0.5, hpRange: [90, 140] },
  desert: { color: "#b38745", stroke: "#d8b278", count: 4, sizeRange: [70, 140], destructibleChance: 0.45, hpRange: [80, 150] },
};

// Difficulty multipliers
const difficultySettings = {
  easy: { enemySpeed: 1.6, enemyBulletSpeed: 2.6, enemyFireDelay: 80 },
  medium: { enemySpeed: 2.4, enemyBulletSpeed: 3.4, enemyFireDelay: 60 },
  hard: { enemySpeed: 3.2, enemyBulletSpeed: 4.2, enemyFireDelay: 45 },
};
const verySlow = { enemySpeed: 1.0, enemyBulletSpeed: 2.0, enemyFireDelay: 100 };

// Enemy templates
const enemyTypes = {
  light: { speed: 3.0, bulletSpeed: 4.0, fireDelay: 55, size: 26, hp: 40, score: 15 },
  medium: { speed: 2.3, bulletSpeed: 3.4, fireDelay: 60, size: 32, hp: 55, score: 20 },
  heavy: { speed: 1.6, bulletSpeed: 3.0, fireDelay: 80, size: 36, hp: 90, score: 30 },
};

// Tunables
const DAMAGE = { enemyBullet: 30, collision: 40 };
const PLAYER_BULLET_DAMAGE = 45;
const OBSTACLE_DAMAGE = 35;
const DASH_DURATION = 14;
const DASH_COOLDOWN = 160;

// Player state
const player = {
  x: canvas.width * 0.2,
  y: canvas.height * 0.5,
  size: 30,
  speed: 3,
  angle: 0,
  fireCooldown: 0,
  maxHealth: 100,
  health: 100,
  lives: 0,
  invulnTimer: 0,
  dashCooldown: 0,
  dashActive: 0,
  rapidTimer: 0,
  pierceTimer: 0,
};

let enemies = [];
let bullets = [];
let pickups = [];
let obstacles = [];
let particles = [];
let playerName = "Player";
let animationId = null;
let gameRunning = false;
let score = 0;
let settings = difficultySettings.medium;
let pickupTimer = 0;
let currentMap = "city";
let wave = 1;
let wavePauseTimer = 0;
let playerAppearance = {};
let audioCtx = null;

// Wave-based difficulty ramp: start very slow, ease into easy, then medium, then hard
function setWaveDifficulty(waveNumber) {
  if (waveNumber <= 2) {
    const t = Math.min(1, (waveNumber - 1) / 1);
    settings = {
      enemySpeed: lerp(verySlow.enemySpeed, difficultySettings.easy.enemySpeed, t),
      enemyBulletSpeed: lerp(verySlow.enemyBulletSpeed, difficultySettings.easy.enemyBulletSpeed, t),
      enemyFireDelay: lerp(verySlow.enemyFireDelay, difficultySettings.easy.enemyFireDelay, t),
    };
    return;
  }
  if (waveNumber <= 5) {
    const t = Math.min(1, (waveNumber - 2) / 3);
    settings = {
      enemySpeed: lerp(difficultySettings.easy.enemySpeed, difficultySettings.medium.enemySpeed, t),
      enemyBulletSpeed: lerp(difficultySettings.easy.enemyBulletSpeed, difficultySettings.medium.enemyBulletSpeed, t),
      enemyFireDelay: lerp(difficultySettings.easy.enemyFireDelay, difficultySettings.medium.enemyFireDelay, t),
    };
    return;
  }
  const t = Math.min(1, (waveNumber - 5) / 4);
  settings = {
    enemySpeed: lerp(difficultySettings.medium.enemySpeed, difficultySettings.hard.enemySpeed, t),
    enemyBulletSpeed: lerp(difficultySettings.medium.enemyBulletSpeed, difficultySettings.hard.enemyBulletSpeed, t),
    enemyFireDelay: lerp(difficultySettings.medium.enemyFireDelay, difficultySettings.hard.enemyFireDelay, t),
  };
}

// Reset player health, lives, dash, timers
function resetPlayerState() {
  player.x = canvas.width * 0.2;
  player.y = canvas.height * 0.5;
  player.fireCooldown = 0;
  player.health = player.maxHealth;
  player.lives = 0;
  player.invulnTimer = 60;
  player.dashCooldown = 0;
  player.dashActive = 0;
  player.rapidTimer = 0;
  player.pierceTimer = 0;
  pickupTimer = 240;
}

// Map theme
function setCanvasTheme(theme) {
  canvas.style.backgroundColor = mapColors[theme] || mapColors.city;
}

// Start the game
function startGame() {
  if (animationId !== null) return;

  statusMessage.classList.add("hidden");
  statusMessage.textContent = "";

  if (customizePanel) customizePanel.classList.add("hidden");
  landingScreen.classList.add("hidden");
  gameWrapper.classList.remove("hidden");

  playerName = (playerNameInput ? playerNameInput.value.trim() : "") || "Player";
  const mapChoice = mapSelect.value;
  currentMap = mapChoice;
  setWaveDifficulty(1);
  playerAppearance = {
    body: (bodyColorInput && bodyColorInput.value) || "#3adb76",
    barrel: (barrelColorInput && barrelColorInput.value) || "#a8ffd7",
    wheels: (wheelColorInput && wheelColorInput.value) || "#1f5138",
    outline: (outlineColorInput && outlineColorInput.value) || "#88ffd1",
    turretShape: (turretShapeSelect && turretShapeSelect.value) || "rounded",
    barrelTip: (barrelTipSelect && barrelTipSelect.value) || "standard",
  };

  playerDisplay.textContent = playerName;
  mapDisplay.textContent = mapSelect.options[mapSelect.selectedIndex].text;
  score = 0;
  wave = 1;
  wavePauseTimer = 0;
  resetPlayerState();
  updateHUD();
  setCanvasTheme(mapChoice);
  generateObstacles(mapChoice);
  bullets = [];
  pickups = [];
  enemies = [];
  particles = [];
  resetJoystick();
  startWave(wave);
  gameRunning = true;
  animationId = requestAnimationFrame(update);
}

// Restart from the game-over modal using the current selections
function restartGame() {
  if (animationId !== null) cancelAnimationFrame(animationId);
  animationId = null;
  gameRunning = false;
  hideGameOverModal();
  startGame();
}

// Return to landing screen
function returnToMenu() {
  if (animationId !== null) cancelAnimationFrame(animationId);
  animationId = null;
  gameRunning = false;
  hideGameOverModal();
  if (customizePanel) customizePanel.classList.add("hidden");
  resetJoystick();
  landingScreen.classList.remove("hidden");
  gameWrapper.classList.add("hidden");
}

function hideGameOverModal() {
  if (gameOverModal) gameOverModal.classList.add("hidden");
}

// Game over
function gameOver() {
  if (animationId !== null) cancelAnimationFrame(animationId);
  animationId = null;
  gameRunning = false;
  if (gameOverModal) {
    const text = document.getElementById("gameOverText");
    if (text) text.textContent = `Game Over, ${playerName}! Play again?`;
    gameOverModal.classList.remove("hidden");
  } else {
    alert(`Game Over, ${playerName}! Try again.`);
  }
}

// Main loop
function update() {
  if (!gameRunning) return;
  movePlayer();
  updateEnemies();
  if (player.fireCooldown > 0) player.fireCooldown -= 1;
  if (player.invulnTimer > 0) player.invulnTimer -= 1;
  if (player.dashActive > 0) player.dashActive -= 1;
  if (player.dashCooldown > 0) player.dashCooldown -= 1;
  if (player.rapidTimer > 0) player.rapidTimer -= 1;
  if (player.pierceTimer > 0) player.pierceTimer -= 1;
  updatePowerStatus();
  applyDesktopMouseAim();
  updateBullets();
  updatePickups();
  updateParticles();
  handleWaveProgression();
  draw();
  checkTankCollision();
  animationId = requestAnimationFrame(update);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawObstacles();
  drawPickups();
  drawParticles();
  drawBullets();
  const enemyPalette = {
    body: "#e74c3c",
    barrel: "#f8b4a6",
    wheels: "#5c1c17",
    outline: "#f3a8a0",
    turretShape: "rounded",
    barrelTip: "standard",
  };
  drawTank(player, playerAppearance, player.angle);
  enemies.forEach((e) => drawTank(e, enemyPalette, e.angle));
}

// HUD updates
function updateHUD() {
  healthFill.style.width = `${Math.max(0, player.health) / player.maxHealth * 100}%`;
  livesDisplay.textContent = player.lives;
  scoreDisplay.textContent = score;
  if (waveDisplay) waveDisplay.textContent = wave;
  updatePowerStatus();
}

function updatePowerStatus() {
  if (!powerStatus || !pierceTime) return;
  const rapidActive = player.rapidTimer > 0;
  const pierceActive = player.pierceTimer > 0;
  if (rapidActive && pierceActive) {
    powerStatus.textContent = "Rapid + Pierce";
  } else if (rapidActive) {
    powerStatus.textContent = "Rapid Fire";
  } else if (pierceActive) {
    powerStatus.textContent = "Piercing";
  } else {
    powerStatus.textContent = "None";
  }
  const pierceSeconds = Math.max(0, player.pierceTimer) / 60;
  pierceTime.textContent = `${pierceSeconds.toFixed(1)}s`;
}

// Obstacles
function generateObstacles(map) {
  const style = mapObstacleStyles[map] || mapObstacleStyles.city;
  obstacles = [];
  const count = style.count;
  const [minSize, maxSize] = style.sizeRange;
  let attempts = 0;
  while (obstacles.length < count && attempts < 200) {
    const width = randomRange(minSize, maxSize);
    const height = randomRange(minSize, maxSize);
    const x = randomRange(20, canvas.width - width - 20);
    const y = randomRange(20, canvas.height - height - 20);
    const obs = {
      x,
      y,
      width,
      height,
      destructible: Math.random() < style.destructibleChance,
      hp: 0,
      maxHp: 0,
    };
    if (obs.destructible) {
      const [minHp, maxHp] = style.hpRange;
      obs.hp = randomRange(minHp, maxHp);
      obs.maxHp = obs.hp;
    }
    const overlapsStart = rectanglesOverlap({ x, y, width, height }, { x: player.x, y: player.y, width: 80, height: 80 });
    const overlapsExisting = obstacles.some((o) => rectanglesOverlap(obs, o));
    if (!overlapsStart && !overlapsExisting) {
      obstacles.push(obs);
    }
    attempts += 1;
  }
}

function placeEnemySafely(enemy) {
  const safeDistance = 140;
  let attempts = 0;
  while (attempts < 120) {
    enemy.x = Math.random() * (canvas.width - enemy.size);
    enemy.y = Math.random() * (canvas.height - enemy.size);
    const rect = { x: enemy.x, y: enemy.y, width: enemy.size, height: enemy.size };
    const overlapsPlayer = distance(enemy.x, enemy.y, player.x, player.y) < safeDistance;
    const overlapsObstacle = obstacles.some((obs) => rectanglesOverlap(rect, obs));
    const overlapsEnemy = enemies.some((e) =>
      rectanglesOverlap(rect, { x: e.x, y: e.y, width: e.size, height: e.size })
    );
    if (!overlapsPlayer && !overlapsObstacle && !overlapsEnemy) return true;
    attempts += 1;
  }
  return false;
}

function drawPickups() {
  pickups.forEach((p) => {
    ctx.save();
    const cx = p.x + p.size / 2;
    const cy = p.y + p.size / 2;
    if (p.type === "health") {
      ctx.fillStyle = "#8ef7c2";
      ctx.strokeStyle = "#2c9a6b";
      ctx.lineWidth = 2;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.strokeRect(p.x, p.y, p.size, p.size);
      ctx.strokeStyle = "#1f5138";
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy);
      ctx.lineTo(cx + 4, cy);
      ctx.moveTo(cx, cy - 4);
      ctx.lineTo(cx, cy + 4);
      ctx.stroke();
    } else if (p.type === "rapid") {
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy - 8);
      ctx.lineTo(cx + 4, cy);
      ctx.lineTo(cx - 4, cy + 8);
      ctx.closePath();
      ctx.fill();
    } else if (p.type === "pierce") {
      ctx.fillStyle = "#60a5fa";
      ctx.beginPath();
      ctx.moveTo(cx, cy - 10);
      ctx.lineTo(cx + 8, cy);
      ctx.lineTo(cx, cy + 10);
      ctx.lineTo(cx - 8, cy);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  });
}

function drawObstacles() {
  const style = mapObstacleStyles[currentMap] || mapObstacleStyles.city;
  obstacles.forEach((obs) => {
    ctx.save();
    ctx.fillStyle = style.color;
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = 3;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 10);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
    }
    if (obs.destructible && obs.maxHp) {
      const hpPct = Math.max(0, obs.hp) / obs.maxHp;
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(obs.x, obs.y - 6, obs.width * hpPct, 4);
    }
    ctx.restore();
  });
}

function drawParticles() {
  particles.forEach((p) => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillRect(p.x, p.y, p.size, p.size);
    ctx.globalAlpha = 1;
  });
}

function drawBullets() {
  bullets.forEach((b) => {
    ctx.fillStyle = b.color || (b.owner === "player" ? "#8ff0c9" : "#ffcf70");
    ctx.fillRect(b.x - b.size / 2, b.y - b.size / 2, b.size, b.size);
  });
}

function startWave(waveNumber) {
  wave = waveNumber;
  wavePauseTimer = 0;
  setWaveDifficulty(waveNumber);
  bullets = bullets.filter((b) => b.owner === "player");
  enemies = [];
  spawnEnemiesForWave(wave);
  updateHUD();
}

// Audio helper
function playTone(freq, duration, type = "sine") {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = 0.15;
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    // ignore audio errors (e.g., autoplay restrictions)
  }
}
