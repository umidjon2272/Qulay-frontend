import { Navigate } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import { getSettings } from "../../services/settingsService";
import { AuthBootstrapShell, AuthRecoveryShell } from "./AuthShell";

const getDefaultPath = () => {
  const page = getSettings().defaultPage;

  if (page === "AI yordamchi") return "/ai-assistant";
  if (page === "Vazifalar") return "/tasks";
  return "/dashboard";
};

const RootRedirect = () => {
  const { user, status, authError } = useAuth();
  if (status === "loading" && !user) return <AuthBootstrapShell />;
  if (!user && authError) return <AuthRecoveryShell />;
  return <Navigate to={user ? getDefaultPath() : "/register"} replace />;
};

export default RootRedirect;
