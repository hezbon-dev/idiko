import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  doc,
  onSnapshot,
} from "firebase/firestore";

import { db } from "../firebase";

type MaintenanceContextType = {
  maintenanceMode: boolean;
  loading: boolean;
};

const MaintenanceContext =
  createContext<
    MaintenanceContextType | undefined
  >(undefined);

export const MaintenanceProvider = ({
  children,
}: {
  children: ReactNode;
}) => {

  const [
    maintenanceMode,
    setMaintenanceMode,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  useEffect(() => {

    const unsubscribe =
      onSnapshot(
        doc(
          db,
          "system",
          "settings"
        ),
        (snapshot) => {

          if (
            snapshot.exists()
          ) {

            setMaintenanceMode(
              snapshot.data()
                .maintenanceMode === true
            );
          }

          setLoading(false);
        }
      );

    return () =>
      unsubscribe();

  }, []);

  return (
    <MaintenanceContext.Provider
      value={{
        maintenanceMode,
        loading,
      }}
    >
      {children}
    </MaintenanceContext.Provider>
  );
};

export const useMaintenance = () => {

  const context =
    useContext(
      MaintenanceContext
    );

  if (!context) {

    throw new Error(
      "useMaintenance must be used inside MaintenanceProvider"
    );
  }

  return context;
};