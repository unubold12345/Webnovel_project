"use client";

import { createContext, useContext } from "react";

interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar: string | null;
  bio: string | null;
  role: string;
  emailVerified: boolean;
  needsPassword: boolean;
  subscriptionPlan: string | null;
  subscriptionExpiresAt: string | null;
  acceptedTermsAt: string | null;
  createdAt: string;
  stats?: {
    comments: {
      count: number;
      likes: number;
      dislikes: number;
    };
    reviews: {
      count: number;
      likes: number;
      dislikes: number;
    };
  };
}

const UserProfileContext = createContext<UserProfile | null>(null);

export function UserProfileProvider({ user, children }: { user: UserProfile | null; children: React.ReactNode }) {
  return (
    <UserProfileContext.Provider value={user}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  return useContext(UserProfileContext);
}