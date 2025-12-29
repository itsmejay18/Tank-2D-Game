// Multiplayer scaffolding using Firebase Realtime Database (optional online mode)
// Plain script (no bundler); expects firebase.js to have exported helpers on window.

(function () {
  // Helper accessors so we always read the latest Firebase globals even if the module loads later.
  const get = (k) => window[k];
  const ROOM_ID = "global-room"; // all online players share this room

  let localPlayerId = null;
  let playersRef = null;
  let bulletsRef = null;
  let remotePlayers = {};
  let seenBullets = new Set();
  let positionInterval = null;
  let pendingStart = false;

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
    localPlayerId = crypto.randomUUID();
    playersRef = dbRef(rtdb, `rooms/${ROOM_ID}/players`);
    bulletsRef = dbRef(rtdb, `rooms/${ROOM_ID}/bullets`);
    writePlayerState();

    get("dbOnValue")(playersRef, (snap) => {
      const data = snap.val() || {};
      remotePlayers = {};
      Object.keys(data).forEach((id) => {
        if (id === localPlayerId) return;
        remotePlayers[id] = data[id];
      });
    });

    get("dbOnChildAdded")(bulletsRef, (snap) => {
      const id = snap.key;
      if (seenBullets.has(id)) return;
      seenBullets.add(id);
      const b = snap.val();
      if (!b) return;
      if (b.ownerId === localPlayerId) return; // already spawned locally
      const angle = Math.atan2(b.vy, b.vx);
      const speed = Math.hypot(b.vx, b.vy);
      const bullet = createBullet(b.x, b.y, angle, speed, "player", {
        color: "#8ff0c9",
        piercing: false,
      });
      bullet.id = id;
      bullets.push(bullet);
    });

    get("dbOnChildRemoved")(bulletsRef, (snap) => {
      const id = snap.key;
      bullets = bullets.filter((b) => b.id !== id);
      seenBullets.delete(id);
    });

    positionInterval = setInterval(writePlayerState, 100);
    window.addEventListener("beforeunload", teardownMultiplayer);
  }

  function teardownMultiplayer() {
    const rtdb = get("rtdb");
    const dbRef = get("dbRef");
    const dbRemove = get("dbRemove");
    if (localPlayerId && playersRef) {
      dbRemove(dbRef(rtdb, `rooms/${ROOM_ID}/players/${localPlayerId}`)).catch(() => {});
    }
    localPlayerId = null;
    playersRef = null;
    bulletsRef = null;
    remotePlayers = {};
    seenBullets.clear();
    if (positionInterval) clearInterval(positionInterval);
    positionInterval = null;
  }

  function drawRemotePlayers() {
    Object.keys(remotePlayers).forEach((id) => {
      const rp = remotePlayers[id];
      if (!rp || rp.alive === false) return;
      const dummy = { x: rp.x || 0, y: rp.y || 0, size: player.size, angle: rp.angle || 0 };
      drawTank(dummy, remotePalette, dummy.angle);
      if (typeof drawNameTag === "function") drawNameTag(dummy, rp.name || "Player", "#8ff1e9");
    });
  }

  function writePlayerState() {
    const rtdb = get("rtdb");
    const dbRef = get("dbRef");
    const dbUpdate = get("dbUpdate");
    if (!playersRef || !localPlayerId) return;
    const p = player;
    dbUpdate(dbRef(rtdb, `rooms/${ROOM_ID}/players/${localPlayerId}`), {
      name: window.currentPlayerName || playerName || "Player",
      x: p.x,
      y: p.y,
      angle: p.angle || 0,
      hp: p.health,
      alive: p.health > 0,
      ts: Date.now(),
    }).catch(() => {});
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
      ts: Date.now(),
    }).catch(() => {});
  }

  function cleanupMultiplayer() {
    // Placeholder for light cleanup; listeners above already keep state fresh.
    return;
  }

  // Expose globals so game.js/player.js can call them
  window.startMultiplayerLayer = startMultiplayerLayer;
  window.teardownMultiplayer = teardownMultiplayer;
  window.drawRemotePlayers = drawRemotePlayers;
  window.publishNetworkBullet = publishNetworkBullet;
  window.cleanupMultiplayer = cleanupMultiplayer;
})();
