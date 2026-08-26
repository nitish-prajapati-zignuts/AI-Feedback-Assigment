"use client";

import { useEffect, useState } from "react";
import { Download, X, Share, PlusSquare } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Check if already installed in standalone mode
    const isInStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isInStandalone) {
      setIsStandalone(true);
      return;
    }

    // 2. Check if iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // If iOS and not standalone, show custom iOS instruction popup
    if (isIosDevice) {
      setShowPrompt(true);
    }

    // 3. Android / Chrome beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
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
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install prompt: ${outcome}`);
      setDeferredPrompt(null);
      setShowPrompt(false);
    } else {
      // Fallback: If event hasn't fired yet, show advice to use browser menu
      alert("To install, open your browser menu (⋮ or 💬) and select 'Add to Home screen' or 'Install app'.");
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-5 sm:max-w-md flex flex-col gap-2 rounded-xl border border-cyan-500/30 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-md text-white transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
            <Download className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-100 text-sm">Install AI Feedback App</h4>
            <p className="text-xs text-slate-400">Add to your mobile home screen for quick access.</p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          aria-label="Close prompt"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {isIOS ? (
        <div className="mt-2 rounded-lg bg-slate-800/80 p-2.5 text-xs text-slate-300 flex items-center gap-2 border border-slate-700">
          <span>To install on iOS: Tap <Share className="inline h-3.5 w-3.5 text-cyan-400 mx-0.5" /> then <strong>"Add to Home Screen"</strong> <PlusSquare className="inline h-3.5 w-3.5 text-cyan-400 mx-0.5" /></span>
        </div>
      ) : (
        <div className="mt-2 flex justify-end gap-2">
          <button
            onClick={handleDismiss}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            Not now
          </button>
          <button
            onClick={handleInstallClick}
            className="rounded-lg bg-cyan-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-cyan-500 transition-colors shadow-lg shadow-cyan-600/20 flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Install App
          </button>
        </div>
      )}
    </div>
  );
}
