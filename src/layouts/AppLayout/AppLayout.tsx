import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { WifiOff } from "lucide-react";

import Sidebar from "../../components/Sidebar/Sidebar";
import TopBar from "../../components/TopBar/TopBar";
import ProactiveSuggestions from "../../components/ProactiveSuggestions/ProactiveSuggestions";
import AIChatDrawer from "../../features/ai/components/AIChatDrawer/AIChatDrawer";
import { prefetchAIAssistant } from "../../features/ai/routes/aiLoader";
import { useI18n } from "../../i18n/useI18n";

import "./AppLayout.scss";

const AppLayout = () => {
  const { t } = useI18n();
  const location = useLocation();
  const isAIWorkspace = location.pathname === "/ai-assistant";
  const isDashboard = location.pathname === "/dashboard";
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => { window.removeEventListener("online", handleOnline); window.removeEventListener("offline", handleOffline); };
  }, []);

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

  useEffect(() => {
    if (!isAIWorkspace || typeof window === "undefined") return undefined;

    const media = window.matchMedia("(max-width: 700px)");
    const root = document.getElementById("root");
    const html = document.documentElement;
    let layoutViewportHeight = window.innerHeight;
    const previous = {
      bodyOverflow: document.body.style.overflow,
      bodyOverscroll: document.body.style.overscrollBehavior,
      htmlHeight: html.style.height,
      htmlOverflow: html.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
      appVisibleHeight: html.style.getPropertyValue("--app-visible-height"),
      appVisibleTop: html.style.getPropertyValue("--app-visible-top"),
      aiKeyboardOpen: html.classList.contains("ai-keyboard-open"),
      rootHeight: root?.style.height ?? "",
      rootOverflow: root?.style.overflow ?? "",
    };
    let viewportFrame: number | null = null;

    const restore = () => {
      document.body.style.overflow = previous.bodyOverflow;
      document.body.style.overscrollBehavior = previous.bodyOverscroll;
      html.style.height = previous.htmlHeight;
      html.style.overflow = previous.htmlOverflow;
      html.style.overscrollBehavior = previous.htmlOverscroll;
      if (previous.appVisibleHeight) html.style.setProperty("--app-visible-height", previous.appVisibleHeight);
      else html.style.removeProperty("--app-visible-height");
      if (previous.appVisibleTop) html.style.setProperty("--app-visible-top", previous.appVisibleTop);
      else html.style.removeProperty("--app-visible-top");
      html.classList.toggle("ai-keyboard-open", previous.aiKeyboardOpen);
      if (root) {
        root.style.height = previous.rootHeight;
        root.style.overflow = previous.rootOverflow;
      }
    };

    const syncViewport = () => {
      if (!media.matches) return;

      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const viewportTop = window.visualViewport?.offsetTop ?? 0;
      const activeElement = document.activeElement;
      const isTextComposerFocused = activeElement instanceof HTMLTextAreaElement || activeElement instanceof HTMLInputElement;
      const viewportResizedWithoutKeyboard = !isTextComposerFocused && Math.abs(window.innerHeight - layoutViewportHeight) > 80;

      if (viewportResizedWithoutKeyboard) {
        layoutViewportHeight = window.innerHeight;
      }

      const keyboardOpen = Boolean(
        window.visualViewport && isTextComposerFocused && viewportHeight < layoutViewportHeight - 80,
      );

      if (keyboardOpen) {
        html.style.setProperty("--app-visible-height", `${Math.round(viewportHeight)}px`);
        html.style.setProperty("--app-visible-top", `${Math.max(0, Math.round(viewportTop))}px`);
      } else {
        html.style.removeProperty("--app-visible-height");
        html.style.removeProperty("--app-visible-top");
      }

      html.classList.toggle("ai-keyboard-open", keyboardOpen);
    };

    const scheduleViewportSync = () => {
      if (viewportFrame !== null) return;

      viewportFrame = window.requestAnimationFrame(() => {
        viewportFrame = null;
        syncViewport();
      });
    };

    const syncScrollLock = () => {
      restore();
      if (!media.matches) return;

      document.body.style.overflow = "hidden";
      document.body.style.overscrollBehavior = "none";
      html.style.height = "100%";
      html.style.overflow = "hidden";
      html.style.overscrollBehavior = "none";
      if (root) {
        root.style.height = "100%";
        root.style.overflow = "hidden";
      }

      syncViewport();
    };

    syncScrollLock();
    media.addEventListener("change", syncScrollLock);
    window.addEventListener("resize", scheduleViewportSync);
    document.addEventListener("focusin", scheduleViewportSync);
    document.addEventListener("focusout", scheduleViewportSync);
    window.visualViewport?.addEventListener("resize", scheduleViewportSync);
    window.visualViewport?.addEventListener("scroll", scheduleViewportSync);

    return () => {
      media.removeEventListener("change", syncScrollLock);
      window.removeEventListener("resize", scheduleViewportSync);
      document.removeEventListener("focusin", scheduleViewportSync);
      document.removeEventListener("focusout", scheduleViewportSync);
      window.visualViewport?.removeEventListener("resize", scheduleViewportSync);
      window.visualViewport?.removeEventListener("scroll", scheduleViewportSync);
      if (viewportFrame !== null) window.cancelAnimationFrame(viewportFrame);
      restore();
    };
  }, [isAIWorkspace]);

  return (
    <div className={`app-layout ${isAIWorkspace ? "app-layout--ai" : ""} ${isDashboard ? "app-layout--dashboard" : ""}`}>
      <Sidebar />

      <main className={`app-layout__content ${isAIWorkspace ? "app-layout__content--ai" : ""}`}>
        {!isAIWorkspace && <TopBar />}
        <Outlet />
      </main>

      {!online && <div className="app-offline-banner" role="status"><WifiOff size={15} /><span>{t("app.offline", "Internet uzildi. O'zgarishlar ulanish tiklangach yangilanadi.")}</span></div>}
      {!isAIWorkspace && <ProactiveSuggestions />}
      <AIChatDrawer />
    </div>
  );
};

export default AppLayout;
