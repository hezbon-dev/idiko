// src/firebase.ts

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDKhHJPB6nNkO5vm58",
  authDomain: "idiko-81906.firebaseapp.com",
  projectId: "idiko-81906",
  storageBucket: "idiko-81906.firebasestorage.app",
  messagingSenderId: "755686",
  appId: "1:755505525686:w692a79444717",
  measurementId: "G-K5MX"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
