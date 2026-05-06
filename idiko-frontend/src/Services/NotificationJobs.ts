// src/Services/NotificationJobs.ts
import { db } from "../firebase"; // make sure this exports your Firestore instance
import {
  collection,
  doc,
  setDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";

export type NotificationJob = {
  id: string;
  notifyRequestId: string;
  phone: string;
  idNumber: string;
  fullName: string;
  status: "pending" | "sent" | "failed";
  createdAt: string;
  lastTriedAt?: string;
  attempts?: number;
};

// Firestore collection
const NOTIFICATION_JOBS_COLLECTION = "notification_jobs";

/**
 * Subscribe to all notification jobs in real-time.
 * Returns an unsubscribe function to stop listening.
 */
export const subscribeNotificationJobs = (
  callback: (jobs: NotificationJob[]) => void
): Unsubscribe => {
  const colRef = collection(db, NOTIFICATION_JOBS_COLLECTION);
  return onSnapshot(colRef, (snapshot) => {
    const jobs = snapshot.docs.map(docSnap => docSnap.data() as NotificationJob);
    callback(jobs);
  });
};

/**
 * Save a single job to Firestore
 */
const saveNotificationJob = async (job: NotificationJob) => {
  await setDoc(doc(db, NOTIFICATION_JOBS_COLLECTION, job.id), job);
};

/**
 * Create a notification job ONLY ONCE per notifyRequestId
 */
export const createNotificationJob = async (data: {
  notifyRequestId: string;
  phone: string;
  idNumber: string;
  fullName: string;
}) => {
  if (!data.phone) {
    console.warn("❌ Notification job not created: missing phone number");
    return;
  }

  // Firestore-safe check for existing job
  const q = query(
    collection(db, NOTIFICATION_JOBS_COLLECTION),
    where("notifyRequestId", "==", data.notifyRequestId)
  );
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    console.log("ℹ️ Notification job already exists for:", data.notifyRequestId);
    return;
  }

  const newJob: NotificationJob = {
    id: crypto.randomUUID(),
    notifyRequestId: data.notifyRequestId,
    phone: data.phone,
    idNumber: data.idNumber,
    fullName: data.fullName,
    status: "pending",
    createdAt: new Date().toISOString(),
    attempts: 0,
  };

  await saveNotificationJob(newJob);
  console.log("✅ Notification job created:", newJob);
};
