// Enemy spawning and behavior

function enemyShoot(enemy) {
  const enemyCenter = getCenter(enemy);
  const playerCenter = getCenter(player);
  const angle = Math.atan2(playerCenter.y - enemyCenter.y, playerCenter.x - enemyCenter.x);
  bullets.push(createBullet(enemyCenter.x, enemyCenter.y, angle, enemy.bulletSpeed, "enemy"));
  enemy.fireCooldown = enemy.fireDelay;
}

function updateEnemies() {
  if (typeof gameMode !== "undefined" && gameMode === "multiplayer") return;
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

function spawnEnemiesForWave(waveNumber) {
  if (typeof gameMode !== "undefined" && gameMode === "multiplayer") return;
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
  if (typeof gameMode !== "undefined" && gameMode === "multiplayer") return;
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
