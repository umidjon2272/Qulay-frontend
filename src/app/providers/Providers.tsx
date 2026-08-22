import { useEffect, useState, type ReactNode } from "react";

import { AIChatProvider } from "../../features/ai/context/AIChatContext";
import { IntegrationProvider } from "../../context/IntegrationContext";
import { ProfileProvider } from "../../context/ProfileContext";
import { AuthProvider } from "../../context/AuthContext";
import { ToastProvider } from "../../components/Toast/ToastContext";
import { getSettings } from "../../services/settingsService";
import { initializeStorageSchema } from "../../services/storage";
import { subscribeToWorkspaceData } from "../../services/workspaceEvents";

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

export const Providers = ({ children }: ProvidersProps) => (
  <ToastProvider>
    <AuthProvider>
      <ThemeSync>
        <ProfileProvider>
          <IntegrationProvider>
            <AIChatProvider>{children}</AIChatProvider>
          </IntegrationProvider>
        </ProfileProvider>
      </ThemeSync>
    </AuthProvider>
  </ToastProvider>
);
