import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

import axios from "axios";

// =========================
// ✅ AUTH TYPES
// =========================

type AuthType = "admin" | "staff" | null;

type AuthContextType = {
  user: AuthType;
  login: (role: AuthType) => void;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
};

// =========================
// ✅ CONTEXT CREATION
// =========================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// =========================
// ✅ AUTH PROVIDER
// =========================

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {

  // =========================
  // ✅ STATE
  // =========================

  const [user, setUser] = useState<AuthType>(null);

  const [loading, setLoading] = useState(true);

  // =========================
  // ✅ TOKEN VERIFICATION
  // =========================

  useEffect(() => {

    const verifyToken = async () => {

      try {

        const token = localStorage.getItem("idiko_admin_token");

        // =========================
        // ❌ NO TOKEN FOUND
        // =========================

        if (!token) {

          setUser(null);

          setLoading(false);

          return;
        }

        // =========================
        // ✅ VERIFY TOKEN WITH BACKEND
        // =========================

        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/admin/verify`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        // =========================
        // ✅ TOKEN VERIFIED
        // =========================

        if (res.data.success) {

          setUser(res.data.admin.role);

          setLoading(false);

        } else {

          // =========================
          // ❌ INVALID TOKEN
          // =========================

          localStorage.removeItem("idiko_admin_token");
          localStorage.removeItem("idiko_admin_role");

          setUser(null);

          setLoading(false);
        }

      } catch (err) {

        // =========================
        // ❌ TOKEN VERIFICATION FAILED
        // =========================

        console.log("❌ Token verification failed");

        localStorage.removeItem("idiko_admin_token");
        localStorage.removeItem("idiko_admin_role");

        setUser(null);

        setLoading(false);
      }
    };

    verifyToken();

  }, []);

  // =========================
  // ✅ LOGIN
  // =========================

  const login = (role: AuthType) => {

    setUser(role);
  };

  // =========================
  // ✅ LOGOUT
  // =========================

  const logout = () => {

    localStorage.removeItem("idiko_admin_token");
    localStorage.removeItem("idiko_admin_role");

    setUser(null);
  };

  // =========================
  // ✅ AUTH STATUS
  // =========================

  const isAuthenticated =
    user === "admin" || user === "staff";

  // =========================
  // ✅ PROVIDER
  // =========================

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// =========================
// ✅ CUSTOM HOOK
// =========================

export const useAuth = () => {

  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return ctx;
};