import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

import { AUTH_SESSION_CHANGED, getAuthSession } from "../../services/authService";

type RequireAuthProps = {
  children: ReactNode;
};

const RequireAuth = ({ children }: RequireAuthProps) => {
  const location = useLocation();
  const [session, setSession] = useState(getAuthSession);

  useEffect(() => {
    const sync = () => setSession(getAuthSession());
    window.addEventListener(AUTH_SESSION_CHANGED, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGED, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!session) {
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
