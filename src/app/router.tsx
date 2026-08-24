import { Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";

import Register from "../pages/Register/Register";
import Login from "../pages/Login/Login";
import ForgotPassword from "../pages/ForgotPassword/ForgotPassword";
import Dashboard from "../pages/Dashboard/Dashboard";

import AIAssistantShell from "../features/ai/components/AssistantPage/AIAssistantShell";
import { AIAssistantRoute } from "../features/ai/routes/aiRoute";
import Calendar from "../pages/Calendar/Calendar";
import Tasks from "../pages/Tasks/Tasks";
import Reminders from "../pages/Reminders/Reminders";
import Files from "../pages/Files/Files";
import Settings from "../pages/Settings/Settings";
import Integrations from "../pages/Integrations/Integrations";
import NotFound from "../pages/NotFound/NotFound";

import AppLayout from "../layouts/AppLayout/AppLayout";
import RequireAuth from "./router/RequireAuth";
import RootRedirect from "./router/RootRedirect";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootRedirect />,
  },

  {
    path: "/register",
    element: <Register />,
  },

  {
    path: "/login",
    element: <Login />,
  },

  {
    path: "/forgot-password",
    element: <ForgotPassword />,
  },

  {
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      {
        path: "/dashboard",
        element: <Dashboard />,
      },

      {
        path: "/ai-assistant",
        element: (
          <Suspense fallback={<AIAssistantShell />}>
            <AIAssistantRoute />
          </Suspense>
        ),
      },

      {
        path: "/calendar",
        element: <Calendar />,
      },

      {
        path: "/tasks",
        element: <Tasks />,
      },

      {
        path: "/reminders",
        element: <Reminders />,
      },

      {
        path: "/files",
        element: <Files />,
      },

      {
        path: "/settings",
        element: <Settings />,
      },

      {
        path: "/integrations",
        element: <Integrations />,
      },
    ],
  },

  {
    path: "*",
    element: <NotFound />,
  },
]);
