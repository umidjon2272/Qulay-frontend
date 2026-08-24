import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { AuthBootstrapShell, AuthRecoveryShell } from "./AuthShell";

type RequireAuthProps = {
  children: ReactNode;
};

const RequireAuth = ({ children }: RequireAuthProps) => {
  const location = useLocation();
  const { user, status, authError } = useAuth();

  if (status === "loading" && !user) return <AuthBootstrapShell />;
  if (status === "unauthenticated" && !user && authError) return <AuthRecoveryShell />;

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
      />
    );
  }

  return <>{children}</>;
};

export default RequireAuth;
