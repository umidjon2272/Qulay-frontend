import { Outlet } from "react-router-dom";

import Sidebar from "../../components/Sidebar/Sidebar";
import ThemeToggle from "../../components/ThemeToggle/ThemeToggle";
import AIChatDrawer from "../../features/ai/components/AIChatDrawer/AIChatDrawer";

import "./AppLayout.scss";

const AppLayout = () => {
  return (
    <div className="app-layout">
      <Sidebar />
      <ThemeToggle />

      <main className="app-layout__content">
        <Outlet />
      </main>

      <AIChatDrawer />
    </div>
  );
};

export default AppLayout;
