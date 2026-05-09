// src/context/RecordContext.tsx

import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { runNotificationScheduler, startNotificationSchedule } from "../Services/NotificationScheduler";
import { db } from "../firebase";
import { collection, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore";
import { useAuth } from "./AuthContext";

/* ================= TYPES ================= */
export type RecordType = {
  stationId: string | null;
  uploadDate: string;
  fullName: string;
  idNumber: string;
  dob: string;
  sex: string;
  district: string;
  status: "Paid" | "Pending";
  frontImage: string;
  backImage: string;
  pickupStation?: string;
};

export type NotificationType = {
  fullName: string;
  idNumber: string;
  dob: string;
  sex: string;
  district: string;
  primaryPhone: string;
  secondaryPhone: string;
  email?: string;
};

export type NotifyRequestType = {
  status: string;
  id: string;
  fullName: string;
  idNumber: string;
  dob: string;
  sex: string;
  district: string;
  primaryPhone?: string;
  secondaryPhone?: string;
  email?: string;
  matched?: boolean;
  matchedID?: string;
  matchedDate?: string;
  createdAt?: string;
};

type RecordContextType = {
  records: RecordType[];
  recordsForStaff: RecordType[];
  allHistoryRecords: RecordType[];
  allRecords: RecordType[];
  trash: RecordType[];
  notifications: NotificationType[];
  notifyRequests: NotifyRequestType[];
  addRecord: (record: RecordType) => void;
  moveToTrash: (record: RecordType) => void;
  restoreRecord: (record: RecordType) => void;
  deleteRecord: (idNumber: string) => void;
  addNotification: (notification: NotificationType) => void;
  updateRecordStatus: (idNumber: string, status: "Paid" | "Pending") => void;
  updateNotifyRequest: (id: string, data: Partial<NotifyRequestType>) => void;
  addNotifyRequest: (req: NotifyRequestType) => boolean;
};

/* ================= CONTEXT ================= */
const RecordContext = createContext<RecordContextType | undefined>(undefined);

/* ================= PROVIDER ================= */
export const RecordProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [records, setRecords] = useState<RecordType[]>([]);
  const [allHistoryRecords, setAllHistoryRecords] = useState<RecordType[]>([]);
  const [trash, setTrash] = useState<RecordType[]>([]);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [notifyRequests, setNotifyRequests] = useState<NotifyRequestType[]>([]);

  const stationKey =
    user && user.includes(":")
      ? user.split(":")[1].trim().toLowerCase()
      : null;

  const trashIds = new Set(trash.map(t => t.idNumber));
  const allRecords = records.filter(r => !trashIds.has(r.idNumber));

  const recordsForStaff = !stationKey
    ? allRecords
    : allRecords.filter(r => r.pickupStation?.trim().toLowerCase() === stationKey);

  /* ================= FIRESTORE LISTENERS ================= */
  useEffect(() => {
    const filterByStation = (r: RecordType) =>
      !stationKey || r.pickupStation?.trim().toLowerCase() === stationKey;

    const unsubRecords = onSnapshot(collection(db, "records"), snap =>
      setRecords(snap.docs.map(d => d.data() as RecordType))
    );

    const unsubHistory = onSnapshot(collection(db, "allHistoryRecords"), snap =>
      setAllHistoryRecords(snap.docs.map(d => d.data() as RecordType).filter(filterByStation))
    );

    const unsubTrash = onSnapshot(collection(db, "trash"), snap =>
      setTrash(snap.docs.map(d => d.data() as RecordType).filter(filterByStation))
    );

    const unsubNotifications = onSnapshot(collection(db, "notifications"), snap =>
      setNotifications(snap.docs.map(d => d.data() as NotificationType))
    );

    const unsubNotifyReq = onSnapshot(collection(db, "notify_requests"), snap =>
      setNotifyRequests(snap.docs.map(d => d.data() as NotifyRequestType))
    );

    return () => {
      unsubRecords();
      unsubHistory();
      unsubTrash();
      unsubNotifications();
      unsubNotifyReq();
    };
  }, [stationKey]);

  /* ================= HELPERS ================= */
  const normalizeText = (s?: string) => (s || "").trim().toLowerCase();
  const normalizeId = (s?: string) => (s || "").replace(/\s+/g, "");
  
  const normalizePhone = (phone?: string) => {
    if (!phone) return "";

    // Remove spaces and non-digits except +
    let cleaned = phone.replace(/\s+/g, "").replace(/[^\d+]/g, "");

    // Convert 07XXXXXXXX → +2547XXXXXXXX
    if (cleaned.startsWith("0")) {
      cleaned = "+254" + cleaned.substring(1);
    }

    // Convert 7XXXXXXXX → +2547XXXXXXXX
    else if (cleaned.startsWith("7")) {
      cleaned = "+254" + cleaned;
    }

    // Convert 2547XXXXXXXX → +2547XXXXXXXX
    else if (cleaned.startsWith("254")) {
      cleaned = "+" + cleaned;
    }

    return cleaned;
  };

  const normalizeDOB = (dob?: string) => {
    if (!dob) return "";
    const parts = dob.includes("/") ? dob.split("/") : dob.split("-");
    if (parts.length !== 3) return dob;

    const [dd, mm, yyyy] = parts;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  };

  const saveToCollection = async <T,>(name: string, data: T & { id?: string; idNumber?: string }) => {
    const docId = data.id || data.idNumber;
    if (!docId) throw new Error("No id provided");
    await setDoc(doc(db, name, docId.toString()), data);
  };

  const removeFromCollection = async (name: string, id: string) => {
    await deleteDoc(doc(db, name, id));
  };

  /* ================= FUNCTIONS ================= */
  const addRecord = (record: RecordType) => {
    const normalizedRecord = {
      ...record,
      fullName: normalizeText(record.fullName),
      idNumber: normalizeId(record.idNumber),
      dob: normalizeDOB(record.dob),
      sex: normalizeText(record.sex),
      district: normalizeText(record.district),
      uploadDate: record.uploadDate || new Date().toISOString(),
      pickupStation: stationKey || record.pickupStation,
    };

    saveToCollection("records", normalizedRecord);
    saveToCollection("allHistoryRecords", normalizedRecord);
  };

  const addNotification = (notification: NotificationType) => {
    saveToCollection("notifications", notification);
  };

  const moveToTrash = async (record: RecordType) => {
    await saveToCollection("trash", record);
    await removeFromCollection("records", record.idNumber);

    const match = notifyRequests.find(r =>
      normalizeId(r.idNumber) === normalizeId(record.idNumber)
    );

    if (match?.id) {
      await removeFromCollection("notify_requests", match.id);
    }

    setRecords(prev => prev.filter(r => r.idNumber !== record.idNumber));
  };

  const restoreRecord = async (record: RecordType) => {
    await saveToCollection("records", record);
    await saveToCollection("allHistoryRecords", record);
    await removeFromCollection("trash", record.idNumber);
  };

  const deleteRecord = async (idNumber: string) => {
    await removeFromCollection("trash", idNumber);
  };

  const updateRecordStatus = (idNumber: string, status: "Paid" | "Pending") => {
    saveToCollection("records", { idNumber, status });
  };

  const updateNotifyRequest = (id: string, data: Partial<NotifyRequestType>) => {
    saveToCollection("notify_requests", { id, ...data });
  };

  const addNotifyRequest = (req: NotifyRequestType) => {
    const normalizedReq = {
      ...req,
      fullName: normalizeText(req.fullName),
      idNumber: normalizeId(req.idNumber),
      dob: normalizeDOB(req.dob),
      sex: normalizeText(req.sex),
      district: normalizeText(req.district),

      primaryPhone: normalizePhone(req.primaryPhone),
      secondaryPhone: normalizePhone(req.secondaryPhone),
    };

    const exists = notifyRequests.some(r =>
      normalizeId(r.idNumber) === normalizedReq.idNumber
    );

    if (exists) return false;

    saveToCollection("notify_requests", normalizedReq);
    return true;
  };

  /* ================= MATCHING ENGINE ================= */
  useEffect(() => {
    if (!notifyRequests.length || !allRecords.length) return;

    notifyRequests.forEach(async req => {
      if (req.matched) return;

      console.log(`🔎 Checking match for NotifyRequest ID: ${req.id} (${req.idNumber})`);

      const found = allRecords.find(r =>
        normalizeId(r.idNumber) === normalizeId(req.idNumber)
      );

      if (found) {
        console.log(`✅ MATCH FOUND → ${req.idNumber}`);

        const updatedReq = {
          ...req,
          matched: true,
          matchedID: found.idNumber,
          matchedDate: new Date().toISOString(),
        };
        saveToCollection("notify_requests", updatedReq);
        startNotificationSchedule(updatedReq);
      }
    });
  }, [notifyRequests, allRecords]);

  useEffect(() => {
    runNotificationScheduler(notifyRequests);
  }, [notifyRequests]);

  /* ================= RETURN PROVIDER ================= */
  return (
    <RecordContext.Provider value={{
      records,
      recordsForStaff,
      allHistoryRecords,
      allRecords,
      trash,
      notifications,
      notifyRequests,
      addRecord,
      moveToTrash,
      restoreRecord,
      deleteRecord,
      addNotification,
      updateRecordStatus,
      updateNotifyRequest,
      addNotifyRequest,
    }}>
      {children}
    </RecordContext.Provider>
  );
};

/* ================= HOOK ================= */
export const useRecords = () => {
  const ctx = useContext(RecordContext);
  if (!ctx) throw new Error("useRecords must be used inside RecordProvider");
  return ctx;
};