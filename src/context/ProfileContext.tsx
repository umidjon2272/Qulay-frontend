import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { getProfile, updateProfile } from "../services/profileService";
import { ProfileContext } from "./ProfileContextValue";

const initialProfile = getProfile();

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const [name, setNameState] = useState(initialProfile.name);
  const [email, setEmailState] = useState(initialProfile.email);
  const [bio, setBioState] = useState(initialProfile.bio);
  const [avatar, setAvatarState] = useState<string | null>(initialProfile.avatar);

  const setName = useCallback((value: string) => {
    setNameState(value);
    updateProfile({ name: value });
  }, []);

  const setEmail = useCallback((value: string) => {
    setEmailState(value);
    updateProfile({ email: value });
  }, []);

  const setBio = useCallback((value: string) => {
    setBioState(value);
    updateProfile({ bio: value });
  }, []);

  const setAvatar = useCallback((value: string | null) => {
    setAvatarState(value);
    updateProfile({ avatar: value });
  }, []);

  const value = useMemo(
    () => ({ name, email, bio, avatar, setName, setEmail, setBio, setAvatar }),
    [name, email, bio, avatar, setName, setEmail, setBio, setAvatar],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
};
