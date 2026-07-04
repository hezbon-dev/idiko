// src/context/RecordContext.tsx

import React, { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { StorageService } from "../Services/StorageService";
import { RecordService } from "../Services/RecordService";

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
  notifyRequests: NotifyRequestType[];
  reloadRecords: () => Promise<void>;
  addRecord: (record: RecordType) => void;
  moveToTrash: (record: RecordType) => void;
  restoreRecord: (record: RecordType) => void;
  deleteRecord: (idNumber: string) => void;
  updateRecordStatus: (
    idNumber: string,
    status: "Paid" | "Pending"
  ) => Promise<void>;
  addNotifyRequest: (req: NotifyRequestType) => Promise<boolean>;

  updateNotifyRequest: (
    id: string,
    data: Partial<NotifyRequestType>
  ) => Promise<void>;
};

/* ================= CONTEXT ================= */
const RecordContext = createContext<RecordContextType | undefined>(undefined);

/* ================= PROVIDER ================= */
export const RecordProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [stationKey, setStationKey] = useState<string | null>(null);

  const [records, setRecords] = useState<RecordType[]>([]);
  const [allHistoryRecords, setAllHistoryRecords] = useState<RecordType[]>([]);
  const [trash, setTrash] = useState<RecordType[]>([]);
  const [notifyRequests, setNotifyRequests] = useState<NotifyRequestType[]>([]);



const trashIds = useMemo(() => {
  return new Set(
    trash.map(t => t.idNumber)
  );
}, [trash]);

const allRecords = useMemo(() => {
  return records.filter(
    r => !trashIds.has(r.idNumber)
  );
}, [records, trashIds]);

const recordsForStaff = useMemo(() => {

  if (!stationKey) {

    return allRecords;

  }

  return allRecords.filter(
    r =>
      r.pickupStation
        ?.trim()
        .toLowerCase() === stationKey
  );

}, [allRecords, stationKey]);

useEffect(() => {
  const loadStation = async () => {
    if (user !== "staff") {
      setStationKey(null);
      return;
    }

    const currentStaff =
      await StorageService.get("currentStaff");

    if (currentStaff?.stationName) {
      setStationKey(
        currentStaff.stationName
          .trim()
          .toLowerCase()
      );
    } else {
      setStationKey(null);
    }
  };

  loadStation();
}, [user]);

const refreshRecords = async () => {

  try {

    let loadedRecords = [];

    if (user === "admin") {

      loadedRecords =
        await RecordService.getRecords();

    }

    else if (user === "staff") {

      loadedRecords =
        await RecordService.getStaffRecords();

    }

    else {

      return;

    }

    setRecords(loadedRecords || []);

  }

  catch (err) {

    console.error(
      "Failed to load records",
      err
    );

  }

};

const loadTrash = async () => {

  try {

    const loadedTrash =
      user === "admin"
        ? await RecordService.getTrashRecords()
        : await RecordService.getStaffTrashRecords();

    setTrash(loadedTrash || []);

  } catch (err) {

    console.error(
      "Failed to load trash",
      err
    );

  }

};

  /* ================= FIRESTORE LISTENERS ================= */
  useEffect(() => {

  // ==========================
  // Don't load anything until
  // a user is authenticated.
  // ==========================

  if (!user) {

    return;

  }

  refreshRecords();

  loadTrash();

  const loadHistory = async () => {

    if (user !== "admin") {

      return;

    }

    try {

      const history =
        await RecordService.getHistoryRecords();

      setAllHistoryRecords(history);

    } catch (err) {

      console.error(
        "Failed to load history",
        err
      );

    }

  };

  loadHistory();

  const loadNotifyRequests = async () => {

    if (user !== "admin") {

      return;

    }

    try {

      const requests =
        await RecordService.getNotifyRequests();

      setNotifyRequests(requests);

    } catch (err) {

      console.error(
        "Failed to load notify requests",
        err
      );

    }

  };

  loadNotifyRequests();


}, [user, stationKey]);

  /* ================= HELPERS ================= */
  const normalizeText = (s?: string) => (s || "").trim().toLowerCase();

  const normalizeId = (s?: string) => (s || "").replace(/\s+/g, "");

  const normalizePhone = (phone?: string) => {
    if (!phone) return "";

    // Remove spaces and non-digits except +
    let cleaned = phone
      .replace(/\s+/g, "")
      .replace(/[^\d+]/g, "");

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

    const parts = dob.includes("/")
      ? dob.split("/")
      : dob.split("-");

    if (parts.length !== 3) return dob;

    const [dd, mm, yyyy] = parts;

    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  };

  /* ================= FUNCTIONS ================= */

  const addRecord = async (record: RecordType) => {
    const normalizedRecord = {
      ...record,
      fullName: normalizeText(record.fullName),
      idNumber: normalizeId(record.idNumber),
      dob: normalizeDOB(record.dob),
      sex: normalizeText(record.sex),
      district: normalizeText(record.district),
      uploadDate: record.uploadDate || new Date().toISOString(),
      pickupStation:
  (stationKey || record.pickupStation || "")
    .trim()
    .toLowerCase()
    };

   await RecordService.createRecord(
  normalizedRecord

);

  await refreshRecords();

  };

