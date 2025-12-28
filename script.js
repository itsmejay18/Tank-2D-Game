// Grab page elements we will use
const landingScreen = document.getElementById("landing");
const gameWrapper = document.getElementById("gameWrapper");
const startBtn = document.getElementById("startBtn");
const playerNameInput = document.getElementById("playerName");
const difficultySelect = document.getElementById("difficulty");
const mapSelect = document.getElementById("map");
const playerDisplay = document.getElementById("playerDisplay");
const mapDisplay = document.getElementById("mapDisplay");
const scoreDisplay = document.getElementById("scoreDisplay");
const livesDisplay = document.getElementById("livesDisplay");
const healthFill = document.getElementById("healthFill");
const statusMessage = document.getElementById("statusMessage");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Map colors and difficulty settings
const mapColors = {
  city: "#222a38", // dark gray
  forest: "#0f2f1b", // dark green
  desert: "#c6ad6b", // sandy yellow
};

const mapObstacleStyles = {
  city: { color: "#475569", stroke: "#7c90a8", count: 5, sizeRange: [60, 120] },
  forest: { color: "#1f3b29", stroke: "#3f6f52", count: 4, sizeRange: [70, 130] },
  desert: { color: "#b38745", stroke: "#d8b278", count: 4, sizeRange: [70, 140] },
};

const difficultySettings = {
  easy: { enemySpeed: 1.6, enemyBulletSpeed: 2.6, enemyFireDelay: 80 },
  medium: { enemySpeed: 2.4, enemyBulletSpeed: 3.4, enemyFireDelay: 60 },
  hard: { enemySpeed: 3.2, enemyBulletSpeed: 4.2, enemyFireDelay: 45 },
};

const DAMAGE = {
  enemyBullet: 30,
  collision: 40,
};

// Player and enemy tanks
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
};

const enemy = {
  x: canvas.width * 0.7,
  y: canvas.height * 0.5,
  size: 32,
  dx: 2,
  dy: 2,
  angle: 0,
  fireCooldown: 0,
};

let bullets = [];
let healthPickups = [];
let obstacles = [];
let playerName = "Player";
let animationId = null;
let gameRunning = false;
let keys = {};
let mousePos = { x: canvas.width / 2, y: canvas.height / 2 };
let score = 0;
let settings = difficultySettings.medium;
let pickupTimer = 0;
let currentMap = "city";

startBtn.addEventListener("click", startGame);
document.addEventListener("keydown", handleKeyDown);
document.addEventListener("keyup", handleKeyUp);
canvas.addEventListener("mousemove", updateMousePosition);
canvas.addEventListener("mousedown", attemptPlayerShot);

// Start button launches the game and hides the landing screen
function startGame() {
  if (animationId !== null) return; // prevent multiple starts

  // Hide any previous game over message
  statusMessage.classList.add("hidden");
  statusMessage.textContent = "";

  playerName = playerNameInput.value.trim() || "Player";
  const difficulty = difficultySelect.value;
  const mapChoice = mapSelect.value;
  currentMap = mapChoice;

  settings = difficultySettings[difficulty] || difficultySettings.medium;
  playerDisplay.textContent = playerName;
  mapDisplay.textContent = mapSelect.options[mapSelect.selectedIndex].text;
  score = 0;
  player.lives = 3;
  player.health = player.maxHealth;
  player.invulnTimer = 0;
  updateHUD();

  setCanvasTheme(mapChoice);
  generateObstacles(mapChoice);
  resetPositions();

  landingScreen.classList.add("hidden");
  gameWrapper.classList.remove("hidden");

  gameRunning = true;
  animationId = requestAnimationFrame(update);
}

// Reset player/enemy and bullets for a fresh round
function resetPositions() {
  bullets = [];
  healthPickups = [];

  player.x = canvas.width * 0.2;
  player.y = canvas.height * 0.5;
  player.fireCooldown = 0;
  player.health = player.maxHealth;
  player.invulnTimer = 60; // brief invulnerability after start/reset

  pickupTimer = 240; // spawn first health pickup after a short delay

  placeEnemySafely();
  setEnemyVelocity();
  enemy.fireCooldown = settings.enemyFireDelay;
}

