"use client";

import React, { useEffect, useState } from "react";
import { useProgressStore } from "@/store/useProgressStore";
import { toast } from "sonner";

export default function GlobalProgressBar() {
  const { progress, isProcessing } = useProgressStore();
  const [visualProgress, setVisualProgress] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isProcessing) {
      // Start with a clean visual baseline
      setVisualProgress((prev) => {
        const startVal = Math.max(prev, 8);
        toast.loading(`Loading: ${Math.round(startVal)}%`, {
          id: "api-progress",
          description: "Fetching active workspace resources...",
        });
        return startVal;
      });

      interval = setInterval(() => {
        setVisualProgress((prev) => {
          let next = prev;
          
          if (progress > 0 && progress > prev) {
            next = Math.min(100, prev + (progress - prev) * 0.15);
          } else if (prev >= 90) {
            next = Math.min(95, prev + 0.05);
          } else {
            const diff = 90 - prev;
            const increment = Math.max(0.15, diff * 0.07);
            next = prev + increment;
          }

          const currentRounded = Math.round(next);
          const prevRounded = Math.round(prev);
          
          // Only trigger toast update when rounded percentage changes to optimize performance
          if (currentRounded !== prevRounded) {
            toast.loading(`Loading: ${currentRounded}%`, {
              id: "api-progress",
              description: "Fetching active workspace resources...",
            });
          }

          return next;
        });
      }, 50); // Fluid tick rate (50ms)
    } else {
      // Complete progress and notify success on Sonner Toaster
      setVisualProgress(100);
      
      toast.success("Loaded successfully!", {
        id: "api-progress",
        description: "All transactions completed.",
        duration: 1500,
      });

      const resetTimeout = setTimeout(() => {
        setVisualProgress(0);
      }, 400); // Allow time for transition exit
      
      return () => clearTimeout(resetTimeout);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isProcessing, progress]);

  // Render top indicator bar only (since visual badge is replaced by Sonner)
  if (!isProcessing && visualProgress === 0) return null;

  return (
    <div className="fixed top-0 left-0 w-full z-[9999] pointer-events-none">
      {/* Top Progress Bar */}
      <div
        className="h-1 bg-primary shadow-[0_0_10px_rgba(59,130,246,0.4)] transition-all duration-300 ease-out"
        style={{ width: `${visualProgress}%` }}
      />
    </div>
  );
}
