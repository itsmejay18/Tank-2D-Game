// Utility helpers shared across the game

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

function rectanglesOverlap(r1, r2) {
  return r1.x < r2.x + r2.width && r1.x + r1.width > r2.x && r1.y < r2.y + r2.height && r1.y + r1.height > r2.y;
}

function getCenter(obj) {
  return { x: obj.x + obj.size / 2, y: obj.y + obj.size / 2 };
}

function isPointInsideRect(px, py, rect) {
  return px >= rect.x && px <= rect.x + rect.size && py >= rect.y && py <= rect.y + rect.size;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}
