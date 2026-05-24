import React, { type JSX } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type ProtectedRouteProps = {
  children: JSX.Element;
  allowedRoles?: ("admin" | "staff")[];
};

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, loading } = useAuth();
  if (loading) {
  return <div>Loading...</div>;
}

  // ✅ ONLY rely on AuthContext (Firebase-backed)
  const effectiveUser = user;
  const effectiveAuth = effectiveUser === "admin" || effectiveUser === "staff";

  if (!effectiveAuth) {
    if (allowedRoles?.includes("admin")) return <Navigate to="/admin/login" replace />;
    if (allowedRoles?.includes("staff")) return <Navigate to="/staff/login" replace />;
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(effectiveUser!)) {
    return <Navigate to="/" replace />;
  }

  return children;
};