const moveToTrash = async (
  record: RecordType
) => {

  await RecordService.moveToTrash(
    record,
    user as "admin" | "staff"
  );

  setRecords(prev =>
    prev.filter(
      r =>
        r.idNumber !==
        record.idNumber
    )
  );

  setNotifyRequests(prev =>
    prev.filter(
      r =>
        normalizeId(r.idNumber) !==
        normalizeId(record.idNumber)
    )
  );

  await refreshRecords();

  await loadTrash();

};

const restoreRecord = async (
  record: RecordType
) => {

  await RecordService.restoreRecord(
    record,
    user as "admin" | "staff"
  );

  await refreshRecords();

  await loadTrash();

};

const deleteRecord = async (
  idNumber: string
) => {

  await RecordService.deleteRecord(
    idNumber
  );

  await refreshRecords();

  await loadTrash();

};

const updateRecordStatus = async (
  idNumber: string,
  status: "Paid" | "Pending"
) => {

  await RecordService.updateRecordStatus(
    idNumber,
    status
  );

  await refreshRecords();

};

const updateNotifyRequest = async (
  id: string,
  data: Partial<NotifyRequestType>
) => {

  await RecordService.updateNotifyRequest(
    id,
    data
  );

  if (user === "admin") {

    const requests =
      await RecordService.getNotifyRequests();

    setNotifyRequests(requests);

  }

};

  const addNotifyRequest = async (req: NotifyRequestType) => {
    const normalizedReq = {
      ...req,
      createdAt: new Date().toISOString(),
      fullName: normalizeText(req.fullName),
      idNumber: normalizeId(req.idNumber),
      dob: normalizeDOB(req.dob),
      sex: normalizeText(req.sex),
      district: normalizeText(req.district),
      primaryPhone: normalizePhone(req.primaryPhone),
      secondaryPhone: normalizePhone(req.secondaryPhone),
    };

    const existing = notifyRequests.find(
      r => normalizeId(r.idNumber) === normalizedReq.idNumber
    );

    if (existing) {
      return false;
    }

  await RecordService.addNotifyRequest(
  normalizedReq
);

    return true;
  };

  /* ================= RETURN PROVIDER ================= */

  return (
    <RecordContext.Provider
      value={{
        records,
        recordsForStaff,
        allHistoryRecords,
        allRecords,
        trash,
        notifyRequests,
        reloadRecords: refreshRecords,
        addRecord,
        moveToTrash,
        restoreRecord,
        deleteRecord,
        updateRecordStatus,
        addNotifyRequest,
        updateNotifyRequest,
      }}
    >
      {children}
    </RecordContext.Provider>
  );
};

/* ================= HOOK ================= */

export const useRecords = () => {
  const ctx = useContext(RecordContext);

  if (!ctx) {
    throw new Error("useRecords must be used inside RecordProvider");
  }

  return ctx;
};