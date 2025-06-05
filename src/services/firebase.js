// src/services/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBE6ATxwoFSdGWFvm43AFS5SyToAdMQwLY",
  authDomain: "copaint-27b3e.firebaseapp.com",
  databaseURL: "https://copaint-27b3e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "copaint-27b3e",
  storageBucket: "copaint-27b3e.firebasestorage.app",
  messagingSenderId: "693145118424",
  appId: "1:693145118424:web:27b96d9ee7cae5b52759ad",
  measurementId: "G-92CQ2KKQBW"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const firestore = getFirestore(app);
