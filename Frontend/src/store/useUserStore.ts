import { create } from "zustand";

interface UserState {
  id: string | null;
  username: string | null;
  email: string | null;
  setUser: (user: { id: string; username: string; email: string } | null) => void;
}

export const useUserStore = create<UserState>((set) => ({
  id: null,
  username: null,
  email: null,
  setUser: (user) =>
    set({
      id: user ? user.id : null,
      username: user ? user.username : null,
      email: user ? user.email : null,
    }),
}));
