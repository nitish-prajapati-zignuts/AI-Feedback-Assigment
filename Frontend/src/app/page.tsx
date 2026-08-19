"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { user, isLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const verifySession = async () => {
      await refreshUser();
      setChecking(false);
    };
    verifySession();
  }, [refreshUser]);

  useEffect(() => {
    if (!checking && !isLoading) {
      if (user) {
        router.push("/chat");
      } else {
        router.push("/login");
      }
    }
  }, [user, isLoading, checking, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
