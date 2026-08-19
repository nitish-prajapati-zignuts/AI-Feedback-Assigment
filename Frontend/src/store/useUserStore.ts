import { create } from "zustand";

interface UserState {
  id: string | null;
  username: string | null;
  email: string | null;
  plan: string | null;
  planExpiresAt: Date | string | null;
  usage: {
    feedbackCount: number;
    feedbackLimit: number;
  } | null;
  setUser: (user: any | null) => void;
}

export const useUserStore = create<UserState>((set) => ({
  id: null,
  username: null,
  email: null,
  plan: null,
  planExpiresAt: null,
  usage: null,
  setUser: (user) =>
    set({
      id: user ? user.id : null,
      username: user ? user.username : null,
      email: user ? user.email : null,
      plan: user ? user.plan : null,
      planExpiresAt: user ? user.planExpiresAt : null,
      usage: user ? user.usage : null,
    }),
}));
