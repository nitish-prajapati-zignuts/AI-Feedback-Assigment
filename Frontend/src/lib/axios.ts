import axios from "axios";
import { useProgressStore } from "@/store/useProgressStore";

const API_BASE_URL = "http://localhost:4000/api";

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const store = useProgressStore.getState();
    store.startRequest();

    // Attach active workspace ID if present
    if (typeof window !== "undefined") {
      try {
        const rawStorage = localStorage.getItem("active-workspace-storage");
        if (rawStorage) {
          const parsed = JSON.parse(rawStorage);
          const activeWorkspaceId = parsed?.state?.activeWorkspace?.id;
          if (activeWorkspaceId) {
            config.headers["x-workspace-id"] = activeWorkspaceId;
          }
        }
      } catch (e) {
        // ignore parse error
      }
    }

    // Track upload progress in real-time
    const originalOnUpload = config.onUploadProgress;
    config.onUploadProgress = (progressEvent) => {
      if (originalOnUpload) originalOnUpload(progressEvent);
      if (progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        store.updateProgress(percentCompleted);
      }
    };

    // Track download progress in real-time
    const originalOnDownload = config.onDownloadProgress;
    config.onDownloadProgress = (progressEvent) => {
      if (originalOnDownload) originalOnDownload(progressEvent);
      if (progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        store.updateProgress(percentCompleted);
      }
    };

    return config;
  },
  (error) => {
    useProgressStore.getState().finishRequest();
    return Promise.reject(error);
  }
);

// Response Interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    useProgressStore.getState().finishRequest();
    return response;
  },
  (error) => {
    useProgressStore.getState().finishRequest();
    const message = error.response?.data?.error || "An unexpected error occurred";
    return Promise.reject(new Error(message));
  }
);
