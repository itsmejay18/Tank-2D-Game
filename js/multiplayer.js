// Multiplayer scaffolding using Firebase Realtime Database (optional online mode)
// Plain script (no bundler); expects firebase.js to have exported helpers on window.

(function () {
  // Helper accessors so we always read the latest Firebase globals even if the module loads later.
  const get = (k) => window[k];
  const ROOM_ID = "global-room"; // all online players share this room

  let localPlayerId = null;
  let playersRef = null;
  let bulletsRef = null;
  let pickupsRef = null;
  let enemiesRef = null;
  let remotePlayers = {};
  window.remotePlayers = {};
  let seenBullets = new Set();
  let positionInterval = null;
  let pendingStart = false;
  let unsubPlayers = null;
  let unsubBulletsAdd = null;
  let unsubBulletsRemove = null;
  let unsubPickups = null;
  let unsubEnemies = null;
  let playersReady = false;
  let playerRef = null;
  window.localPlayerId = null;
  window.getRemoteCount = () => 0;

  const remotePalette = {
    body: "#4ecdc4",
    barrel: "#b9fff5",
    wheels: "#1b8a7a",
    outline: "#8ff1e9",
    turretShape: "rounded",
    barrelTip: "standard",
  };

  function startMultiplayerLayer() {
    const rtdb = get("rtdb");
    const dbRef = get("dbRef");
    // If Firebase isn't ready yet (module still loading), retry shortly so online mode still starts.
    if (!rtdb || !dbRef || !get("dbOnValue") || !get("dbOnChildAdded") || !get("dbOnChildRemoved")) {
      if (!pendingStart) {
        pendingStart = true;
        setTimeout(() => {
          pendingStart = false;
          startMultiplayerLayer();
        }, 200);
      }
      return;
    }
    console.info("[MP] Starting multiplayer layer");
    console.info("[MP] Using RTDB URL:", (get("rtdb") || {})._repo?.repoInfo_?.toString?.() || "(unknown)");
    localPlayerId = crypto.randomUUID();
    window.localPlayerId = localPlayerId;
    playersRef = dbRef(rtdb, `rooms/${ROOM_ID}/players`);
    bulletsRef = dbRef(rtdb, `rooms/${ROOM_ID}/bullets`);
    pickupsRef = dbRef(rtdb, `rooms/${ROOM_ID}/pickups`);
    enemiesRef = dbRef(rtdb, `rooms/${ROOM_ID}/enemies`);
    playerRef = dbRef(rtdb, `rooms/${ROOM_ID}/players/${localPlayerId}`);
    writePlayerState();

    if (unsubPlayers) unsubPlayers();
    const applySnapshot = (snap) => {
      const data = snap.val() || {};
      const next = {};
      const now = Date.now();
      const dbRemove = get("dbRemove");
      Object.keys(data).forEach((id) => {
        if (id === localPlayerId) return;
        const d = data[id] || {};
        const safeName = (d.name || "").trim();
        if (!safeName) return; // skip nameless entries
        const ts = Number(d.ts || d.timestamp || 0);
        // Cull stale entries (offline/ghost) older than 25s
        if (ts && now - ts > 25000) {
          if (dbRemove) dbRemove(dbRef(rtdb, `rooms/${ROOM_ID}/players/${id}`)).catch(() => {});
          return;
        }
        const existing = remotePlayers[id] || {};
        const targetX = Number(d.x) || 0;
        const targetY = Number(d.y) || 0;
        next[id] = {
          name: safeName,
          targetX,
          targetY,
          renderX: existing.renderX ?? targetX,
          renderY: existing.renderY ?? targetY,
          angle: Number(d.rotation ?? d.angle ?? 0),
          hp: d.hp,
          alive: d.alive !== false,
          appearance: d.appearance || null,
        };
      });
      remotePlayers = next;
      window.remotePlayers = remotePlayers;
      window.getRemoteCount = () => Object.keys(remotePlayers).length;
      console.info("[MP] Players snapshot keys:", Object.keys(remotePlayers));
      console.info("[MP] Raw players snapshot:", data);
      playersReady = true;
    };

    unsubPlayers = get("dbOnValue")(
      playersRef,
      applySnapshot,
      (err) => console.warn("RTDB players listener error:", err?.message || err)
    );

    // Fallback: one-time fetch to populate immediately
    const dbGet = get("dbGet");
    if (dbGet) {
      dbGet(playersRef).then(applySnapshot).catch((err) => console.warn("RTDB players get failed:", err?.message || err));
    }

    if (unsubBulletsAdd) unsubBulletsAdd();
    unsubBulletsAdd = get("dbOnChildAdded")(bulletsRef, (snap) => {
      const id = snap.key;
      if (seenBullets.has(id)) return;
      seenBullets.add(id);
      const b = snap.val();
      if (!b) return;
      // Ignore very stale bullets (older than 5s)
      const now = Date.now();
      if (b.ts && now - b.ts > 5000) return;
      if (b.ownerId === localPlayerId) return; // already spawned locally
      const angle = Math.atan2(b.vy, b.vx);
      const speed = Math.hypot(b.vx, b.vy);
      const bullet = createBullet(b.x, b.y, angle, speed, "player", {
        color: "#8ff0c9",
        piercing: false,
        ownerId: b.ownerId || null,
        damage: b.damage || 20,
      });
      bullet.id = id;
      bullets.push(bullet);
    });

    if (unsubBulletsRemove) unsubBulletsRemove();
    unsubBulletsRemove = get("dbOnChildRemoved")(bulletsRef, (snap) => {
      const id = snap.key;
      bullets = bullets.filter((b) => b.id !== id);
      seenBullets.delete(id);
    });

    // Shared pickups
    const onPickups = (snap) => {
      const data = snap.val() || {};
      pickups = Object.keys(data).map((id) => {
        const p = data[id] || {};
        return { id, x: p.x || 0, y: p.y || 0, size: p.size || 16, type: p.type || "health" };
      });
    };
    unsubPickups = get("dbOnValue")(pickupsRef, onPickups, () => {});

    // Shared enemies (spawn sync only; AI local)
    const onEnemies = (snap) => {
      const data = snap.val() || {};
      enemies = Object.keys(data).map((id) => {
        const e = data[id] || {};
        return {
          id,
          type: e.type || "light",
          x: e.x || 0,
          y: e.y || 0,
          size: e.size || 30,
          dx: e.dx || 0,
          dy: e.dy || 0,
          angle: e.angle || 0,
          speed: e.speed || 2,
          bulletSpeed: e.bulletSpeed || 3,
          fireDelay: e.fireDelay || 60,
          hp: e.hp || 50,
          maxHp: e.maxHp || 50,
          scoreValue: e.scoreValue || 10,
          fireCooldown: Math.random() * (e.fireDelay || 60),
        };
      });
    };
    unsubEnemies = get("dbOnValue")(enemiesRef, onEnemies, () => {});

    positionInterval = setInterval(writePlayerState, 100);
    window.addEventListener("beforeunload", teardownMultiplayer);
  }

  function teardownMultiplayer() {
    const rtdb = get("rtdb");
    const dbRef = get("dbRef");
    const dbRemove = get("dbRemove");
    if (unsubPlayers) unsubPlayers();
    if (unsubBulletsAdd) unsubBulletsAdd();
    if (unsubBulletsRemove) unsubBulletsRemove();
    if (unsubPickups) unsubPickups();
    if (unsubEnemies) unsubEnemies();
    unsubPlayers = unsubBulletsAdd = unsubBulletsRemove = unsubPickups = unsubEnemies = null;
    if (localPlayerId && playersRef) {
      dbRemove(dbRef(rtdb, `rooms/${ROOM_ID}/players/${localPlayerId}`)).catch(() => {});
    }
    localPlayerId = null;
    window.localPlayerId = null;
    playersRef = null;
    bulletsRef = null;
    playerRef = null;
    remotePlayers = {};
    seenBullets.clear();
    if (positionInterval) clearInterval(positionInterval);
    positionInterval = null;
  }

  function drawRemotePlayers() {
    Object.keys(remotePlayers).forEach((id) => {
      const rp = remotePlayers[id];
      if (!rp || rp.alive === false) return;
      // Light interpolation for smoother motion
      rp.renderX = lerp(rp.renderX ?? rp.targetX, rp.targetX, 0.18);
      rp.renderY = lerp(rp.renderY ?? rp.targetY, rp.targetY, 0.18);
      const dummy = { x: rp.renderX, y: rp.renderY, size: player.size, angle: rp.angle || 0 };
      const palette = rp.appearance || remotePalette;
      drawTank(dummy, palette, dummy.angle);
      if (typeof drawNameTag === "function") drawNameTag(dummy, rp.name || "Player", "#8ff1e9");
    });
  }

function writePlayerState() {
  const rtdb = get("rtdb");
  const dbRef = get("dbRef");
  if (!playersRef || !localPlayerId) return;
  const p = player;
  const safeName = (window.currentPlayerName || playerName || "").trim();
  // If no name provided, do not publish this player (keeps lobbies clean)
  if (!safeName) return;
    // Use set to ensure presence node always exists/overwrites cleanly
    const targetRef = playerRef || dbRef(rtdb, `rooms/${ROOM_ID}/players/${localPlayerId}`);
    const presence = get("dbOnDisconnect");
    if (presence) {
      presence(targetRef).remove().catch(() => {});
    }
  get("dbSet")(targetRef, {
    name: safeName,
    x: p.x,
    y: p.y,
    angle: p.angle || 0,
    rotation: p.angle || 0,
    hp: p.health,
    alive: p.health > 0,
    kills: p.kills || 0,
    appearance: typeof playerAppearance !== "undefined" ? playerAppearance : null,
    ts: Date.now(),
  }).catch((err) => console.warn("RTDB player update failed:", err?.message || err));
}

// Best-effort kill credit
function creditKill(ownerId) {
  const rtdb = get("rtdb");
  const dbRef = get("dbRef");
  const dbGet = get("dbGet");
  const dbSet = get("dbSet");
  if (!ownerId || !rtdb || !dbRef || !dbGet || !dbSet) return;
  const ref = dbRef(rtdb, `rooms/${ROOM_ID}/players/${ownerId}`);
  dbGet(ref)
    .then((snap) => {
      if (!snap.exists()) return;
      const data = snap.val() || {};
      const kills = Number(data.kills || 0) + 1;
      dbSet(ref, { ...data, kills, ts: Date.now() }).catch(() => {});
    })
    .catch(() => {});
}

function eliminateSelf() {
  const rtdb = get("rtdb");
  const dbRef = get("dbRef");
  const dbRemove = get("dbRemove");
  if (localPlayerId && dbRemove && rtdb && dbRef) {
    dbRemove(dbRef(rtdb, `rooms/${ROOM_ID}/players/${localPlayerId}`)).catch(() => {});
  }
  window.localPlayerId = null;
  // Remove owned bullets locally
  bullets = bullets.filter((b) => b.ownerId !== localPlayerId);
}

  function publishNetworkBullet(bullet) {
    const rtdb = get("rtdb");
    const dbRef = get("dbRef");
    const dbSet = get("dbSet");
    if (!bulletsRef || !localPlayerId) return;
    const id = crypto.randomUUID();
    const vx = Math.cos(bullet.angle || 0) * (bullet.speed || 5);
    const vy = Math.sin(bullet.angle || 0) * (bullet.speed || 5);
    dbSet(dbRef(rtdb, `rooms/${ROOM_ID}/bullets/${id}`), {
      ownerId: localPlayerId,
      x: bullet.x,
      y: bullet.y,
      vx,
      vy,
      damage: bullet.damage || 20,
      ts: Date.now(),
    }).catch((err) => console.warn("RTDB bullet publish failed:", err?.message || err));
    // Tag local bullet with RTDB id for cleanup
    bullet.rtdbId = id;
  }

  function cleanupMultiplayer() {
    // Placeholder for light cleanup; listeners above already keep state fresh.
    return;
  }

function removeNetworkBullet(bulletId) {
  const rtdb = get("rtdb");
  const dbRef = get("dbRef");
  const dbRemove = get("dbRemove");
  if (!bulletId || !rtdb || !dbRef || !dbRemove) return;
  dbRemove(dbRef(rtdb, `rooms/${ROOM_ID}/bullets/${bulletId}`)).catch(() => {});
}

// Apply damage to a remote player (best effort)
function damageRemotePlayer(targetId, damage, attackerId) {
  const rtdb = get("rtdb");
  const dbRef = get("dbRef");
  const dbGet = get("dbGet");
  const dbSet = get("dbSet");
    const dbRemove = get("dbRemove");
    if (!targetId || !rtdb || !dbRef || !dbGet || !dbSet) return;
    const ref = dbRef(rtdb, `rooms/${ROOM_ID}/players/${targetId}`);
    dbGet(ref)
      .then((snap) => {
        if (!snap.exists()) return;
        const data = snap.val() || {};
        const hp = Number(data.hp || 0);
        const nextHp = Math.max(0, hp - (damage || 20));
        if (nextHp <= 0 && dbRemove) {
          dbRemove(ref).catch(() => {});
          if (attackerId && typeof creditKill === "function") creditKill(attackerId);
          return;
        }
        dbSet(ref, { ...data, hp: nextHp, ts: Date.now() }).catch(() => {});
    })
    .catch(() => {});
}

function publishNetworkPickup(p) {
  const rtdb = get("rtdb");
  const dbRef = get("dbRef");
  const dbSet = get("dbSet");
  if (!pickupsRef || !p || !p.id || !rtdb || !dbRef || !dbSet) return;
  dbSet(dbRef(rtdb, `rooms/${ROOM_ID}/pickups/${p.id}`), {
    x: p.x,
    y: p.y,
    size: p.size,
    type: p.type,
    ts: Date.now(),
  }).catch(() => {});
}

function removeNetworkPickup(id) {
  const rtdb = get("rtdb");
  const dbRef = get("dbRef");
  const dbRemove = get("dbRemove");
  if (!id || !rtdb || !dbRef || !dbRemove) return;
  dbRemove(dbRef(rtdb, `rooms/${ROOM_ID}/pickups/${id}`)).catch(() => {});
}

function publishNetworkEnemy(e) {
  const rtdb = get("rtdb");
  const dbRef = get("dbRef");
  const dbSet = get("dbSet");
  if (!enemiesRef || !e || !rtdb || !dbRef || !dbSet) return;
  const id = e.id || crypto.randomUUID();
  dbSet(dbRef(rtdb, `rooms/${ROOM_ID}/enemies/${id}`), {
    type: e.type,
    x: e.x,
    y: e.y,
    size: e.size,
    dx: e.dx,
    dy: e.dy,
    angle: e.angle,
    speed: e.speed,
    bulletSpeed: e.bulletSpeed,
    fireDelay: e.fireDelay,
    hp: e.hp,
    maxHp: e.maxHp,
    scoreValue: e.scoreValue,
    ts: Date.now(),
  }).catch(() => {});
}

function removeNetworkEnemy(id) {
  const rtdb = get("rtdb");
  const dbRef = get("dbRef");
  const dbRemove = get("dbRemove");
  if (!id || !rtdb || !dbRef || !dbRemove) return;
  dbRemove(dbRef(rtdb, `rooms/${ROOM_ID}/enemies/${id}`)).catch(() => {});
}

function isMultiplayerHost() {
  const ids = Object.keys(remotePlayers);
  if (localPlayerId) ids.push(localPlayerId);
  if (ids.length === 0) return false;
  ids.sort();
    return localPlayerId === ids[0];
  }

  // Expose globals so game.js/player.js can call them
  window.startMultiplayerLayer = startMultiplayerLayer;
  window.teardownMultiplayer = teardownMultiplayer;
  window.drawRemotePlayers = drawRemotePlayers;
window.publishNetworkBullet = publishNetworkBullet;
window.cleanupMultiplayer = cleanupMultiplayer;
window.creditKill = creditKill;
window.eliminateSelf = eliminateSelf;
window.removeNetworkBullet = removeNetworkBullet;
window.damageRemotePlayer = damageRemotePlayer;
window.isMultiplayerHost = isMultiplayerHost;
window.publishNetworkPickup = publishNetworkPickup;
window.removeNetworkPickup = removeNetworkPickup;
window.publishNetworkEnemy = publishNetworkEnemy;
window.removeNetworkEnemy = removeNetworkEnemy;
})();
