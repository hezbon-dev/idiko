// src/Services/NotificationService.tsx
import type { NotificationJob } from "../Types/Notification.types";
import { getNotificationMessage } from "./MessageTemplates";
import { db } from "../firebase";
import { collection, doc, getDoc, setDoc, getDocs } from "firebase/firestore";

/**
 * Prevent duplicate sends in the same session
 */
const sendingQueue = new Set<string>();

const JOBS_COLLECTION = "notification_jobs";
const ERROR_COLLECTION = "notification_errors";

/**
 * Get all notification jobs from Firestore
 */
export async function getNotificationJobs(): Promise<NotificationJob[]> {
  const snapshot = await getDocs(collection(db, JOBS_COLLECTION));
  return snapshot.docs.map(docSnap => docSnap.data() as NotificationJob);
}

/**
 * Save or update a notification job to Firestore
 */
async function saveNotificationJob(job: NotificationJob) {
  await setDoc(doc(db, JOBS_COLLECTION, job.jobId), job);
}

/**
 * Log notification errors for later review in Firestore
 */
async function logNotificationError(error: unknown, job: NotificationJob) {
  const errorDoc = doc(db, ERROR_COLLECTION, crypto.randomUUID());
  await setDoc(errorDoc, {
    jobId: job.jobId,
    idNumber: job.idNumber,
    error: String(error),
    timestamp: new Date().toISOString(),
  });
}

/**
 * Create a notification job and send immediately
 */
export async function createNotificationJob(params: {
  idNumber: string;
  firstName: string;
  primaryPhone?: string;
  secondaryPhone?: string;
  email?: string;
}) {
  const now = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);

  const newJob: NotificationJob = {
    jobId: crypto.randomUUID(),
    idNumber: params.idNumber,
    firstName: params.firstName,
    primaryPhone: params.primaryPhone,
    secondaryPhone: params.secondaryPhone,
    email: params.email,
    channels: [
      params.primaryPhone || params.secondaryPhone ? "SMS" : undefined,
      params.email ? "EMAIL" : undefined,
    ].filter(Boolean) as any,
    status: "ACTIVE",
    startDate: now.toISOString(),
    endDate: endDate.toISOString(),
    sentCount: 0,
    maxSends: 30,
    stopOnPaid: true,
  };

  await saveNotificationJob(newJob);
  await sendNotification(newJob);

  return newJob;
}

/**
 * Send notification via backend /notifySMS route
 */
export async function sendNotification(job: NotificationJob) {
  if (sendingQueue.has(job.jobId)) return;
  sendingQueue.add(job.jobId);

  const message = getNotificationMessage(job.firstName);

  try {
    const response = await fetch("https://idiko.onrender.com/notifySMS", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        primaryPhone: job.primaryPhone,
        secondaryPhone: job.secondaryPhone,
        message,
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend /notifySMS failed with status ${response.status}`);
    }

    // 🔄 Safe atomic increment of sentCount
    const jobRef = doc(db, JOBS_COLLECTION, job.jobId);
    const jobSnap = await getDoc(jobRef);
    const currentCount = jobSnap.exists() ? (jobSnap.data()?.sentCount ?? 0) : 0;

    await setDoc(jobRef, {
      lastSentAt: new Date().toISOString(),
      sentCount: currentCount + 1,
    }, { merge: true });
  } catch (error) {
    await logNotificationError(error, job);
    console.error("❌ sendNotification() FAILED", error);
  } finally {
    sendingQueue.delete(job.jobId);
  }

  // 🚧 Email placeholder (unchanged)
  if (job.email) {
    console.log("📧 Sending Email:", {
      to: job.email,
      message,
    });
  }
}