// Change the canvas background color to match the selected map
function setCanvasTheme(theme) {
  canvas.style.backgroundColor = mapColors[theme] || mapColors.city;
}

// Movement helpers
function handleKeyDown(event) {
  const key = event.key.toLowerCase();
  keys[key] = true;
}

function handleKeyUp(event) {
  const key = event.key.toLowerCase();
  keys[key] = false;
}

function updateMousePosition(event) {
  mousePos = getCanvasPosition(event);
}

// Convert mouse coordinates to canvas space
function getCanvasPosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

// Create a bullet that moves along a direction
function createBullet(x, y, angle, speed, owner) {
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size: 6,
    owner,
  };
}

// Fire a player bullet toward the mouse cursor
function attemptPlayerShot() {
  if (animationId === null) return; // do nothing if game not started
  if (player.fireCooldown > 0) return;

  const playerCenter = getCenter(player);
  const angle = Math.atan2(mousePos.y - playerCenter.y, mousePos.x - playerCenter.x);
  const bulletSpeed = 5;
  bullets.push(createBullet(playerCenter.x, playerCenter.y, angle, bulletSpeed, "player"));
  player.fireCooldown = 12; // short delay between shots
}

// Enemy aims at the player and fires
function enemyShoot() {
  const enemyCenter = getCenter(enemy);
  const playerCenter = getCenter(player);
  const angle = Math.atan2(playerCenter.y - enemyCenter.y, playerCenter.x - enemyCenter.x);
  bullets.push(
    createBullet(enemyCenter.x, enemyCenter.y, angle, settings.enemyBulletSpeed, "enemy")
  );
  enemy.fireCooldown = settings.enemyFireDelay;
}

// Move the player with WASD/Arrow keys
function movePlayer() {
  let dx = 0;
  let dy = 0;

  if (keys["a"]) dx -= 1;
  if (keys["d"]) dx += 1;
  if (keys["w"]) dy -= 1;
  if (keys["s"]) dy += 1;

  if (dx !== 0 || dy !== 0) {
    const length = Math.hypot(dx, dy);
    dx = (dx / length) * player.speed;
    dy = (dy / length) * player.speed;
  }

  moveTankWithObstacles(player, dx, dy, false);

  const playerCenter = getCenter(player);
  player.angle = Math.atan2(mousePos.y - playerCenter.y, mousePos.x - playerCenter.x);
}

// Move the enemy and bounce off walls
function moveEnemy() {
  moveTankWithObstacles(enemy, enemy.dx, enemy.dy, true);

  const playerCenter = getCenter(player);
  const enemyCenter = getCenter(enemy);
  enemy.angle = Math.atan2(playerCenter.y - enemyCenter.y, playerCenter.x - enemyCenter.x);
}

// Update all bullets and check for hits
function updateBullets() {
  bullets = bullets.filter((bullet) => {
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;

    // Remove bullets that leave the canvas
    if (
      bullet.x < -bullet.size ||
      bullet.x > canvas.width + bullet.size ||
      bullet.y < -bullet.size ||
      bullet.y > canvas.height + bullet.size
    ) {
      return false;
    }

    // Bullets blocked by obstacles
    if (isPointInObstacles(bullet.x, bullet.y)) {
      return false;
    }

    // Player bullets hitting enemy
    if (bullet.owner === "player" && isPointInsideRect(bullet.x, bullet.y, enemy)) {
      score += 1;
      updateHUD();
      placeEnemySafely();
      setEnemyVelocity();
      enemy.fireCooldown = settings.enemyFireDelay;
      return false;
    }

    // Enemy bullets hitting player
    if (bullet.owner === "enemy" && isPointInsideRect(bullet.x, bullet.y, player)) {
      applyPlayerDamage(DAMAGE.enemyBullet);
      return false;
    }

    return true;
  });
}

