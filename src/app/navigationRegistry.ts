import type { ComponentType } from "react";
import { Bell, CalendarDays, CheckSquare, CreditCard, FolderOpen, LayoutDashboard, Link2, ListTodo, NotebookPen, Settings, Sparkles, WalletCards } from "lucide-react";

export type NavigationPlacement = "desktop" | "mobilePrimary" | "mobileMore";
export type NavigationModule = {
  id: string; path: string; label: string; translationKey: string;
  icon: ComponentType<{ size?: number }>;
  desktop: boolean; mobilePrimary: boolean; mobileMore: boolean;
  permission?: string; featureFlag?: string; order: number;
  badgeSource?: "notifications";
};

export const navigationRegistry: NavigationModule[] = [
  { id: "dashboard", path: "/dashboard", label: "Bosh sahifa", translationKey: "nav.home", icon: LayoutDashboard, desktop: true, mobilePrimary: true, mobileMore: false, order: 10 },
  { id: "tasks", path: "/tasks", label: "Vazifalar", translationKey: "nav.tasks", icon: CheckSquare, desktop: true, mobilePrimary: true, mobileMore: false, order: 20 },
  { id: "ai", path: "/ai-assistant", label: "AI yordamchi", translationKey: "nav.ai", icon: Sparkles, desktop: true, mobilePrimary: true, mobileMore: false, order: 30 },
  { id: "calendar", path: "/calendar", label: "Kalendar", translationKey: "nav.calendar", icon: CalendarDays, desktop: true, mobilePrimary: true, mobileMore: false, order: 40 },
  { id: "finance", path: "/finance", label: "Moliya", translationKey: "nav.finance", icon: WalletCards, desktop: true, mobilePrimary: false, mobileMore: true, permission: "finance.read", featureFlag: "finance", order: 50 },
  { id: "reminders", path: "/reminders", label: "Eslatmalar", translationKey: "nav.reminders", icon: Bell, desktop: true, mobilePrimary: false, mobileMore: true, order: 60, badgeSource: "notifications" },
  { id: "notes", path: "/files?view=notes", label: "Qaydlar", translationKey: "nav.notes", icon: NotebookPen, desktop: false, mobilePrimary: false, mobileMore: true, order: 70 },
  { id: "files", path: "/files", label: "Fayllar", translationKey: "nav.files", icon: FolderOpen, desktop: true, mobilePrimary: false, mobileMore: true, order: 80 },
  { id: "integrations", path: "/integrations", label: "Integratsiyalar", translationKey: "nav.integrations", icon: Link2, desktop: false, mobilePrimary: false, mobileMore: true, order: 90 },
  { id: "notifications", path: "/settings?tab=notifications", label: "Bildirishnomalar", translationKey: "nav.notifications", icon: Bell, desktop: false, mobilePrimary: false, mobileMore: true, order: 100, badgeSource: "notifications" },
  { id: "billing", path: "/billing", label: "Tarif va limitlar", translationKey: "nav.billing", icon: CreditCard, desktop: true, mobilePrimary: false, mobileMore: true, order: 110 },
  { id: "settings", path: "/settings", label: "Sozlamalar", translationKey: "nav.settings", icon: Settings, desktop: true, mobilePrimary: false, mobileMore: true, order: 120 },
  { id: "more", path: "#more", label: "Ko'proq", translationKey: "nav.more", icon: ListTodo, desktop: false, mobilePrimary: true, mobileMore: false, order: 50 },
];

export type NavigationAccess = { permissions?: ReadonlySet<string>; features?: ReadonlySet<string> };
export const getNavigation = (placement: NavigationPlacement, access: NavigationAccess = {}) =>
  navigationRegistry
    .filter((item) => item[placement])
    .filter((item) => !item.permission || !access.permissions || access.permissions.has(item.permission))
    .filter((item) => !item.featureFlag || !access.features || access.features.has(item.featureFlag))
    .sort((a, b) => a.order - b.order);

export const isNavigationPathActive = (current: string, target: string) => current === target.split("?")[0];
