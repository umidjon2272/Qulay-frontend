export type WorkspaceResource =
  | "tasks"
  | "reminders"
  | "calendarEvents"
  | "notes"
  | "files"
  | "profile"
  | "settings"
  | "integrations";

export const WORKSPACE_DATA_CHANGED = "yechim_ai_workspace_data_changed";

type WorkspaceDataEvent = CustomEvent<{ resource: WorkspaceResource }>;

export const notifyWorkspaceDataChanged = (resource: WorkspaceResource) => {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<{ resource: WorkspaceResource }>(
      WORKSPACE_DATA_CHANGED,
      { detail: { resource } },
    ),
  );
};

export const subscribeToWorkspaceData = (
  resource: WorkspaceResource | WorkspaceResource[],
  listener: () => void,
) => {
  if (typeof window === "undefined") return () => undefined;

  const handleChange = (event: Event) => {
    const workspaceEvent = event as WorkspaceDataEvent;

    const resources = Array.isArray(resource) ? resource : [resource];

    if (resources.includes(workspaceEvent.detail?.resource)) {
      listener();
    }
  };

  window.addEventListener(WORKSPACE_DATA_CHANGED, handleChange);

  return () =>
    window.removeEventListener(WORKSPACE_DATA_CHANGED, handleChange);
};
