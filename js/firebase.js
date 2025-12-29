// Firebase initialization (modular v12, no bundler)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import {
  getDatabase,
  ref,
  set,
  update,
  remove,
  onValue,
  onChildAdded,
  onChildRemoved,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

// Provided project credentials (no analytics)
const firebaseConfig = {
  apiKey: "AIzaSyDGld6iY6dKbHBvoYH82-KJTswKCnQjmBk",
  authDomain: "steeldashbulletstorm.firebaseapp.com",
  projectId: "steeldashbulletstorm",
  databaseURL: "https://steeldashbulletstorm-default-rtdb.asia-southeast1.firebasedatabase.app",
  storageBucket: "steeldashbulletstorm.appspot.com",
  messagingSenderId: "358145837498",
  appId: "1:358145837498:web:37f263dfabfa773345f583",
  measurementId: "G-JDMK2JGLQB",
};

let app = null;
let db = null;
let rtdb = null;
try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  // Force the correct regional RTDB endpoint to avoid region warnings
  rtdb = getDatabase(app, firebaseConfig.databaseURL);
} catch (err) {
  console.warn("Firebase initialization error:", err);
}

export { app, db, rtdb };
// Re-export RTDB helpers so other modules can import from one place.
export const dbRef = ref;
export const dbSet = set;
export const dbUpdate = update;
export const dbRemove = remove;
export const dbOnValue = onValue;
export const dbOnChildAdded = onChildAdded;
export const dbOnChildRemoved = onChildRemoved;

// Also expose on window for legacy/global access
window.db = db;
window.rtdb = rtdb;
window.dbRef = ref;
window.dbSet = set;
window.dbUpdate = update;
window.dbRemove = remove;
window.dbOnValue = onValue;
window.dbOnChildAdded = onChildAdded;
window.dbOnChildRemoved = onChildRemoved;
