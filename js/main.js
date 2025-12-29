// Entry wiring: DOM events and screen toggles

function showCustomize() {
  if (animationId !== null) return; // prevent changing mid-run
  landingScreen.classList.add("hidden");
  gameWrapper.classList.add("hidden");
  if (customizePanel) customizePanel.classList.remove("hidden");
}

function hideCustomize() {
  if (customizePanel) customizePanel.classList.add("hidden");
  landingScreen.classList.remove("hidden");
  gameWrapper.classList.add("hidden");
}

// Event bindings
if (startBtn) startBtn.addEventListener("click", startGame);
if (customizeBtn) customizeBtn.addEventListener("click", showCustomize);
if (customizeBack) customizeBack.addEventListener("click", hideCustomize);

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
