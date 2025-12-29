// Gameplay logic only; UI structure is unchanged.
// Features: health/lives, waves with enemy types, dash, pickups (health/rapid/pierce),
// destructible obstacles per map, piercing shots bounce, simple audio + particles.

// DOM references
const landingScreen = document.getElementById("landing");
const gameWrapper = document.getElementById("gameWrapper");
const startBtn = document.getElementById("startBtn");
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
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
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
  lives: 3,
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
let keys = {};
let keyboardKeys = {};
let touchKeyCounts = {};
let mousePos = { x: canvas.width / 2, y: canvas.height / 2 };
const joystickState = {
  active: false,
  pointerId: null,
  base: { x: 0, y: 0 },
  vector: { x: 0, y: 0 },
  distance: 0,
  maxRadius: 70,
};
let score = 0;
let settings = difficultySettings.medium;
let pickupTimer = 0;
let currentMap = "city";
let wave = 1;
let wavePauseTimer = 0;

// Simple linear interpolation helper for scaling difficulty
function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Wave-based difficulty ramp: start very slow, ease into easy, then medium, then hard
function setWaveDifficulty(waveNumber) {
  // Waves 1-2: verySlow -> easy
  if (waveNumber <= 2) {
    const t = Math.min(1, (waveNumber - 1) / 1);
    settings = {
      enemySpeed: lerp(verySlow.enemySpeed, difficultySettings.easy.enemySpeed, t),
      enemyBulletSpeed: lerp(verySlow.enemyBulletSpeed, difficultySettings.easy.enemyBulletSpeed, t),
      enemyFireDelay: lerp(verySlow.enemyFireDelay, difficultySettings.easy.enemyFireDelay, t),
    };
    return;
  }
  // Waves 3-5: easy -> medium
  if (waveNumber <= 5) {
    const t = Math.min(1, (waveNumber - 2) / 3);
    settings = {
      enemySpeed: lerp(difficultySettings.easy.enemySpeed, difficultySettings.medium.enemySpeed, t),
      enemyBulletSpeed: lerp(difficultySettings.easy.enemyBulletSpeed, difficultySettings.medium.enemyBulletSpeed, t),
      enemyFireDelay: lerp(difficultySettings.easy.enemyFireDelay, difficultySettings.medium.enemyFireDelay, t),
    };
    return;
  }
  // Wave 6+: medium -> hard (capped)
  const t = Math.min(1, (waveNumber - 5) / 4);
  settings = {
    enemySpeed: lerp(difficultySettings.medium.enemySpeed, difficultySettings.hard.enemySpeed, t),
    enemyBulletSpeed: lerp(difficultySettings.medium.enemyBulletSpeed, difficultySettings.hard.enemyBulletSpeed, t),
    enemyFireDelay: lerp(difficultySettings.medium.enemyFireDelay, difficultySettings.hard.enemyFireDelay, t),
  };
}

// Events
startBtn.addEventListener("click", startGame);
document.addEventListener("keydown", handleKeyDown);
document.addEventListener("keyup", handleKeyUp);
canvas.addEventListener("mousemove", updateMousePosition);
canvas.addEventListener("mousedown", () => attemptPlayerShot());
if (joystickEl) joystickEl.addEventListener("pointerdown", handleJoystickStart);
window.addEventListener("pointermove", handleJoystickMove);
window.addEventListener("pointerup", handleJoystickEnd);
window.addEventListener("pointercancel", handleJoystickEnd);
setupMobileControls();
if (modalRestart) modalRestart.addEventListener("click", restartGame);
if (modalQuit) modalQuit.addEventListener("click", returnToMenu);

