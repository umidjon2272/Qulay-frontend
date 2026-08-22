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

const storageResourceByKey: Record<string, WorkspaceResource> = {
  yechim_ai_tasks: "tasks",
  yechim_ai_reminders: "reminders",
  yechim_ai_calendar_events: "calendarEvents",
  yechim_ai_notes: "notes",
  yechim_ai_files: "files",
  yechim_profile_name: "profile",
  yechim_profile_email: "profile",
  yechim_profile_bio: "profile",
  yechim_profile_avatar: "profile",
  yechim_ai_settings: "settings",
  yechim_integrations: "integrations",
};

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
    const workspaceEvent = event as WorkspaceDataEvent & StorageEvent;

    const resources = Array.isArray(resource) ? resource : [resource];
    const changedResource = workspaceEvent.detail?.resource ??
      (workspaceEvent.key ? storageResourceByKey[workspaceEvent.key] : undefined);

    if (changedResource && resources.includes(changedResource)) {
      listener();
    }
  };

  window.addEventListener(WORKSPACE_DATA_CHANGED, handleChange);
  window.addEventListener("storage", handleChange);

  return () => {
    window.removeEventListener(WORKSPACE_DATA_CHANGED, handleChange);
    window.removeEventListener("storage", handleChange);
  };
};
