import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import { AuthBootstrapShell } from "./AuthShell";

type RequireAdminProps = {
  children: ReactNode;
};

const RequireAdmin = ({ children }: RequireAdminProps) => {
  const location = useLocation();
  const { user, status } = useAuth();

  if (status === "loading" && !user) return <AuthBootstrapShell />;

  if (!user) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
      />
    );
  }

  if (user.role !== "ADMIN") {
    return <Navigate to="/admin/login" replace state={{ accessDenied: true }} />;
  }

  return <>{children}</>;
};

export default RequireAdmin;