// Start the game: keep UI, just toggle panels
function startGame() {
  if (animationId !== null) return;

  statusMessage.classList.add("hidden");
  statusMessage.textContent = "";

  playerName = (playerNameInput ? playerNameInput.value.trim() : "") || "Player";
  const mapChoice = mapSelect.value;
  currentMap = mapChoice;
  setWaveDifficulty(1);

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

  landingScreen.classList.add("hidden");
  gameWrapper.classList.remove("hidden");
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

// Reset player health, lives, dash, timers
function resetPlayerState() {
  player.x = canvas.width * 0.2;
  player.y = canvas.height * 0.5;
  player.fireCooldown = 0;
  player.health = player.maxHealth;
  player.lives = 3;
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

function handleKeyDown(event) {
  const key = event.key.toLowerCase();
  keyboardKeys[key] = true;
  keys[key] = true;
  if (key === "shift") startDash();
}

function handleKeyUp(event) {
  const key = event.key.toLowerCase();
  keyboardKeys[key] = false;
  if (!touchKeyCounts[key]) keys[key] = false;
}

function updateMousePosition(event) {
  const rect = canvas.getBoundingClientRect();
  mousePos = { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

// Bullet factory
function createBullet(x, y, angle, speed, owner, options = {}) {
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size: options.size || 6,
    owner,
    piercing: !!options.piercing,
    color: options.color || null,
  };
}

// Player fire (uses facing angle or mouse)
function attemptPlayerShot() {
  if (animationId === null || player.fireCooldown > 0) return;
  const playerCenter = getCenter(player);
  // Use the tank's current facing angle so shots follow the direction of movement/controls
  const angle = player.angle || 0;
  const bulletSpeed = 5;
  bullets.push(
    createBullet(playerCenter.x, playerCenter.y, angle, bulletSpeed, "player", {
      piercing: player.pierceTimer > 0,
      color: player.pierceTimer > 0 ? "#60a5fa" : null,
    })
  );
  player.fireCooldown = player.rapidTimer > 0 ? 6 : 12;
  playTone(520, 0.05, "square");
}

// Enemy shoot
function enemyShoot(enemy) {
  const enemyCenter = getCenter(enemy);
  const playerCenter = getCenter(player);
  const angle = Math.atan2(playerCenter.y - enemyCenter.y, playerCenter.x - enemyCenter.x);
  bullets.push(createBullet(enemyCenter.x, enemyCenter.y, angle, enemy.bulletSpeed, "enemy"));
  enemy.fireCooldown = enemy.fireDelay;
}

// Movement + dash
function movePlayer() {
  let dx = 0;
  let dy = 0;
  const boost = player.dashActive > 0 ? 2.4 : 1;

  const mobile = isMobileMode();
  if (mobile && joystickState.active && joystickState.distance > 0) {
    // Use the virtual joystick vector for 360° movement
    const speedFactor = Math.min(1, joystickState.distance / joystickState.maxRadius);
    dx = joystickState.vector.x * player.speed * boost * speedFactor;
    dy = joystickState.vector.y * player.speed * boost * speedFactor;
    player.angle = Math.atan2(dy, dx);
  } else {
    // Keyboard movement (desktop or fallback on mobile)
    if (keys["a"] || keys["arrowleft"]) dx -= 1;
    if (keys["d"] || keys["arrowright"]) dx += 1;
    if (keys["w"] || keys["arrowup"]) dy -= 1;
    if (keys["s"] || keys["arrowdown"]) dy += 1;
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      dx = (dx / len) * player.speed * boost;
      dy = (dy / len) * player.speed * boost;
      if (mobile) player.angle = Math.atan2(dy, dx); // keep angle tied to movement only on mobile
    }
  }

  moveTankWithObstacles(player, dx, dy, false);
}

// Enemies update
function updateEnemies() {
  enemies.forEach((enemy) => {
    moveTankWithObstacles(enemy, enemy.dx, enemy.dy, true);
    const pC = getCenter(player);
    const eC = getCenter(enemy);
    enemy.angle = Math.atan2(pC.y - eC.y, pC.x - eC.x);
    if (enemy.fireCooldown > 0) {
      enemy.fireCooldown -= 1;
    } else {
      enemyShoot(enemy);
    }
  });
}

// Bullets update
function updateBullets() {
  bullets = bullets.filter((bullet) => {
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;

    // Bounce piercing player bullets on walls
    const outLeft = bullet.x < 0;
    const outRight = bullet.x > canvas.width;
    const outTop = bullet.y < 0;
    const outBottom = bullet.y > canvas.height;
    if (outLeft || outRight || outTop || outBottom) {
      if (bullet.owner === "player" && bullet.piercing) {
        if (outLeft) { bullet.x = 0; bullet.vx *= -1; }
        if (outRight) { bullet.x = canvas.width; bullet.vx *= -1; }
        if (outTop) { bullet.y = 0; bullet.vy *= -1; }
        if (outBottom) { bullet.y = canvas.height; bullet.vy *= -1; }
      } else {
        return false;
      }
    }

    // Obstacles block bullets; damage destructible
    const hitObs = getObstacleAtPoint(bullet.x, bullet.y);
    if (hitObs) {
      if (hitObs.obs.destructible) {
        hitObs.obs.hp -= OBSTACLE_DAMAGE;
        emitParticles(bullet.x, bullet.y, 6, "#fbbf24");
        if (hitObs.obs.hp <= 0) {
          obstacles.splice(hitObs.index, 1);
          emitParticles(bullet.x, bullet.y, 12, "#fde68a");
          playTone(180, 0.1, "square");
        }
      }
      return false;
    }

    // Player bullets vs enemies
    if (bullet.owner === "player") {
      const hitIndex = enemies.findIndex((e) => isPointInsideRect(bullet.x, bullet.y, e));
      if (hitIndex !== -1) {
        const enemy = enemies[hitIndex];
        enemy.hp -= PLAYER_BULLET_DAMAGE;
        emitParticles(bullet.x, bullet.y, 8, "#ffd166");
        if (enemy.hp <= 0) handleEnemyDeath(hitIndex);
        return bullet.piercing; // piercing continues
      }
    }

    // Enemy bullets vs player
    if (bullet.owner === "enemy" && isPointInsideRect(bullet.x, bullet.y, player)) {
      applyPlayerDamage(DAMAGE.enemyBullet);
      return false;
    }

    return true;
  });
}

// Pickups: health, rapid, pierce
function updatePickups() {
  pickupTimer -= 1;
  if (pickupTimer <= 0) {
    spawnPickup();
    pickupTimer = 360 + Math.random() * 180;
  }
  pickups = pickups.filter((pickup) => {
    if (isPointInsideRect(pickup.x, pickup.y, player)) {
      applyPickup(pickup);
      return false;
    }
    return true;
  });
}

function spawnPickup() {
  const size = 16;
  const safeDistance = 80;
  const types = ["health", "rapid", "pierce"];
  const type = types[Math.floor(Math.random() * types.length)];
  let attempts = 0;
  while (attempts < 40) {
    const x = Math.random() * (canvas.width - size);
    const y = Math.random() * (canvas.height - size);
    const rect = { x, y, width: size, height: size };
    const obstacleHit = obstacles.some((obs) => rectanglesOverlap(rect, obs));
    if (!obstacleHit && isFarFromPlayerAndEnemies(x, y, safeDistance)) {
      pickups.push({ x, y, size, type });
      break;
    }
    attempts += 1;
  }
}

function applyPickup(pickup) {
  if (pickup.type === "health") {
    player.health = Math.min(player.maxHealth, player.health + 30);
    playTone(520, 0.1, "triangle");
  } else if (pickup.type === "rapid") {
    player.rapidTimer = 360;
    playTone(700, 0.08, "sawtooth");
  } else if (pickup.type === "pierce") {
    player.pierceTimer = 360;
    playTone(300, 0.08, "sine");
  }
  updateHUD();
}

// Enemy defeat
function handleEnemyDeath(index) {
  const enemy = enemies[index];
  emitParticles(enemy.x + enemy.size / 2, enemy.y + enemy.size / 2, 14, "#fca5a5");
  playTone(200, 0.12, "square");
  score += enemy.scoreValue;
  enemies.splice(index, 1);
  updateHUD();
  // small chance to drop a pickup
  if (Math.random() < 0.2) {
    const size = 16;
    const types = ["health", "rapid", "pierce"];
    const type = types[Math.floor(Math.random() * types.length)];
    pickups.push({ x: enemy.x + enemy.size / 2 - size / 2, y: enemy.y + enemy.size / 2 - size / 2, size, type });
  }
}

// Damage handling
function applyPlayerDamage(amount) {
  if (player.invulnTimer > 0) return;
  player.health -= amount;
  playTone(160, 0.08, "sawtooth");
  updateHUD();
  if (player.health > 0) return;
  player.lives -= 1;
  updateHUD();
  if (player.lives > 0) {
    player.health = player.maxHealth;
    player.invulnTimer = 60;
    bullets = bullets.filter((b) => b.owner === "player");
    player.x = canvas.width * 0.2;
    player.y = canvas.height * 0.5;
  } else {
    gameOver();
  }
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

// Return to landing screen
function returnToMenu() {
  if (animationId !== null) cancelAnimationFrame(animationId);
  animationId = null;
  gameRunning = false;
  hideGameOverModal();
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
    window.location.reload();
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

// Input helpers for mobile pad
function isDown(key) {
  return keys[key] === true;
}

function isMobileMode() {
  return mobileToggle && mobileToggle.checked;
}

function mapDirToKeys(dir) {
  switch (dir) {
    case "up":
      return ["w"];
    case "down":
      return ["s"];
    case "left":
      return ["a"];
    case "right":
      return ["d"];
    case "up-left":
      return ["w", "a"];
    case "up-right":
      return ["w", "d"];
    case "down-left":
      return ["s", "a"];
    case "down-right":
      return ["s", "d"];
    default:
      return [];
  }
}

// Obstacle collision
function getObstacleCollision(tank) {
  const rect = { x: tank.x, y: tank.y, width: tank.size, height: tank.size };
  return obstacles.find((obs) => rectanglesOverlap(rect, obs)) || null;
}

// Mobile controls setup
function setupMobileControls() {
  if (!mobileControls) return;
  const isTouch = "ontouchstart" in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
  if (isTouch) mobileToggle.checked = true;
  const shootHandler = (e) => { e.preventDefault(); attemptPlayerShot(); };
  shootBtn.addEventListener("pointerdown", shootHandler);
  if (dashBtn) {
    const dashHandler = (e) => { e.preventDefault(); startDash(); };
    dashBtn.addEventListener("pointerdown", dashHandler);
  }

  const toggleVisibility = () => {
    if (mobileToggle.checked) {
      mobileControls.classList.remove("hidden");
    } else {
      mobileControls.classList.add("hidden");
      resetJoystick();
    }
  };
  mobileToggle.addEventListener("change", toggleVisibility);
  toggleVisibility();
}

// Desktop aiming: keep turret pointing at mouse when not in mobile mode
function applyDesktopMouseAim() {
  if (isMobileMode()) return;
  const c = getCenter(player);
  player.angle = Math.atan2(mousePos.y - c.y, mousePos.x - c.x);
}

// Virtual joystick helpers (mobile only)
function handleJoystickStart(e) {
  if (!isMobileMode() || !gameRunning) return;
  if (!joystickEl) return;
  const rect = joystickEl.getBoundingClientRect();
  const inside =
    e.clientX >= rect.left &&
    e.clientX <= rect.right &&
    e.clientY >= rect.top &&
    e.clientY <= rect.bottom;
  if (!inside) return;
  e.preventDefault();
  joystickState.active = true;
  joystickState.pointerId = e.pointerId;
  joystickState.base.x = rect.width / 2;
  joystickState.base.y = rect.height / 2;
  joystickEl.classList.add("active");
  centerJoystickKnob();
  handleJoystickMove(e); // update vector immediately based on press position
}

function handleJoystickMove(e) {
  if (!joystickState.active || e.pointerId !== joystickState.pointerId) return;
  const rect = joystickEl.getBoundingClientRect();
  const currentX = e.clientX - rect.left;
  const currentY = e.clientY - rect.top;
  const dx = currentX - joystickState.base.x;
  const dy = currentY - joystickState.base.y;
  const dist = Math.hypot(dx, dy);
  const maxR = joystickState.maxRadius;
  const clampedDist = Math.min(dist, maxR);
  const angle = Math.atan2(dy, dx);
  const offsetX = Math.cos(angle) * clampedDist;
  const offsetY = Math.sin(angle) * clampedDist;
  joystickState.vector.x = Math.cos(angle);
  joystickState.vector.y = Math.sin(angle);
  joystickState.distance = clampedDist;
  if (joystickKnob) {
    joystickKnob.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
  }
}

function handleJoystickEnd(e) {
  if (!joystickState.active || e.pointerId !== joystickState.pointerId) return;
  resetJoystick();
}

function resetJoystick() {
  joystickState.active = false;
  joystickState.pointerId = null;
  joystickState.vector = { x: 0, y: 0 };
  joystickState.distance = 0;
  centerJoystickKnob();
  if (joystickEl) joystickEl.classList.remove("active");
}

function centerJoystickKnob() {
  if (joystickKnob) joystickKnob.style.transform = "translate(-50%, -50%)";
}

// Tank collision
function checkTankCollision() {
  enemies.forEach((enemy) => {
    const hit =
      player.x < enemy.x + enemy.size &&
      player.x + player.size > enemy.x &&
      player.y < enemy.y + enemy.size &&
      player.y + player.size > enemy.y;
    if (hit) applyPlayerDamage(DAMAGE.collision);
  });
}

// Move tanks with obstacles
function moveTankWithObstacles(tank, dx, dy, bounceOnHit) {
  const prevX = tank.x;
  const prevY = tank.y;
  tank.x += dx;
  let hit = getObstacleCollision(tank);
  if (hit) {
    if (bounceOnHit) {
      tank.x = prevX;
      if (tank.dx !== undefined) tank.dx *= -1;
    } else {
      tank.x = dx > 0 ? hit.x - tank.size : hit.x + hit.width;
    }
  }
  tank.y += dy;
  hit = getObstacleCollision(tank);
  if (hit) {
    if (bounceOnHit) {
      tank.y = prevY;
      if (tank.dy !== undefined) tank.dy *= -1;
    } else {
      tank.y = dy > 0 ? hit.y - tank.size : hit.y + hit.height;
    }
  }
  clampToCanvas(tank);
}

// Clamp to canvas
function clampToCanvas(tank) {
  if (tank.x < 0) tank.x = 0;
  if (tank.y < 0) tank.y = 0;
  if (tank.x + tank.size > canvas.width) tank.x = canvas.width - tank.size;
  if (tank.y + tank.size > canvas.height) tank.y = canvas.height - tank.size;
}

// Enemy placement away from player/enemies/obstacles
function placeEnemySafely(enemy) {
  const safeDistance = 140;
  let attempts = 0;
  while (attempts < 80) {
    enemy.x = Math.random() * (canvas.width - enemy.size);
    enemy.y = Math.random() * (canvas.height - enemy.size);
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const dist = Math.hypot(dx, dy);
    const overlapEnemy = enemies.some((e) =>
      rectanglesOverlap({ x: enemy.x, y: enemy.y, width: enemy.size, height: enemy.size }, { x: e.x, y: e.y, width: e.size, height: e.size })
    );
    const overlapObstacle = rectOverlapsObstacles(enemy);
    if (dist > safeDistance && !overlapEnemy && !overlapObstacle) return true;
    attempts += 1;
  }
  return false;
}

// Obstacles generation
function generateObstacles(map) {
  const cfg = mapObstacleStyles[map] || mapObstacleStyles.city;
  obstacles = [];
  let attempts = 0;
  while (obstacles.length < cfg.count && attempts < cfg.count * 15) {
    const size = cfg.sizeRange[0] + Math.random() * (cfg.sizeRange[1] - cfg.sizeRange[0]);
    const aspect = 0.6 + Math.random() * 0.8;
    const width = size;
    const height = size * aspect;
    const x = Math.random() * (canvas.width - width);
    const y = Math.random() * (canvas.height - height);
    const newObs = { x, y, width, height, destructible: false, hp: null, maxHp: null };
    if (Math.random() < cfg.destructibleChance) {
      const hpVal = cfg.hpRange[0] + Math.random() * (cfg.hpRange[1] - cfg.hpRange[0]);
      newObs.destructible = true;
      newObs.hp = Math.round(hpVal);
      newObs.maxHp = newObs.hp;
    }
    const buffer = 20;
    const nearPlayer = rectanglesOverlap(newObs, {
      x: player.x - buffer,
      y: player.y - buffer,
      width: player.size + buffer * 2,
      height: player.size + buffer * 2,
    }) || rectanglesOverlap(newObs, { x: 0, y: 0, width: 120, height: 120 });
    const overlapsExisting = obstacles.some((obs) =>
      rectanglesOverlap({ x: newObs.x - 10, y: newObs.y - 10, width: newObs.width + 20, height: newObs.height + 20 }, obs)
    );
    if (!nearPlayer && !overlapsExisting) obstacles.push(newObs);
    attempts += 1;
  }
}

// Get obstacle at a point
function getObstacleAtPoint(px, py) {
  for (let i = 0; i < obstacles.length; i += 1) {
    const obs = obstacles[i];
    if (px >= obs.x && px <= obs.x + obs.width && py >= obs.y && py <= obs.y + obs.height) {
      return { obs, index: i };
    }
  }
  return null;
}

// Distance check to all enemies
function isFarFromPlayerAndEnemies(x, y, minDistance) {
  const pc = getCenter(player);
  if (Math.hypot(x - pc.x, y - pc.y) <= minDistance) return false;
  return enemies.every((e) => Math.hypot(x - getCenter(e).x, y - getCenter(e).y) > minDistance);
}

// Waves
function startWave(waveNumber) {
  wave = waveNumber;
  wavePauseTimer = 0;
  setWaveDifficulty(waveNumber);
  bullets = bullets.filter((b) => b.owner === "player");
  enemies = [];
  spawnEnemiesForWave(wave);
  updateHUD();
}

function spawnEnemiesForWave(waveNumber) {
  const light = 2 + waveNumber;
  const medium = Math.max(1, Math.floor((waveNumber + 1) / 2));
  const heavy = waveNumber >= 3 ? Math.floor((waveNumber - 1) / 3) : 0;
  addEnemies("light", light);
  addEnemies("medium", medium);
  addEnemies("heavy", heavy);
}

function addEnemies(type, count) {
  let attempts = 0;
  while (count > 0 && attempts < 200) {
    const enemy = createEnemy(type);
    if (placeEnemySafely(enemy)) {
      enemies.push(enemy);
      count -= 1;
    }
    attempts += 1;
  }
}

function createEnemy(typeName) {
  const tpl = enemyTypes[typeName] || enemyTypes.medium;
  const speedMult = settings.enemySpeed / difficultySettings.medium.enemySpeed;
  const bulletMult = settings.enemyBulletSpeed / difficultySettings.medium.enemyBulletSpeed;
  const fireMult = settings.enemyFireDelay / difficultySettings.medium.enemyFireDelay;
  const e = {
    type: typeName,
    x: canvas.width * 0.7,
    y: canvas.height * 0.5,
    size: tpl.size,
    dx: 0,
    dy: 0,
    angle: 0,
    speed: tpl.speed * speedMult,
    bulletSpeed: tpl.bulletSpeed * bulletMult,
    fireDelay: Math.max(24, tpl.fireDelay * fireMult),
    hp: tpl.hp,
    maxHp: tpl.hp,
    scoreValue: tpl.score,
    fireCooldown: Math.random() * tpl.fireDelay,
  };
  setRandomVelocity(e);
  return e;
}

function setRandomVelocity(obj) {
  const ang = Math.random() * Math.PI * 2;
  obj.dx = Math.cos(ang) * obj.speed;
  obj.dy = Math.sin(ang) * obj.speed;
}

function handleWaveProgression() {
  if (enemies.length === 0) {
    if (wavePauseTimer === 0) {
      wavePauseTimer = 150;
      statusMessage.textContent = `Wave ${wave} cleared! Next wave incoming...`;
      statusMessage.classList.remove("hidden");
    } else {
      wavePauseTimer -= 1;
      if (wavePauseTimer <= 0) {
        statusMessage.classList.add("hidden");
        startWave(wave + 1);
      }
    }
  }
}

// Dash
function startDash() {
  if (!gameRunning) return;
  if (player.dashCooldown > 0 || player.dashActive > 0) return;
  player.dashActive = DASH_DURATION;
  player.dashCooldown = DASH_COOLDOWN;
  player.invulnTimer = Math.max(player.invulnTimer, DASH_DURATION + 4);
  playTone(440, 0.08, "sine");
}

// Drawing
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawObstacles();
  drawPickups();
  drawParticles();
  drawBullets();
  drawTank(player, "#3adb76", "#a8ffd7", player.angle);
  enemies.forEach((e) => drawTank(e, "#e74c3c", "#f8b4a6", e.angle));
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

function drawTank(tank, bodyColor, barrelColor, angle) {
  ctx.save();
  const c = getCenter(tank);
  ctx.translate(c.x, c.y);
  ctx.rotate(angle);
  ctx.fillStyle = bodyColor;
  ctx.fillRect(-tank.size / 2, -tank.size / 2, tank.size, tank.size);
  ctx.fillStyle = barrelColor;
  const barrelLength = tank.size * 0.8;
  const barrelWidth = tank.size * 0.2;
  ctx.fillRect(0, -barrelWidth / 2, barrelLength, barrelWidth);
  // dash cooldown ring
  if (tank === player) {
    ctx.strokeStyle = player.dashCooldown <= 0 ? "#4ade80" : "#93c5fd";
    ctx.lineWidth = 2;
    ctx.beginPath();
    const progress = player.dashCooldown <= 0 ? 1 : 1 - Math.max(0, player.dashCooldown) / DASH_COOLDOWN;
    ctx.arc(0, 0, tank.size + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.stroke();
  }
  ctx.restore();
}

// Utility
function getCenter(obj) {
  return { x: obj.x + obj.size / 2, y: obj.y + obj.size / 2 };
}

function isPointInsideRect(px, py, rect) {
  return px >= rect.x && px <= rect.x + rect.size && py >= rect.y && py <= rect.y + rect.size;
}

function rectOverlapsObstacles(rect) {
  return obstacles.some((obs) =>
    rectanglesOverlap({ x: rect.x, y: rect.y, width: rect.size, height: rect.size }, obs)
  );
}

function rectanglesOverlap(r1, r2) {
  return r1.x < r2.x + r2.width && r1.x + r1.width > r2.x && r1.y < r2.y + r2.height && r1.y + r1.height > r2.y;
}

// Particles
function updateParticles() {
  particles = particles.filter((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 1;
    return p.life > 0;
  });
}

function emitParticles(x, y, count, color) {
  for (let i = 0; i < count; i += 1) {
    const ang = Math.random() * Math.PI * 2;
    const speed = Math.random() * 2;
    particles.push({
      x,
      y,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      life: 14 + Math.random() * 8,
      maxLife: 20,
      size: 2 + Math.random() * 2,
      color,
    });
  }
}

// Audio helper
let audioCtx = null;
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

