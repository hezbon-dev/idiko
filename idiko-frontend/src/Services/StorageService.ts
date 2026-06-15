// src/Services/StorageService.ts
import { db } from "../firebase";
import { doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";

/**
 * StorageService acts as a centralized wrapper for Firestore reads/writes.
 * It replaces localStorage usage gradually and keeps the app consistent.
 *
 * SPECIAL CASE:
 * currentStaff and sessionId are stored locally per browser/device
 * so staff stations do not overwrite each other.
 *
 * Usage:
 * await StorageService.set("key", value);
 * const value = await StorageService.get("key");
 * await StorageService.remove("key");
 */
export const StorageService = {
  /**
   * Save a key-value pair
   */
  async set(key: string, value: any) {
    try {
      // ✅ Device-specific session data
      if (key === "currentStaff" || key === "sessionId") {
        localStorage.setItem(key, JSON.stringify(value));
        console.log(`✅ StorageService: Set local key "${key}"`);
        return;
      }

      // ✅ Everything else stays in Firestore
      const docRef = doc(db, "appStorage", key);
      await setDoc(docRef, { value });

      console.log(`✅ StorageService: Set key "${key}"`);
    } catch (err) {
      console.error(`❌ StorageService: Failed to set key "${key}"`, err);
    }
  },

  /**
   * Read a value by key
   */
  async get(key: string) {
    try {
      // ✅ Device-specific session data
      if (key === "currentStaff" || key === "sessionId") {
        const value = localStorage.getItem(key);

        return value ? JSON.parse(value) : null;
      }

      // ✅ Everything else comes from Firestore
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
   * Remove a key
   */
  async remove(key: string) {
    try {
      // ✅ Device-specific session data
      if (key === "currentStaff" || key === "sessionId") {
        localStorage.removeItem(key);

        console.log(`✅ StorageService: Removed local key "${key}"`);
        return;
      }

      // ✅ Everything else remains in Firestore
      const docRef = doc(db, "appStorage", key);
      await deleteDoc(docRef);

      console.log(`✅ StorageService: Removed key "${key}"`);
    } catch (err) {
      console.error(`❌ StorageService: Failed to remove key "${key}"`, err);
    }
  },
};