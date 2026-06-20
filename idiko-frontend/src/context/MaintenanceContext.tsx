import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

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

  const API_URL =
    import.meta.env.VITE_API_URL ||
    "https://idiko.onrender.com";

  useEffect(() => {

    const loadMaintenance =
      async () => {

        try {

          const response =
            await fetch(
              `${API_URL}/admin/maintenance-status`
            );

          const data =
            await response.json();

          if (
            data.success
          ) {

            setMaintenanceMode(
              data.maintenanceMode === true
            );

          }

        } catch (err) {

          console.error(
            "Failed to load maintenance mode",
            err
          );

        } finally {

          setLoading(false);

        }

      };

    loadMaintenance();

  }, [API_URL]);

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