import { Navigate } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import { getSettings } from "../../services/settingsService";

const getDefaultPath = () => {
  const page = getSettings().defaultPage;

  if (page === "AI yordamchi") return "/ai-assistant";
  if (page === "Vazifalar") return "/tasks";
  return "/dashboard";
};

const RootRedirect = () => {
  const { user, status } = useAuth();
  if (status === "loading") return <div className="app-auth-loading" role="status">Sessiya tekshirilmoqda...</div>;
  return <Navigate to={user ? getDefaultPath() : "/register"} replace />;
};

export default RootRedirect;
