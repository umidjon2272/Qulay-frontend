import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

import AIAssistantShell from "../features/ai/components/AssistantPage/AIAssistantShell";
import { AIAssistantRoute } from "../features/ai/routes/aiRoute";
import AppLayout from "../layouts/AppLayout/AppLayout";
import RequireAuth from "./router/RequireAuth";
import RequireAdmin from "./router/RequireAdmin";
import RootRedirect from "./router/RootRedirect";
import AdminErrorBoundary from "./router/AdminErrorBoundary";
import { useI18n } from "../i18n/useI18n";

const Register = lazy(() => import("../pages/Register/Register"));
const Login = lazy(() => import("../pages/Login/Login"));
const ForgotPassword = lazy(() => import("../pages/ForgotPassword/ForgotPassword"));
const ResetPassword = lazy(() => import("../pages/ResetPassword/ResetPassword"));
const Dashboard = lazy(() => import("../pages/Dashboard/Dashboard"));
const Calendar = lazy(() => import("../pages/Calendar/Calendar"));
const Tasks = lazy(() => import("../pages/Tasks/Tasks"));
const Reminders = lazy(() => import("../pages/Reminders/Reminders"));
const Files = lazy(() => import("../pages/Files/Files"));
const Settings = lazy(() => import("../pages/Settings/Settings"));
const Integrations = lazy(() => import("../pages/Integrations/Integrations"));
const Finance = lazy(() => import("../pages/Finance/Finance"));
const Billing = lazy(() => import("../pages/Billing/Billing"));
const NotFound = lazy(() => import("../pages/NotFound/NotFound"));
const AdminConsole = lazy(() => import("../pages/Admin/AdminConsole"));
const AdminLogin = lazy(() => import("../pages/Admin/AdminLogin"));
const Legal = lazy(() => import("../pages/Legal/Legal"));



if (typeof window !== "undefined") {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  const canPrefetch = !connection?.saveData && !["slow-2g", "2g"].includes(connection?.effectiveType ?? "");
  const preloadCoreRoutes = () => {
    if (!canPrefetch) return;
    void Promise.allSettled([
      import("../pages/Dashboard/Dashboard"),
      import("../pages/Tasks/Tasks"),
      import("../pages/Reminders/Reminders"),
      import("../pages/Calendar/Calendar"),
      import("../pages/Files/Files"),
      import("../pages/Finance/Finance"),
      import("../pages/Settings/Settings"),
    ]);
  };
  const schedulePrefetch = () => {
    const idleWindow = window as Window & { requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number };
    if (typeof idleWindow.requestIdleCallback === "function") idleWindow.requestIdleCallback(preloadCoreRoutes, { timeout: 4500 });
    else window.setTimeout(preloadCoreRoutes, 2500);
  };
  if (document.readyState === "complete") schedulePrefetch();
  else window.addEventListener("load", schedulePrefetch, { once: true });
}

const PageFallback = () => {
  const { t } = useI18n();
  return (
  <div className="route-loading" role="status" aria-live="polite">
    <span className="route-loading__dot" />
    <span>{t("common.loading", "Yuklanmoqda...")}</span>
  </div>
  );
};

const withSuspense = (node: ReactNode) => <Suspense fallback={<PageFallback />}>{node}</Suspense>;

export const router = createBrowserRouter([
  {
    element: (
      <RequireAdmin>
        {withSuspense(<AdminConsole />)}
      </RequireAdmin>
    ),
    errorElement: <AdminErrorBoundary />,
    children: [
      { path: "/admin", element: null },
      { path: "/admin/*", element: null },
    ],
  },
  { path: "/admin/login", element: withSuspense(<AdminLogin />) },
  { path: "/", element: <RootRedirect /> },
  { path: "/register", element: withSuspense(<Register />) },
  { path: "/login", element: withSuspense(<Login />) },
  { path: "/forgot-password", element: withSuspense(<ForgotPassword />) },
  { path: "/reset-password", element: withSuspense(<ResetPassword />) },
  { path: "/privacy", element: withSuspense(<Legal kind="privacy" />) },
  { path: "/terms", element: withSuspense(<Legal kind="terms" />) },
  {
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { path: "/dashboard", element: withSuspense(<Dashboard />) },
      {
        path: "/ai-assistant",
        element: (
          <Suspense fallback={<AIAssistantShell />}>
            <AIAssistantRoute />
          </Suspense>
        ),
      },
      { path: "/calendar", element: withSuspense(<Calendar />) },
      { path: "/tasks", element: withSuspense(<Tasks />) },
      { path: "/reminders", element: withSuspense(<Reminders />) },
      { path: "/files", element: withSuspense(<Files />) },
      { path: "/finance", element: withSuspense(<Finance />) },
      { path: "/approvals", element: <Navigate to="/ai-assistant" replace /> },
      { path: "/contacts", element: <Navigate to="/dashboard" replace /> },
      { path: "/memory", element: <Navigate to="/settings?tab=ai" replace /> },
      { path: "/billing", element: withSuspense(<Billing />) },
      { path: "/settings", element: withSuspense(<Settings />) },
      { path: "/integrations", element: withSuspense(<Integrations />) },
    ],
  },
  { path: "*", element: withSuspense(<NotFound />) },
]);
