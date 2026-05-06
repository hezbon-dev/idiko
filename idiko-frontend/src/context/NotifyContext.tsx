// src/context/NotifyContext.tsx
import type { ReactNode } from "react";
import { createContext, useContext } from "react";
import { useRecords } from "./RecordContext";
import type { NotifyRequestType } from "./RecordContext";

type NotifyContextType = {
  notifyRequests: NotifyRequestType[];
  addNotifyRequest: (req: NotifyRequestType) => void;
  updateNotifyRequest: (id: string, update: Partial<NotifyRequestType>) => void;
};

const NotifyContext = createContext<NotifyContextType | undefined>(undefined);

export const NotifyProvider = ({ children }: { children: ReactNode }) => {
  const { notifyRequests, addNotifyRequest, updateNotifyRequest } = useRecords();

  return (
    <NotifyContext.Provider
      value={{ notifyRequests, addNotifyRequest, updateNotifyRequest }}
    >
      {children}
    </NotifyContext.Provider>
  );
};

export const useNotify = () => {
  const context = useContext(NotifyContext);
  if (!context) throw new Error("useNotify must be inside NotifyProvider");
  return context;
};
