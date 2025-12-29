import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const SCORES_COLLECTION = "scores";
const scoresRef = () => (db ? collection(db, SCORES_COLLECTION) : null);

export async function saveScore(playerName, score) {
  const ref = scoresRef();
  if (!ref) return;
  try {
    await addDoc(ref, {
      playerName: playerName || "Player",
      score: Number(score) || 0,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("Error saving score:", err);
  }
}

export async function loadTopScores() {
  const ref = scoresRef();
  if (!ref) return [];
  const q = query(ref, orderBy("score", "desc"), limit(10));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data());
}

function renderLeaderboard(rows) {
  const body = document.getElementById("leaderboardBody") || document.getElementById("leaderboard");
  if (!body) return;
  if (!rows || rows.length === 0) {
    body.innerHTML = "No scores yet.";
    return;
  }
  body.innerHTML = "";
  rows.forEach((row, idx) => {
    const div = document.createElement("div");
    div.className = "leaderboard-row";
    div.innerHTML = `<span>#${idx + 1}</span><span>${row.playerName || "Player"}</span><span>${row.score || 0}</span>`;
    body.appendChild(div);
  });
}

export async function showLeaderboard() {
  try {
    const scores = await loadTopScores();
    renderLeaderboard(scores);
  } catch (err) {
    console.warn("Failed to load leaderboard:", err);
    renderLeaderboard([]);
  }
}

// Expose to window for existing game code hooks
window.saveScore = saveScore;
window.showLeaderboard = showLeaderboard;

// Auto-load on startup
showLeaderboard();
