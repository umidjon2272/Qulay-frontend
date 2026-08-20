import { Navigate } from "react-router-dom";

import { getAuthSession } from "../../services/authService";
import { getSettings } from "../../services/settingsService";

const getDefaultPath = () => {
  const page = getSettings().defaultPage;

  if (page === "AI yordamchi") return "/ai-assistant";
  if (page === "Vazifalar") return "/tasks";
  return "/dashboard";
};

const RootRedirect = () => (
  <Navigate to={getAuthSession() ? getDefaultPath() : "/register"} replace />
);

export default RootRedirect;
