// import React only for types
import type { ReactNode } from "react";
import { createContext, useState, useContext } from "react";

export type IDRecord = {
  fullName: string;
  idNumber: string;
  dob: string;
  sex: string;
  district: string;
  status: string; // "Paid" or "Pending"
};

type IDContextType = {
  ids: IDRecord[];
  trashRecords: IDRecord[];
  addID: (record: IDRecord) => void;
  moveToTrash: (idNumber: string) => void;
};

const IDContext = createContext<IDContextType | undefined>(undefined);

export const IDProvider = ({ children }: { children: ReactNode }) => {
  const [ids, setIds] = useState<IDRecord[]>([]);
  const [trashRecords, setTrashRecords] = useState<IDRecord[]>([]);

  const addID = (record: IDRecord) => setIds((prev) => [...prev, record]);
  const moveToTrash = (idNumber: string) => {
    setIds((prev) => {
      const record = prev.find((r) => r.idNumber === idNumber);
      if (record) {
        setTrashRecords((t) => [...t, record]);
      }
      return prev.filter((r) => r.idNumber !== idNumber);
    });
  };

  return (
    <IDContext.Provider value={{ ids, trashRecords, addID, moveToTrash }}>
      {children}
    </IDContext.Provider>
  );
};

export const useIDContext = () => {
  const context = useContext(IDContext);
  if (!context) throw new Error("useIDContext must be used within IDProvider");
  return context;
};
