import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { getSettings, updateSettings } from "../../services/settingsService";
import { subscribeToWorkspaceData } from "../../services/workspaceEvents";

import "./ThemeToggle.scss";

type ThemeToggleProps = {
  variant?: "floating" | "menu";
};

const getActiveTheme = () => {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
};

const ThemeToggle = ({ variant = "floating" }: ThemeToggleProps) => {
  const [theme, setTheme] = useState(getSettings().theme);
  const [activeTheme, setActiveTheme] = useState(getActiveTheme);

  useEffect(
    () =>
      subscribeToWorkspaceData("settings", () => {
        setTheme(getSettings().theme);
        setActiveTheme(getActiveTheme());
      }),
    [],
  );

  useEffect(() => {
    if (theme !== "system") {
      setActiveTheme(theme);
      return undefined;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setActiveTheme(media.matches ? "dark" : "light");
    sync();
    media.addEventListener("change", sync);

    return () => media.removeEventListener("change", sync);
  }, [theme]);

  const nextTheme = activeTheme === "dark" ? "light" : "dark";
  const label = nextTheme === "dark" ? "Qorong'i rejimga o'tish" : "Yorug' rejimga o'tish";
  const Icon = activeTheme === "dark" ? Sun : Moon;

  return (
    <button
      type="button"
      className={`theme-toggle theme-toggle--${variant}`}
      onClick={() => updateSettings({ theme: nextTheme })}
      aria-label={label}
      aria-pressed={activeTheme === "dark"}
      title={label}
    >
      <Icon size={variant === "menu" ? 17 : 16} />
      {variant === "menu" && <span>{activeTheme === "dark" ? "Yorug' rejim" : "Qorong'i rejim"}</span>}
    </button>
  );
};

export default ThemeToggle;
