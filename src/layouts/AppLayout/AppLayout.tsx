import { Outlet, useLocation } from "react-router-dom";

import Sidebar from "../../components/Sidebar/Sidebar";
import ThemeToggle from "../../components/ThemeToggle/ThemeToggle";
import AIChatDrawer from "../../features/ai/components/AIChatDrawer/AIChatDrawer";

import "./AppLayout.scss";

const AppLayout = () => {
  const location = useLocation();
  const isAIWorkspace = location.pathname === "/ai-assistant";

  return (
    <div className={`app-layout ${isAIWorkspace ? "app-layout--ai" : ""}`}>
      <Sidebar />
      <ThemeToggle />

      <main className={`app-layout__content ${isAIWorkspace ? "app-layout__content--ai" : ""}`}>
        <Outlet />
      </main>

      <AIChatDrawer />
    </div>
  );
};

export default AppLayout;