// Spawn health pickups periodically
function updatePickups() {
  pickupTimer -= 1;
  if (pickupTimer <= 0) {
    spawnHealthPickup();
    pickupTimer = 360 + Math.random() * 180; // 6-9 seconds roughly
  }

  // Collect pickups
  healthPickups = healthPickups.filter((pickup) => {
    if (isPointInsideRect(pickup.x, pickup.y, player)) {
      player.health = Math.min(player.maxHealth, player.health + pickup.heal);
      updateHUD();
      return false;
    }
    return true;
  });
}

function spawnHealthPickup() {
  const size = 16;
  const heal = 30;
  const safeDistance = 80;
  let attempts = 0;
  while (attempts < 40) {
    const x = Math.random() * (canvas.width - size);
    const y = Math.random() * (canvas.height - size);
    if (isFarFromPlayerAndEnemy(x, y, safeDistance) && !isPointInObstacles(x, y)) {
      healthPickups.push({ x, y, size, heal });
      break;
    }
    attempts += 1;
  }
}

// Make sure a tank stays inside the canvas
function clampToCanvas(tank) {
  if (tank.x < 0) tank.x = 0;
  if (tank.y < 0) tank.y = 0;
  if (tank.x + tank.size > canvas.width) {
    tank.x = canvas.width - tank.size;
  }
  if (tank.y + tank.size > canvas.height) {
    tank.y = canvas.height - tank.size;
  }
}

// Randomize enemy spawn away from the player
function placeEnemySafely() {
  const safeDistance = 120;
  let attempts = 0;
  let placed = false;

  while (!placed && attempts < 50) {
    enemy.x = Math.random() * (canvas.width - enemy.size);
    enemy.y = Math.random() * (canvas.height - enemy.size);
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const dist = Math.hypot(dx, dy);
    placed = dist > safeDistance && !rectOverlapsObstacles(enemy);
    attempts += 1;
  }
}

// Set the enemy's travel direction and speed
function setEnemyVelocity() {
  const speed = settings.enemySpeed;
  enemy.dx = speed * (Math.random() > 0.5 ? 1 : -1);
  enemy.dy = speed * (Math.random() > 0.5 ? 1 : -1);
}

// Drawing helpers
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawObstacles();
  drawBullets();
  drawPickups();
  drawTank(player, "#3adb76", "#a8ffd7", player.angle);
  drawTank(enemy, "#e74c3c", "#f8b4a6", enemy.angle);
}

function drawBullets() {
  bullets.forEach((bullet) => {
    ctx.fillStyle = bullet.owner === "player" ? "#8ff0c9" : "#ffcf70";
    ctx.fillRect(
      bullet.x - bullet.size / 2,
      bullet.y - bullet.size / 2,
      bullet.size,
      bullet.size
    );
  });
}

function drawPickups() {
  healthPickups.forEach((pickup) => {
    ctx.save();
    ctx.fillStyle = "#8ef7c2";
    ctx.strokeStyle = "#2c9a6b";
    ctx.lineWidth = 2;
    ctx.fillRect(pickup.x, pickup.y, pickup.size, pickup.size);
    ctx.strokeRect(pickup.x, pickup.y, pickup.size, pickup.size);
    // Draw a simple plus sign
    ctx.strokeStyle = "#1f5138";
    ctx.lineWidth = 2;
    const centerX = pickup.x + pickup.size / 2;
    const centerY = pickup.y + pickup.size / 2;
    ctx.beginPath();
    ctx.moveTo(centerX - 4, centerY);
    ctx.lineTo(centerX + 4, centerY);
    ctx.moveTo(centerX, centerY - 4);
    ctx.lineTo(centerX, centerY + 4);
    ctx.stroke();
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
    ctx.restore();
  });
}

