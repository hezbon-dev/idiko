import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

import axios from "axios";
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

 useEffect(() => {

  const verifyToken = async () => {

    try {

      const token = localStorage.getItem("idiko_admin_token");

      if (!token) {
        setUser(null);
        return;
      }

      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/admin/verify`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.data.success) {

        setUser(res.data.admin.role);

      } else {

        localStorage.removeItem("idiko_admin_token");
        localStorage.removeItem("idiko_admin_role");

        setUser(null);
      }

    } catch (err) {

      console.log("❌ Token verification failed");

      localStorage.removeItem("idiko_admin_token");
      localStorage.removeItem("idiko_admin_role");

      setUser(null);
    }
  };

  verifyToken();

}, []);


  // ✅ simply set role (no validation here)
  const login = (role: AuthType) => {

  setUser(role);
};

 const logout = () => {

  localStorage.removeItem("idiko_admin_token");
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