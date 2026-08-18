"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { axiosInstance } from "@/lib/axios";
import { useRouter, usePathname } from "next/navigation";
import { useUserStore } from "@/store/useUserStore";

export interface User {
  id: string;
  username: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check if session exists on load
    const checkSession = async () => {
      try {
        const res = await axiosInstance.get<{ id: string; username: string; email: string }>("/auth/me");
        setUser(res.data);
        useUserStore.getState().setUser(res.data);
      } catch {
        setUser(null);
        useUserStore.getState().setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  // Route protection
  useEffect(() => {
    if (isLoading) return;

    const isAuthPage = pathname === "/login" || pathname === "/signup";

    if (!user && !isAuthPage) {
      router.push("/login");
    } else if (user && isAuthPage) {
      router.push("/chat");
    }
  }, [user, isLoading, pathname, router]);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await axiosInstance.post<{ message: string; user: User }>("/auth/login", {
        username,
        password,
      });
      setUser(res.data.user);
      useUserStore.getState().setUser(res.data.user);
      router.push("/chat");
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await axiosInstance.post<{ message: string; user: User }>("/auth/register", {
        username,
        email,
        password,
      });
      setUser(res.data.user);
      useUserStore.getState().setUser(res.data.user);
      router.push("/chat");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await axiosInstance.post("/auth/logout");
      setUser(null);
      useUserStore.getState().setUser(null);
      router.push("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
