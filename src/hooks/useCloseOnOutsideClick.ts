import { useEffect } from "react";

/**
 * Closes an open dropdown/menu on outside click or Escape.
 * Menu toggle buttons and menu content should call event.stopPropagation()
 * so their own clicks don't immediately re-close the menu.
 */
export const useCloseOnOutsideClick = (isOpen: boolean, onClose: () => void) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleClick = () => onClose();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);
};
