// Firebase initialization (modular v12, no bundler)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// Provided project credentials (no analytics)
const firebaseConfig = {
  apiKey: "AIzaSyDGld6iY6dKbHBvoYH82-KJTswKCnQjmBk",
  authDomain: "steeldashbulletstorm.firebaseapp.com",
  projectId: "steeldashbulletstorm",
  storageBucket: "steeldashbulletstorm.appspot.com",
  messagingSenderId: "358145837498",
  appId: "1:358145837498:web:37f263dfabfa773345f583",
  measurementId: "G-JDMK2JGLQB",
};

let app = null;
let db = null;
try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (err) {
  console.warn("Firebase initialization error:", err);
}

export { app, db };
// Also expose on window for legacy/global access
window.db = db;
