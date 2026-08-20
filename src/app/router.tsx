import {
  createBrowserRouter,
  Navigate,
} from "react-router-dom";

import Register from "../pages/Register/Register";
import Login from "../pages/Login/Login";
import Dashboard from "../pages/Dashboard/Dashboard";

import AIAssistant from "../features/ai/components/AssistantPage/AIAssistant";
import Calendar from "../pages/Calendar/Calendar";
import Tasks from "../pages/Tasks/Tasks";
import Reminders from "../pages/Reminders/Reminders";
import Files from "../pages/Files/Files";
import Settings from "../pages/Settings/Settings";
import Integrations from "../pages/Integrations/Integrations";

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
        element: <AIAssistant />,
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
    element: <Navigate to="/dashboard" replace />,
  },
]);
