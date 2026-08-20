import { create } from "zustand";
import { persist } from "zustand/middleware";
import { axiosInstance } from "@/lib/axios";

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  role: "owner" | "admin" | "editor" | "viewer";
  memberCount: number;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  username: string;
  email: string;
  role: "owner" | "admin" | "editor" | "viewer";
}

export interface WorkspaceInvite {
  id: string;
  workspaceId: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  token: string;
  status: "pending" | "accepted" | "expired";
}

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  isLoading: boolean;
  error: string | null;
  fetchWorkspaces: () => Promise<void>;
  setActiveWorkspace: (workspace: Workspace) => void;
  createWorkspace: (name: string) => Promise<Workspace>;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspaces: [],
      activeWorkspace: null,
      isLoading: false,
      error: null,

      fetchWorkspaces: async () => {
        try {
          set({ isLoading: true, error: null });
          const res = await axiosInstance.get("/workspaces");
          const list: Workspace[] = res.data;

          const currentActive = get().activeWorkspace;
          const matchingActive = currentActive ? list.find((w) => w.id === currentActive.id) : null;

          set({
            workspaces: list,
            activeWorkspace: matchingActive || list[0] || null,
            isLoading: false,
          });
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
        }
      },

      setActiveWorkspace: (workspace: Workspace) => {
        set({ activeWorkspace: workspace });
      },

      createWorkspace: async (name: string) => {
        try {
          set({ isLoading: true, error: null });
          const res = await axiosInstance.post("/workspaces", { name });
          const newWs = res.data;
          await get().fetchWorkspaces();
          set({ activeWorkspace: newWs, isLoading: false });
          return newWs;
        } catch (err: any) {
          set({ isLoading: false });
          throw err;
        }
      },
    }),
    {
      name: "active-workspace-storage",
      partialize: (state) => ({ activeWorkspace: state.activeWorkspace }),
    }
  )
);
