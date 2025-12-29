// Collision, bullets, pickups, particles, and movement helpers

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
    bounces: 0,
    maxBounces: options.maxBounces ?? (options.piercing ? 4 : 0),
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

    // Obstacle collisions
    const hitObstacle = obstacles.find((obs) =>
      rectanglesOverlap({ x: bullet.x - bullet.size / 2, y: bullet.y - bullet.size / 2, width: bullet.size, height: bullet.size }, obs)
    );
    if (hitObstacle) {
      if (hitObstacle.destructible) {
        hitObstacle.hp -= OBSTACLE_DAMAGE;
        if (hitObstacle.hp <= 0) {
          obstacles = obstacles.filter((o) => o !== hitObstacle);
          emitParticles(hitObstacle.x + hitObstacle.width / 2, hitObstacle.y + hitObstacle.height / 2, 16, "#fbbf24");
        }
      }
      return bullet.piercing; // piercing keeps going
    }

    if (bullet.owner === "enemy") {
      const hit = isPointInsideRect(bullet.x, bullet.y, player);
      if (hit) {
        applyPlayerDamage(DAMAGE.enemyBullet);
        return false;
      }
    } else if (bullet.owner === "player") {
      // Hit enemy
      const victim = enemies.find((e) => isPointInsideRect(bullet.x, bullet.y, e));
      if (victim) {
        victim.hp -= PLAYER_BULLET_DAMAGE;
        emitParticles(bullet.x, bullet.y, 6, "#8ff0c9");
        if (victim.hp <= 0) {
          score += victim.scoreValue;
          emitParticles(victim.x + victim.size / 2, victim.y + victim.size / 2, 18, "#f97316");
          enemies = enemies.filter((e) => e !== victim);
        }
        return bullet.piercing; // piercing continues
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
  const newX = obj.x + dx;
  const newY = obj.y + dy;
  const nextRect = { x: newX, y: newY, width: obj.size, height: obj.size };
  const collision = obstacles.find((obs) => rectanglesOverlap(nextRect, obs));
  if (collision) {
    if (bounce && obj.dx !== undefined && obj.dy !== undefined) {
      obj.dx *= -1;
      obj.dy *= -1;
    }
    return;
  }
  obj.x = clamp(newX, 0, canvas.width - obj.size);
  obj.y = clamp(newY, 0, canvas.height - obj.size);
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

function getObstacleAtPoint(px, py) {
  for (let i = 0; i < obstacles.length; i += 1) {
    const obs = obstacles[i];
    if (px >= obs.x && px <= obs.x + obs.width && py >= obs.y && py <= obs.y + obs.height) {
      return { obs, index: i };
    }
  }
  return null;
}
