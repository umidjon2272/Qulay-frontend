import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";

import Sidebar from "../../components/Sidebar/Sidebar";
import TopBar from "../../components/TopBar/TopBar";
import AIChatDrawer from "../../features/ai/components/AIChatDrawer/AIChatDrawer";
import { prefetchAIAssistant } from "../../features/ai/routes/aiLoader";

import "./AppLayout.scss";

const AppLayout = () => {
  const location = useLocation();
  const isAIWorkspace = location.pathname === "/ai-assistant";

  useEffect(() => {
    if (location.pathname !== "/dashboard") return undefined;

    const idleWindow = window as unknown as {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const idleCallback = idleWindow.requestIdleCallback
      ? idleWindow.requestIdleCallback(prefetchAIAssistant, { timeout: 1200 })
      : window.setTimeout(prefetchAIAssistant, 350);

    return () => {
      if (idleWindow.cancelIdleCallback && idleWindow.requestIdleCallback) {
        idleWindow.cancelIdleCallback(idleCallback);
      } else {
        window.clearTimeout(idleCallback);
      }
    };
  }, [location.pathname]);

  return (
    <div className={`app-layout ${isAIWorkspace ? "app-layout--ai" : ""}`}>
      <Sidebar />

      <main className={`app-layout__content ${isAIWorkspace ? "app-layout__content--ai" : ""}`}>
        {!isAIWorkspace && <TopBar />}
        <Outlet />
      </main>

      <AIChatDrawer />
    </div>
  );
};

export default AppLayout;
