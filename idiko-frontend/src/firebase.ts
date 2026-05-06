// src/firebase.ts

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDKhHJPB6n6JkZtB3bZZ90pCM6NkO5vm58",
  authDomain: "idiko-81906.firebaseapp.com",
  projectId: "idiko-81906",
  storageBucket: "idiko-81906.firebasestorage.app",
  messagingSenderId: "755505525686",
  appId: "1:755505525686:web:931de36c30692a79444717",
  measurementId: "G-K56Z3K25MX"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