// Draws a simple square tank with a barrel
function drawTank(tank, bodyColor, barrelColor, angle) {
  ctx.save();
  const center = getCenter(tank);
  ctx.translate(center.x, center.y);
  ctx.rotate(angle);

  ctx.fillStyle = bodyColor;
  ctx.fillRect(-tank.size / 2, -tank.size / 2, tank.size, tank.size);

  ctx.fillStyle = barrelColor;
  const barrelLength = tank.size * 0.8;
  const barrelWidth = tank.size * 0.2;
  ctx.fillRect(0, -barrelWidth / 2, barrelLength, barrelWidth);

  ctx.restore();
}

// Utility helpers
function getCenter(tank) {
  return { x: tank.x + tank.size / 2, y: tank.y + tank.size / 2 };
}

function isPointInsideRect(px, py, rect) {
  return px >= rect.x && px <= rect.x + rect.size && py >= rect.y && py <= rect.y + rect.size;
}

function isFarFromPlayerAndEnemy(x, y, minDistance) {
  const playerCenter = getCenter(player);
  const enemyCenter = getCenter(enemy);
  return (
    Math.hypot(x - playerCenter.x, y - playerCenter.y) > minDistance &&
    Math.hypot(x - enemyCenter.x, y - enemyCenter.y) > minDistance
  );
}

function isPointInObstacles(px, py) {
  return obstacles.some(
    (obs) => px >= obs.x && px <= obs.x + obs.width && py >= obs.y && py <= obs.y + obs.height
  );
}

function rectOverlapsObstacles(rect) {
  return obstacles.some((obs) =>
    rectanglesOverlap(
      { x: rect.x, y: rect.y, width: rect.size, height: rect.size },
      obs
    )
  );
}

function rectanglesOverlap(r1, r2) {
  return (
    r1.x < r2.x + r2.width &&
    r1.x + r1.width > r2.x &&
    r1.y < r2.y + r2.height &&
    r1.y + r1.height > r2.y
  );
}

// Move tanks while respecting rock obstacles
function moveTankWithObstacles(tank, dx, dy, bounceOnHit) {
  const prevX = tank.x;
  const prevY = tank.y;

  // Move on X axis
  tank.x += dx;
  let hit = getObstacleCollision(tank);
  if (hit) {
    if (bounceOnHit) {
      tank.x = prevX;
      if (tank.dx !== undefined) tank.dx *= -1;
    } else {
      if (dx > 0) tank.x = hit.x - tank.size;
      if (dx < 0) tank.x = hit.x + hit.width;
    }
  }

  // Move on Y axis
  tank.y += dy;
  hit = getObstacleCollision(tank);
  if (hit) {
    if (bounceOnHit) {
      tank.y = prevY;
      if (tank.dy !== undefined) tank.dy *= -1;
    } else {
      if (dy > 0) tank.y = hit.y - tank.size;
      if (dy < 0) tank.y = hit.y + hit.height;
    }
  }

  clampToCanvas(tank);

  // Final safety: if still colliding after clamp, push out on the smallest axis
  const postClampHit = getObstacleCollision(tank);
  if (postClampHit && !bounceOnHit) {
    const overlapRight = tank.x + tank.size - postClampHit.x;
    const overlapLeft = postClampHit.x + postClampHit.width - tank.x;
    const overlapBottom = tank.y + tank.size - postClampHit.y;
    const overlapTop = postClampHit.y + postClampHit.height - tank.y;
    const minOverlap = Math.min(overlapRight, overlapLeft, overlapBottom, overlapTop);
    if (minOverlap === overlapRight) tank.x = postClampHit.x - tank.size;
    else if (minOverlap === overlapLeft) tank.x = postClampHit.x + postClampHit.width;
    else if (minOverlap === overlapBottom) tank.y = postClampHit.y - tank.size;
    else if (minOverlap === overlapTop) tank.y = postClampHit.y + postClampHit.height;
  }

  if (bounceOnHit) {
    if (tank.x <= 0 || tank.x + tank.size >= canvas.width) {
      tank.dx *= -1;
      tank.x = Math.max(0, Math.min(tank.x, canvas.width - tank.size));
    }
    if (tank.y <= 0 || tank.y + tank.size >= canvas.height) {
      tank.dy *= -1;
      tank.y = Math.max(0, Math.min(tank.y, canvas.height - tank.size));
    }
  }
}

