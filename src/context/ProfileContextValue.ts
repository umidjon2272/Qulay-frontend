import { createContext } from "react";

export type ProfileContextValue = {
  name: string;
  email: string;
  bio: string;
  avatar: string | null;
  setName: (name: string) => void;
  setEmail: (email: string) => void;
  setBio: (bio: string) => void;
  setAvatar: (avatar: string | null) => void;
};

export const ProfileContext = createContext<ProfileContextValue | null>(null);
