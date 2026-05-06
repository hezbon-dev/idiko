import React, { createContext, useContext, useState, useEffect } from "react";
import { StorageService } from "../Services/StorageService";

export interface PickupStation {
  id: string;
  name: string;
  location: string;
  phone1: string;
  phone2: string;
  gps: string;

  stationName: string;
  stationNumber: string;
  password: string;
  enabled: boolean;
}

interface PickupStationContextProps {
  stations: PickupStation[];
  setStations: React.Dispatch<React.SetStateAction<PickupStation[]>>;
  currentStation: PickupStation | null;
  setCurrentStation: React.Dispatch<React.SetStateAction<PickupStation | null>>;
  addStation: (station: PickupStation) => void;
  updateStation: (station: PickupStation) => void;
  removeStation: (id: string) => void;
}

const PickupStationContext = createContext<PickupStationContextProps | undefined>(undefined);

export const PickupStationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stations, setStations] = useState<PickupStation[]>([]);
  const [currentStation, setCurrentStation] = useState<PickupStation | null>(null);

  // ✅ NEW — prevents overwriting Firebase on first render
  const [loaded, setLoaded] = useState(false);

  // ✅ Load stations from Firebase on mount
  useEffect(() => {
    const loadStations = async () => {
      const savedStations = await StorageService.get("pickupStations");
      if (savedStations) setStations(savedStations);
      setLoaded(true); // ✅ mark ready
    };
    loadStations();
  }, []);

  // ✅ Save ONLY after loaded
  useEffect(() => {
    if (!loaded) return;
    StorageService.set("pickupStations", stations);
  }, [stations, loaded]);

  const addStation = (station: PickupStation) => {
    setStations((prev) => [...prev, station]);
  };

  const updateStation = (station: PickupStation) => {
    setStations((prev) =>
      prev.map((s) => (s.id === station.id ? station : s))
    );
  };

  const removeStation = (id: string) => {
    setStations((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <PickupStationContext.Provider
      value={{
        stations,
        setStations,
        currentStation,
        setCurrentStation,
        addStation,
        updateStation,
        removeStation,
      }}
    >
      {children}
    </PickupStationContext.Provider>
  );
};

export const usePickupStations = () => {
  const context = useContext(PickupStationContext);
  if (!context) {
    throw new Error("usePickupStations must be used inside PickupStationProvider");
  }
  return context;
};
