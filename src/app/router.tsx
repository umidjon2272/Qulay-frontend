import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter } from "react-router-dom";

import AIAssistantShell from "../features/ai/components/AssistantPage/AIAssistantShell";
import { AIAssistantRoute } from "../features/ai/routes/aiRoute";
import AppLayout from "../layouts/AppLayout/AppLayout";
import RequireAuth from "./router/RequireAuth";
import RequireAdmin from "./router/RequireAdmin";
import RootRedirect from "./router/RootRedirect";
import AdminErrorBoundary from "./router/AdminErrorBoundary";

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
const Contacts = lazy(() => import("../pages/Contacts/Contacts"));
const Memory = lazy(() => import("../pages/Memory/Memory"));
const Billing = lazy(() => import("../pages/Billing/Billing"));
const NotFound = lazy(() => import("../pages/NotFound/NotFound"));
const AdminConsole = lazy(() => import("../pages/Admin/AdminConsole"));
const AdminLogin = lazy(() => import("../pages/Admin/AdminLogin"));

const PageFallback = () => (
  <div className="route-loading" role="status" aria-live="polite">
    <span className="route-loading__dot" />
    <span>Yuklanmoqda...</span>
  </div>
);

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
      { path: "/contacts", element: withSuspense(<Contacts />) },
      { path: "/memory", element: withSuspense(<Memory />) },
      { path: "/billing", element: withSuspense(<Billing />) },
      { path: "/settings", element: withSuspense(<Settings />) },
      { path: "/integrations", element: withSuspense(<Integrations />) },
    ],
  },
  { path: "*", element: withSuspense(<NotFound />) },
]);
