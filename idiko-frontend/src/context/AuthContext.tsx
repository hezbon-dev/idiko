import React, { createContext, useContext, useState, type ReactNode } from "react";
type AuthType = "admin" | "staff" | null;

type AuthContextType = {
  user: AuthType;
  login: (role: AuthType) => void;
  logout: () => void;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {

 const [user, setUser] = useState<AuthType>(() => {
  const savedUser = localStorage.getItem("idiko_admin_role");

  if (savedUser === "admin" || savedUser === "staff") {
    return savedUser as AuthType;
  }

  return null;
});


  // ✅ simply set role (no validation here)
  const login = (role: AuthType) => {

  if (role) {
    localStorage.setItem("idiko_admin_role", role);
  }

  setUser(role);
};

 const logout = () => {

  localStorage.removeItem("idiko_admin_role");

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