// src/Services/NotificationScheduler.tsx
import type { NotifyRequestType } from "../context/RecordContext";
import type { NotificationJob } from "../Types/Notification.types";
import { sendNotification } from "./NotificationService";
import { db } from "../firebase";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";

/**
 * Convert NotifyRequestType → NotificationJob-compatible object
 */
function toNotificationJob(req: NotifyRequestType): NotificationJob {
  const firstName = req.fullName.split(" ")[0];
  return {
    jobId: `job_${req.id}`,
    idNumber: req.idNumber,
    firstName,
    primaryPhone: req.primaryPhone,
    secondaryPhone: req.secondaryPhone,
    email: req.email,
    channels: ["SMS", "EMAIL"],
    status: "ACTIVE",
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    lastSentAt: undefined,
    sentCount: 0,
    maxSends: 30,
    stopOnPaid: true,
  };
}

const SCHEDULE_COLLECTION = "notification_schedule";

export type ScheduleEntry = {
  notifyRequestId: string;
  startedAt: string;
  lastSentAt?: string;
  stopped?: boolean;
};

/**
 * Firestore real-time subscription for schedule
 */
export const subscribeSchedule = (callback: (entries: ScheduleEntry[]) => void): Unsubscribe => {
  const colRef = collection(db, SCHEDULE_COLLECTION);
  return onSnapshot(colRef, snapshot => {
    const entries = snapshot.docs.map(docSnap => docSnap.data() as ScheduleEntry);
    callback(entries);
  });
};

/**
 * Get all schedule entries once
 */
async function loadSchedule(): Promise<ScheduleEntry[]> {
  const snapshot = await getDocs(collection(db, SCHEDULE_COLLECTION));
  return snapshot.docs.map(docSnap => docSnap.data() as ScheduleEntry);
}

/**
 * Save or update a single schedule entry to Firestore
 */
async function saveScheduleEntry(entry: ScheduleEntry) {
  await setDoc(doc(db, SCHEDULE_COLLECTION, entry.notifyRequestId), entry);
}

/**
 * Start notifications immediately after match
 */
export async function startNotificationSchedule(req: NotifyRequestType) {
  const schedule = await loadSchedule();
  const exists = schedule.find(s => s.notifyRequestId === req.id);
  if (exists) return;

  const entry: ScheduleEntry = {
    notifyRequestId: req.id,
    startedAt: new Date().toISOString(),
  };

  await saveScheduleEntry(entry);

  // 🔔 Send immediately
  sendNotification(toNotificationJob(req));
}

/**
 * Stop notifications (when Paid)
 */
export async function stopNotificationSchedule(notifyRequestId: string) {
  const entryRef = doc(db, SCHEDULE_COLLECTION, notifyRequestId);
  await updateDoc(entryRef, { stopped: true });
}

/**
 * Daily check (run once per app load or interval)
 */
export async function runNotificationScheduler(notifyRequests: NotifyRequestType[]) {
  const schedule = await loadSchedule();
  const now = Date.now();

  for (const entry of schedule) {
    if (entry.stopped) continue;

    const req = notifyRequests.find(r => r.id === entry.notifyRequestId);
    if (!req || !req.matched) continue;

    // ⛔ Stop immediately if Paid
    if (req.status === "Paid") {
      await stopNotificationSchedule(entry.notifyRequestId);
      continue;
    }

    const startedAt = new Date(entry.startedAt).getTime();
    const daysPassed = Math.floor((now - startedAt) / (1000 * 60 * 60 * 24));

    // ⛔ Stop after 30 days
    if (daysPassed >= 30) {
      await stopNotificationSchedule(entry.notifyRequestId);
      continue;
    }

    // ⏱ Prevent multiple sends per day
    if (entry.lastSentAt) {
      const lastSent = new Date(entry.lastSentAt).toDateString();
      const today = new Date().toDateString();
      if (lastSent === today) continue;
    }

    // 🔔 Send notification
    sendNotification(toNotificationJob(req));

    // Firestore-safe atomic update of lastSentAt
    const entryRef = doc(db, SCHEDULE_COLLECTION, entry.notifyRequestId);
    const entrySnap = await getDoc(entryRef);
    const currentData = entrySnap.exists() ? (entrySnap.data() as ScheduleEntry) : {};
    await updateDoc(entryRef, {
      ...currentData,
      lastSentAt: new Date().toISOString(),
    });
  }
}
