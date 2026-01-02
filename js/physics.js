// Collision, bullets, pickups, particles, and movement helpers

// Bullet factory
function createBullet(x, y, angle, speed, owner, options = {}) {
  return {
    x,
    y,
    ownerId: options.ownerId || null,
    angle,
    speed,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size: options.size || 6,
    owner,
    piercing: !!options.piercing,
    color: options.color || null,
    damage: options.damage || 20,
    bounces: 0,
    maxBounces: options.maxBounces !== undefined ? options.maxBounces : (options.piercing ? 4 : 0),
    life: options.life || 600, // simple lifetime cap to avoid infinite projectiles
  };
}

function updateBullets() {
  bullets = bullets.filter((bullet) => {
    // Age out old bullets
    bullet.life -= 1;
    if (bullet.life <= 0) return false;

    bullet.x += bullet.vx;
    bullet.y += bullet.vy;

    // Bounce piercing player bullets on walls
    const outLeft = bullet.x < 0;
    const outRight = bullet.x > canvas.width;
    const outTop = bullet.y < 0;
    const outBottom = bullet.y > canvas.height;
    if (bullet.owner === "player" && bullet.piercing) {
      let bounced = false;
      if (outLeft || outRight) { bullet.vx *= -1; bounced = true; }
      if (outTop || outBottom) { bullet.vy *= -1; bounced = true; }
      if (bounced) {
        bullet.bounces += 1;
        if (bullet.bounces > bullet.maxBounces) return false;
        // Keep inside bounds after bounce
        bullet.x = clamp(bullet.x, 0, canvas.width);
        bullet.y = clamp(bullet.y, 0, canvas.height);
      }
    }

    if (bullet.owner === "player" && !bullet.piercing) {
      if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) return false;
    }

    // Wall collisions: remove bullet on hit
    if (bulletHitsWall(bullet)) return false;

    if (gameMode === "multiplayer" && bullet.ownerId && bullet.ownerId !== window.localPlayerId) {
      // PvP: damage local player only if bullet is not ours
      const hitLocal = isPointInsideRect(bullet.x, bullet.y, player);
      if (hitLocal) {
        emitParticles(bullet.x, bullet.y, 10, "#8ff0c9");
        applyPlayerDamage(bullet.damage || 20);
        if (player.health <= 0 && typeof eliminateSelf === "function") eliminateSelf();
        if (player.health <= 0 && typeof creditKill === "function") creditKill(bullet.ownerId);
        return false;
      }
    }

    // Remove RTDB bullet if we're the owner and it expires this frame
    const shouldRemoveNetwork = (reason) => {
      if (bullet.ownerId && bullet.ownerId === window.localPlayerId && bullet.rtdbId && typeof window.removeNetworkBullet === "function") {
        window.removeNetworkBullet(bullet.rtdbId);
      }
      return false;
    };

    if (bullet.owner === "enemy") {
      const hit = isPointInsideRect(bullet.x, bullet.y, player);
      if (hit) {
        emitParticles(bullet.x, bullet.y, 8, "#fbbf24");
        applyPlayerDamage(DAMAGE.enemyBullet);
        return shouldRemoveNetwork("playerHit");
      }
    } else if (bullet.owner === "player") {
      // Hit enemy (solo)
      const victim = enemies.find((e) => isPointInsideRect(bullet.x, bullet.y, e));
      if (victim) {
        victim.hp -= PLAYER_BULLET_DAMAGE;
        emitParticles(bullet.x, bullet.y, 10, "#8ff0c9");
        if (victim.hp <= 0) {
          score += victim.scoreValue;
          emitParticles(victim.x + victim.size / 2, victim.y + victim.size / 2, 18, "#f97316");
          enemies = enemies.filter((e) => e !== victim);
        }
        if (bullet.piercing) return true; // continue
        return shouldRemoveNetwork("enemyHit");
      }
      // PvP remote tank hit
      if (gameMode === "multiplayer" && bullet.ownerId && window.localPlayerId) {
        const remotes = window.remotePlayers || {};
        const hitRemote = Object.keys(remotes).find((id) => {
          const rp = remotes[id];
          if (!rp || rp.alive === false) return false;
          const dummyRect = { x: rp.targetX, y: rp.targetY, size: player.size };
          return isPointInsideRect(bullet.x, bullet.y, dummyRect);
        });
        if (hitRemote) {
          emitParticles(bullet.x, bullet.y, 10, "#8ff0c9");
          if (typeof damageRemotePlayer === "function") {
            damageRemotePlayer(hitRemote, bullet.damage || 20, bullet.ownerId);
          }
          if (bullet.piercing) return true;
          return shouldRemoveNetwork("remoteHit");
        }
      }
    }
    return true;
  });
}

function updatePickups() {
  pickupTimer -= 1;
  if (pickupTimer <= 0) {
    spawnPickup();
    pickupTimer = 320 + Math.random() * 120;
  }

  // Player collecting
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
    const obstacleHit = walls.some((obs) => rectanglesOverlap(rect, obs));
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
    player.lives += 1;
    playTone(520, 0.1, "triangle");
  } else if (pickup.type === "rapid") {
    player.rapidTimer = 360;
    playTone(700, 0.08, "sawtooth");
  } else if (pickup.type === "pierce") {
    player.pierceTimer = 360;
    playTone(700, 0.08, "triangle");
  }
  updateHUD();
}

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

function moveTankWithObstacles(obj, dx, dy, bounce) {
  // axis-separated move to avoid tunneling through walls
  // move X
  const nextRectX = { x: obj.x + dx, y: obj.y, width: obj.size, height: obj.size };
  const hitX = walls.find((w) => rectanglesOverlap(nextRectX, w));
  if (!hitX) obj.x = clamp(obj.x + dx, 0, canvas.width - obj.size);
  else if (bounce && obj.dx !== undefined) obj.dx *= -1;

  // move Y
  const nextRectY = { x: obj.x, y: obj.y + dy, width: obj.size, height: obj.size };
  const hitY = walls.find((w) => rectanglesOverlap(nextRectY, w));
  if (!hitY) obj.y = clamp(obj.y + dy, 0, canvas.height - obj.size);
  else if (bounce && obj.dy !== undefined) obj.dy *= -1;
}

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

function isFarFromPlayerAndEnemies(x, y, minDistance) {
  const pc = getCenter(player);
  if (Math.hypot(x - pc.x, y - pc.y) <= minDistance) return false;
  return enemies.every((e) => Math.hypot(x - getCenter(e).x, y - getCenter(e).y) > minDistance);
}

// Helper: bullet vs walls
function bulletHitsWall(bullet) {
  const rect = { x: bullet.x - bullet.size / 2, y: bullet.y - bullet.size / 2, width: bullet.size, height: bullet.size };
  return walls.some((w) => rectanglesOverlap(rect, w));
}