function getObstacleCollision(tank) {
  const tankRect = { x: tank.x, y: tank.y, width: tank.size, height: tank.size };
  return obstacles.find((obs) => rectanglesOverlap(tankRect, obs)) || null;
}

// Check if tanks collide directly
function checkTankCollision() {
  const hit =
    player.x < enemy.x + enemy.size &&
    player.x + player.size > enemy.x &&
    player.y < enemy.y + enemy.size &&
    player.y + player.size > enemy.y;

  if (hit) {
    applyPlayerDamage(DAMAGE.collision);
  }
}

// Handle taking damage and lives
function applyPlayerDamage(amount) {
  if (player.invulnTimer > 0) return;
  player.health -= amount;
  updateHUD();

  if (player.health > 0) return;

  player.lives -= 1;
  updateHUD();

  if (player.lives > 0) {
    // Respawn player and clear bullets for fairness
    player.health = player.maxHealth;
    player.invulnTimer = 60;
    bullets = bullets.filter((b) => b.owner === "player"); // clear enemy bullets
    player.x = canvas.width * 0.2;
    player.y = canvas.height * 0.5;
  } else {
    gameOver();
  }
}

// Update HUD elements (score handled elsewhere when it changes)
function updateHUD() {
  const healthPercent = Math.max(0, player.health) / player.maxHealth;
  healthFill.style.width = `${healthPercent * 100}%`;
  livesDisplay.textContent = player.lives;
  scoreDisplay.textContent = score;
}

// End the game and restart
function gameOver() {
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
  }
  animationId = null;
  gameRunning = false;
  // Show inline message instead of blocking alert so the player can restart easily
  statusMessage.textContent = `Game Over, ${playerName}! Try again.`;
  statusMessage.classList.remove("hidden");
  bullets = [];
  keys = {};
  landingScreen.classList.remove("hidden");
  gameWrapper.classList.add("hidden");
}

// The main game loop
function update() {
  if (!gameRunning) return;

  movePlayer();
  moveEnemy();

  if (player.fireCooldown > 0) player.fireCooldown -= 1;
  if (enemy.fireCooldown > 0) {
    enemy.fireCooldown -= 1;
  } else {
    enemyShoot();
  }

  if (player.invulnTimer > 0) player.invulnTimer -= 1;

  updateBullets();
  updatePickups();
  draw();
  checkTankCollision();

  if (gameRunning) {
    animationId = requestAnimationFrame(update);
  }
}

// Generate random obstacle layout based on the chosen map
function generateObstacles(map) {
  const config = mapObstacleStyles[map] || mapObstacleStyles.city;
  obstacles = [];
  let attempts = 0;
  while (obstacles.length < config.count && attempts < config.count * 15) {
    const size =
      config.sizeRange[0] + Math.random() * (config.sizeRange[1] - config.sizeRange[0]);
    const aspect = 0.6 + Math.random() * 0.8; // vary width/height a bit
    const width = size;
    const height = size * aspect;

    const x = Math.random() * (canvas.width - width);
    const y = Math.random() * (canvas.height - height);

    const newObs = { x, y, width, height };

    const buffer = 20;
    const nearPlayerStart =
      rectanglesOverlap(newObs, {
        x: player.x - buffer,
        y: player.y - buffer,
        width: player.size + buffer * 2,
        height: player.size + buffer * 2,
      }) || rectanglesOverlap(newObs, { x: 0, y: 0, width: 120, height: 120 }); // keep spawn corner clearer

    const overlapsExisting = obstacles.some((obs) =>
      rectanglesOverlap(
        { x: newObs.x - 10, y: newObs.y - 10, width: newObs.width + 20, height: newObs.height + 20 },
        obs
      )
    );

    if (!nearPlayerStart && !overlapsExisting) {
      obstacles.push(newObs);
    }

    attempts += 1;
  }
}
