import axios from "axios";

// Determine base URL dynamically (handles localhost, LAN IP 172.16.x.x, or ngrok tunnels)
const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    // If accessed via LAN IP or custom domain/ngrok from mobile
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `${window.location.protocol}//${hostname}:4000/api`;
    }
  }
  return "http://localhost:4000/api";
};

export const axiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor with Logger
axiosInstance.interceptors.request.use(
  (config) => {
    // Dynamic update baseURL per request if window location changed
    config.baseURL = getApiBaseUrl();

    console.log(
      `🌐 [HTTP OUTGOING] ${config.method?.toUpperCase()} -> ${config.baseURL}${config.url}`,
      { data: config.data, headers: config.headers }
    );
    return config;
  },
  (error) => {
    console.error("❌ [HTTP REQUEST ERROR]", error);
    return Promise.reject(error);
  }
);

// Response Interceptor with Logger
axiosInstance.interceptors.response.use(
  (response) => {
    console.log(
      `✅ [HTTP RESPONSE] ${response.status} ${response.config.method?.toUpperCase()} -> ${response.config.url}`,
      response.data
    );
    return response;
  },
  (error) => {
    const message = error.response?.data?.error || error.message || "An unexpected network error occurred";
    console.error(
      `🚨 [HTTP FAILED / NO BACKEND RESPONSE] ${error.config?.method?.toUpperCase()} -> ${error.config?.baseURL}${error.config?.url}`,
      {
        status: error.response?.status,
        statusText: error.response?.statusText,
        errorData: error.response?.data,
        message: error.message,
        isNetworkError: !error.response,
      }
    );
    return Promise.reject(new Error(message));
  }
);

