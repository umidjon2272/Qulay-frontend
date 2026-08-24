import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { getProfile, loadProfile } from "../services/profileService";
import { subscribeToWorkspaceData } from "../services/workspaceEvents";
import { ProfileContext } from "./ProfileContextValue";
import { useAuth } from "../hooks/useAuth";

const initialProfile = getProfile();

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const { status, user } = useAuth();
  const fallbackName = user ? [user.firstName, user.lastName].filter(Boolean).join(" ") : "";
  const [name, setNameState] = useState(initialProfile.name || fallbackName);
  const [email, setEmailState] = useState(initialProfile.email || user?.email || "");
  const [bio, setBioState] = useState(initialProfile.bio);
  const [avatar, setAvatarState] = useState<string | null>(initialProfile.avatar);

  useEffect(() => {
    if (status !== "authenticated" || !user) return;

    // The cached /auth/me user makes the shell useful before the profile API
    // wakes up. The richer profile is still revalidated in the background.
    const current = getProfile();
    if (!current.name) setNameState(fallbackName);
    if (!current.email) setEmailState(user.email);
    void loadProfile().catch(() => undefined);
  }, [fallbackName, status, user]);

  useEffect(() => subscribeToWorkspaceData("profile", () => {
    const next = getProfile();
    setNameState(next.name);
    setEmailState(next.email);
    setBioState(next.bio);
    setAvatarState(next.avatar);
  }), []);

  const setName = useCallback((value: string) => {
    setNameState(value);
  }, []);

  const setEmail = useCallback((value: string) => {
    setEmailState(value);
  }, []);

  const setBio = useCallback((value: string) => {
    setBioState(value);
  }, []);

  const setAvatar = useCallback((value: string | null) => {
    setAvatarState(value);
  }, []);

  const value = useMemo(
    () => ({ name, email, bio, avatar, setName, setEmail, setBio, setAvatar }),
    [name, email, bio, avatar, setName, setEmail, setBio, setAvatar],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
};
