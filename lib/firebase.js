// lib/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDBwywkwEMIxvE2JoGXztImZ8D7csC5hUo",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "women-saftey-10c68.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "women-saftey-10c68",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "women-saftey-10c68.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "964655795379",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:964655795379:web:46211570f36e7d4e9534c6",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-5VG693D4C3",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://women-saftey-10c68-default-rtdb.firebaseio.com"
};

// Using a client-side only approach to Firebase initialization
let app;
let db;
let realDb;
let auth;

// Only initialize Firebase on the client side
if (typeof window !== 'undefined') {
  try {
    // Initialize Firebase with singleton pattern
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    db = getFirestore(app);
    realDb = getDatabase(app);
    auth = getAuth(app);
  } catch (error) {
    console.error("Firebase initialization error:", error);
  }
}

export { db, realDb, auth, app };