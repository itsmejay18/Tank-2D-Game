// Player movement, firing, dash, health, drawing

function movePlayer() {
  let dx = 0;
  let dy = 0;
  const boost = player.dashActive > 0 ? 2.4 : 1;

  const mobile = isMobileMode();
  if (mobile && joystickState.active && joystickState.distance > 0) {
    const speedFactor = Math.min(1, joystickState.distance / joystickState.maxRadius);
    dx = joystickState.vector.x * player.speed * boost * speedFactor;
    dy = joystickState.vector.y * player.speed * boost * speedFactor;
    player.angle = Math.atan2(dy, dx);
  } else {
    if (keys["a"] || keys["arrowleft"]) dx -= 1;
    if (keys["d"] || keys["arrowright"]) dx += 1;
    if (keys["w"] || keys["arrowup"]) dy -= 1;
    if (keys["s"] || keys["arrowdown"]) dy += 1;
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      dx = (dx / len) * player.speed * boost;
      dy = (dy / len) * player.speed * boost;
      if (mobile) player.angle = Math.atan2(dy, dx);
    }
  }

  moveTankWithObstacles(player, dx, dy, false);
}

// Player fire (uses facing angle)
function attemptPlayerShot() {
  if (animationId === null || player.fireCooldown > 0) return;
  const playerCenter = getCenter(player);
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

// Dash
function startDash() {
  if (!gameRunning) return;
  if (player.dashCooldown > 0 || player.dashActive > 0) return;
  player.dashActive = DASH_DURATION;
  player.dashCooldown = DASH_COOLDOWN;
  player.invulnTimer = Math.max(player.invulnTimer, DASH_DURATION + 4);
  playTone(440, 0.08, "sine");
}

// Damage handling
function applyPlayerDamage(amount) {
  if (player.invulnTimer > 0) return;
  player.health -= amount;
  playTone(160, 0.08, "sawtooth");
  updateHUD();
  if (player.health > 0) return;
  if (player.lives <= 0) {
    gameOver();
    return;
  }
  player.lives -= 1;
  player.health = player.maxHealth;
  player.invulnTimer = 60;
  bullets = bullets.filter((b) => b.owner === "player");
  player.x = canvas.width * 0.2;
  player.y = canvas.height * 0.5;
  updateHUD();
}

// Drawing
function drawTank(tank, palette, angle) {
  ctx.save();
  const c = getCenter(tank);
  ctx.translate(c.x, c.y);
  ctx.rotate(angle || 0);

  const size = tank.size;
  const bodyW = size * 1.1;
  const bodyH = size * 0.72;
  const wheelR = size * 0.2;
  const wheelOffsetY = bodyH * 0.45;

  const bodyColor = palette?.body || "#3adb76";
  const barrelColor = palette?.barrel || "#a8ffd7";
  const wheelsColor = palette?.wheels || "#1f5138";
  const outlineColor = palette?.outline || "#88ffd1";
  const turretShape = palette?.turretShape || "rounded";
  const barrelTip = palette?.barrelTip || "standard";

  // Wheels/tracks
  ctx.fillStyle = wheelsColor;
  ctx.beginPath();
  ctx.arc(-bodyW * 0.35, wheelOffsetY, wheelR, 0, Math.PI * 2);
  ctx.arc(bodyW * 0.35, wheelOffsetY, wheelR, 0, Math.PI * 2);
  ctx.arc(-bodyW * 0.35, -wheelOffsetY, wheelR, 0, Math.PI * 2);
  ctx.arc(bodyW * 0.35, -wheelOffsetY, wheelR, 0, Math.PI * 2);
  ctx.fill();

  // Body
  const bodyX = -bodyW / 2;
  const bodyY = -bodyH / 2;
  const radius = Math.min(bodyW, bodyH) * 0.22;
  ctx.fillStyle = bodyColor;
  drawRoundedRect(bodyX, bodyY, bodyW, bodyH, radius, true, false);

  // Outline
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 2;
  drawRoundedRect(bodyX, bodyY, bodyW, bodyH, radius, false, true);

  // Turret
  const turretW = bodyW * 0.38;
  const turretH = bodyH * 0.42;
  const turretRadius = turretShape === "rounded" ? turretH * 0.4 : 0;
  ctx.fillStyle = bodyColor;
  drawRoundedRect(-turretW / 2, -turretH / 2, turretW, turretH, turretRadius, true, false);

  // Barrel
  const barrelLength = size * 0.9;
  const barrelWidth = size * 0.18;
  ctx.fillStyle = barrelColor;
  ctx.fillRect(turretW / 2, -barrelWidth / 2, barrelLength, barrelWidth);

  // Barrel tip variations
  if (barrelTip === "wide") {
    ctx.fillRect(turretW / 2 + barrelLength - barrelWidth * 0.2, -barrelWidth, barrelWidth * 0.8, barrelWidth * 2);
  } else if (barrelTip === "spike") {
    ctx.beginPath();
    ctx.moveTo(turretW / 2 + barrelLength, -barrelWidth / 2);
    ctx.lineTo(turretW / 2 + barrelLength + barrelWidth * 0.8, 0);
    ctx.lineTo(turretW / 2 + barrelLength, barrelWidth / 2);
    ctx.closePath();
    ctx.fill();
  }

  // Dash cooldown ring for player
  if (tank === player) {
    ctx.strokeStyle = player.dashCooldown <= 0 ? "#4ade80" : "#93c5fd";
    ctx.lineWidth = 2;
    ctx.beginPath();
    const progress = player.dashCooldown <= 0 ? 1 : 1 - Math.max(0, player.dashCooldown) / DASH_COOLDOWN;
    ctx.arc(0, 0, size + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.stroke();
  }

  ctx.restore();
}

function drawRoundedRect(x, y, w, h, r, fill, stroke) {
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
    return;
  }
  if (fill) ctx.fillRect(x, y, w, h);
  if (stroke) ctx.strokeRect(x, y, w, h);
}
