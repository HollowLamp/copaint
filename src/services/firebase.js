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

// 当上一个配置对应的firebase使用量达到上限时，请使用这个配置，两者数据不互通，仅作备份使用
// const firebaseConfig = {
//   apiKey: "AIzaSyCteE3ZaUOX3Uh9OiLdTNbRGZGdHuPh6Qo",
//   authDomain: "copaint-backup.firebaseapp.com",
//   projectId: "copaint-backup",
//   storageBucket: "copaint-backup.firebasestorage.app",
//   messagingSenderId: "893027105378",
//   appId: "1:893027105378:web:fb0b5c53a1f55d3ba76f3b",
//   measurementId: "G-FSJRQYH3QP"
// };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const firestore = getFirestore(app);
