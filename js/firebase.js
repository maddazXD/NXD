import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDsLzBPcGJ6uy5yvo4WzS13Wpttv-6B4dQ",
  authDomain: "nobarxd-7bf9a.firebaseapp.com",
  databaseURL: "https://nobarxd-7bf9a-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "nobarxd-7bf9a",
  storageBucket: "nobarxd-7bf9a.firebasestorage.app",
  messagingSenderId: "383447371423",
  appId: "1:383447371423:web:47cc61d43bba3b596a1caa"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);