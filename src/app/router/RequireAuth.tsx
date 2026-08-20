import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { getAuthSession } from "../../services/authService";

type RequireAuthProps = {
  children: ReactNode;
};

const RequireAuth = ({ children }: RequireAuthProps) => {
  const location = useLocation();

  if (!getAuthSession()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};

export default RequireAuth;
