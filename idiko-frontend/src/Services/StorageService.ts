// src/Services/StorageService.ts
import { db } from "../firebase";
import { doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";

/**
 * StorageService acts as a centralized wrapper for Firestore reads/writes.
 * It replaces localStorage usage gradually and keeps the app consistent.
 * 
 * Usage:
 * await StorageService.set("key", value);
 * const value = await StorageService.get("key");
 * await StorageService.remove("key");
 */
export const StorageService = {
  /**
   * Save a key-value pair in Firestore
   * @param key string - the key to store
   * @param value any - the value to store (JSON-serializable)
   */
  async set(key: string, value: any) {
    try {
      const docRef = doc(db, "appStorage", key);
      await setDoc(docRef, { value });
      console.log(`✅ StorageService: Set key "${key}"`);
    } catch (err) {
      console.error(`❌ StorageService: Failed to set key "${key}"`, err);
    }
  },

  /**
   * Read a value by key from Firestore
   * @param key string - the key to fetch
   * @returns Promise<any | null> - returns null if not found
   */
  async get(key: string) {
    try {
      const docRef = doc(db, "appStorage", key);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data()?.value ?? null;
      }
      return null;
    } catch (err) {
      console.error(`❌ StorageService: Failed to get key "${key}"`, err);
      return null;
    }
  },

  /**
   * Remove a key from Firestore
   * @param key string
   */
  async remove(key: string) {
    try {
      const docRef = doc(db, "appStorage", key);
      await deleteDoc(docRef);
      console.log(`✅ StorageService: Removed key "${key}"`);
    } catch (err) {
      console.error(`❌ StorageService: Failed to remove key "${key}"`, err);
    }
  },
};
