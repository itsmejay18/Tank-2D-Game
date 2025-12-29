// Input handling: keyboard, mouse, mobile joystick

let keys = {};
let keyboardKeys = {};
let touchKeyCounts = {};
// Mouse position defaults to origin; updated once canvas exists/mouse moves.
let mousePos = { x: 0, y: 0 };
const joystickState = {
  active: false,
  pointerId: null,
  base: { x: 0, y: 0 },
  vector: { x: 0, y: 0 },
  distance: 0,
  maxRadius: 70,
};

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
  handleJoystickMove(e);
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
