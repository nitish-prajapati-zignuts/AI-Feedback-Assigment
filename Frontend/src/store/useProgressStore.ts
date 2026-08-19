import { create } from "zustand";

interface ProgressStore {
  progress: number;
  activeRequests: number;
  isProcessing: boolean;
  startRequest: () => void;
  updateProgress: (p: number) => void;
  finishRequest: () => void;
}

export const useProgressStore = create<ProgressStore>((set) => ({
  progress: 0,
  activeRequests: 0,
  isProcessing: false,
  startRequest: () => set((state) => ({
    activeRequests: state.activeRequests + 1,
    isProcessing: true,
    progress: state.activeRequests === 0 ? 0 : state.progress,
  })),
  updateProgress: (p) => set(() => ({
    progress: p,
  })),
  finishRequest: () => set((state) => {
    const active = Math.max(0, state.activeRequests - 1);
    return {
      activeRequests: active,
      isProcessing: active > 0,
      progress: active === 0 ? 0 : state.progress,
    };
  }),
}));
