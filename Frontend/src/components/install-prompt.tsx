"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent standard mini-infobar from appearing on mobile
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show native browser install prompt
    await deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-xl border border-cyan-500/30 bg-slate-900/90 p-4 shadow-2xl backdrop-blur-md text-white max-w-sm transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
        <Download className="h-5 w-5" />
      </div>
      <div className="flex-1 text-sm">
        <h4 className="font-semibold text-slate-100">Install App</h4>
        <p className="text-xs text-slate-400">Install AI Feedback for quick offline access.</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleInstallClick}
          className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-500 transition-colors shadow-lg shadow-cyan-600/20"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          aria-label="Close prompt"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
