import { useContext } from "react";

import { ToastContext, type ToastContextValue } from "../components/Toast/ToastContextValue";

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return context;
};
