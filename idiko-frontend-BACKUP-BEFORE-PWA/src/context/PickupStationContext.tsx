// src/context/PickupStatioContext.tsx

import React, { createContext, useContext, useState, useEffect } from "react";

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
  passwordHash?: string;
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
  const API_URL =import.meta.env.VITE_API_URL ||"https://idiko.onrender.com";

  useEffect(() => {

  const savedStaff =
    localStorage.getItem(
      "currentStaff"
    );

  if (savedStaff) {

    setCurrentStation(
      JSON.parse(savedStaff)
    );

  }

}, []);

  // ✅ NEW — prevents overwriting Firebase on first render
useEffect(() => {

  const loadStations = async () => {

    try {

      const adminToken =
  localStorage.getItem(
    "idiko_admin_token"
  );

const staffToken =
  localStorage.getItem(
    "staffToken"
  );

let response;

if (adminToken) {

  response =
    await fetch(
      `${API_URL}/admin/pickup-stations`,
      {
        headers: {
          Authorization:
            `Bearer ${adminToken}`,
        },
      }
    );

}

else if (staffToken) {

  response =
    await fetch(
      `${API_URL}/staff/pickup-stations`,
      {
        headers: {
          Authorization:
            `Bearer ${staffToken}`,
        },
      }
    );

}

else {

  return;

}

      const data =
        await response.json();

      if (data.success) {

        setStations(
          data.stations || []
        );

      }

    } catch (err) {

      console.error(
        "Failed to load stations",
        err
      );

    }

  };

  loadStations();

}, [API_URL]);

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
