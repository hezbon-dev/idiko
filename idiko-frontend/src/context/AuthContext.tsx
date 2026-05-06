import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

type AuthType = "admin" | "staff" | null;

type AuthContextType = {
  user: AuthType;
  login: (role: AuthType) => void;
  logout: () => void;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthType>(null);

  // ✅ Firebase Auth listener (PRODUCTION SAFE ADDITION)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        return;
      }

      try {
        const docRef = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          const role = snap.data().role as AuthType;
          setUser(role);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // ✅ simply set role (no validation here)
  const login = (role: AuthType) => {
    setUser(role);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const isAuthenticated = user === "admin" || user === "staff";

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};