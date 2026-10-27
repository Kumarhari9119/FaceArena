
import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";

import {
  getAuth,signInAnonymously,onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import {
  getFirestore,serverTimestamp,collection,addDoc,getDocs,
  query,where,orderBy,limit,
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

// Keep the same Firebase configuration as your current index.html.
const firebaseConfig = {
  apiKey: "AIzaSyAub9AZe1jPmj2cCQkDUrPA8gyYA00I_AY",
  authDomain: "facearena-2bc96.firebaseapp.com",
  projectId: "facearena-2bc96",
  storageBucket: "facearena-2bc96.firebasestorage.app",
  messagingSenderId: "514746192894",
  appId: "1:514746192894:web:d21075b5904186a696a6af"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Make sure Firebase has restored the current session first.
// If there is no session, create a guest identity.
export const authReady = new Promise((resolve, reject) => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    unsubscribe();

    try {
      if (user) {
        resolve(user);
      } else {
        const result = await signInAnonymously(auth);
        resolve(result.user);
      }
    } catch (error) {
      console.error("FaceArena authentication failed:", error);
      reject(error);
    }
  });
});

authReady
  .then((user) => {
    console.log("FaceArena Firebase connected.");
    console.log("Guest/authenticated UID:", user.uid);
  })
  .catch((error) => {
    console.error("FaceArena setup error:", error.code, error.message);
  });

// Expose selected Firestore helpers for future feature modules.
export {
  serverTimestamp,collection,addDoc,
  getDocs,query,where,orderBy,limit
};
