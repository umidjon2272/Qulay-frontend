import { useEffect, useState, type ReactNode } from "react";

import { AIChatProvider } from "../../features/ai/context/AIChatContext";
import { IntegrationProvider } from "../../context/IntegrationContext";
import { ProfileProvider } from "../../context/ProfileContext";
import { AuthProvider } from "../../context/AuthContext";
import { PlatformProvider } from "../../context/PlatformContext";
import { ToastProvider } from "../../components/Toast/ToastContext";
import { getSettings } from "../../services/settingsService";
import { initializeStorageSchema } from "../../services/storage";
import { subscribeToWorkspaceData } from "../../services/workspaceEvents";
import { NotificationSound } from '../../components/NotificationSound/NotificationSound';
import AiSettingsSync from '../../components/AiSettingsSync';

type ProvidersProps = {
  children: ReactNode;
};

const ThemeSync = ({ children }: ProvidersProps) => {
  const [theme, setTheme] = useState(getSettings().theme);

  useEffect(() => {
    initializeStorageSchema();
  }, []);

  useEffect(() => subscribeToWorkspaceData("settings", () => setTheme(getSettings().theme)), []);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const activeTheme = theme === "system" ? (media.matches ? "dark" : "light") : theme;
      root.dataset.theme = activeTheme;
      document.querySelector('meta[name="theme-color"]')?.setAttribute(
        "content",
        activeTheme === "dark" ? "#0b1020" : "#f6f6f9",
      );
    };

    apply();
    if (theme !== "system") return undefined;

    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  return <>{children}</>;
};

export const Providers = ({ children }: ProvidersProps) => {
  const adminRoute = typeof window !== "undefined" && window.location.pathname.startsWith("/admin");

  // Admin pages do not need the end-user chat, integration, profile or
  // notification pollers. Mounting them globally caused a burst of unrelated
  // /conversations, Telegram/Bito/Google/WhatsApp and notification requests on
  // every admin page and could exhaust the backend IP limiter.
  if (adminRoute) {
    return (
      <PlatformProvider>
        <ToastProvider>
          <AuthProvider>
            <ThemeSync>{children}</ThemeSync>
          </AuthProvider>
        </ToastProvider>
      </PlatformProvider>
    );
  }

  return (
    <PlatformProvider>
      <ToastProvider>
        <AuthProvider>
          <AiSettingsSync />
          <NotificationSound />
          <ThemeSync>
            <ProfileProvider>
              <IntegrationProvider>
                <AIChatProvider>{children}</AIChatProvider>
              </IntegrationProvider>
            </ProfileProvider>
          </ThemeSync>
        </AuthProvider>
      </ToastProvider>
    </PlatformProvider>
  );
};
