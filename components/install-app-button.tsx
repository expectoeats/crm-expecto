"use client";

import { useEffect, useState } from "react";
import { RiDownloadLine, RiCloseLine, RiShareForwardLine } from "react-icons/ri";
import { Button } from "@/components/ui";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

function isStandaloneApp() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isSafariBrowser() {
  if (typeof navigator === "undefined") return false;
  return /safari/i.test(navigator.userAgent) && !/chrome|crios|fxios/i.test(navigator.userAgent);
}

export function InstallAppButton({ compact = false }: { compact?: boolean }) {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [showIosBanner, setShowIosBanner] = useState(false);

  useEffect(() => {
    if (isStandaloneApp()) return;

    // iOS Safari — no beforeinstallprompt, show manual banner
    if (isIos() && isSafariBrowser()) {
      const dismissed = sessionStorage.getItem("ios-install-dismissed");
      if (!dismissed) setShowIosBanner(true);
      return;
    }

    // Android/Chrome — use native prompt
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    const handleInstalled = () => {
      setPromptEvent(null);
      setCanInstall(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function installApp() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
    setCanInstall(false);
  }

  // iOS install banner
  if (showIosBanner) {
    return (
      <div className="fixed bottom-20 left-3 right-3 z-[70] rounded-2xl bg-slate-950 p-4 shadow-2xl text-white">
        <button
          type="button"
          onClick={() => {
            sessionStorage.setItem("ios-install-dismissed", "1");
            setShowIosBanner(false);
          }}
          className="absolute right-3 top-3 rounded-lg p-1 text-white/60 hover:text-white"
        >
          <RiCloseLine className="h-4 w-4" />
        </button>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500">
            <RiShareForwardLine className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold">Install Expecto CRM</p>
            <p className="mt-1 text-xs text-white/70">
              Tap <span className="font-semibold text-white">Share</span> then{" "}
              <span className="font-semibold text-white">&quot;Add to Home Screen&quot;</span> to install this app on your iPhone.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Android/Chrome native install button
  if (!canInstall) return null;

  return (
    <Button variant="secondary" className={compact ? "px-3" : ""} onClick={installApp} aria-label="Install app">
      <RiDownloadLine className="h-4 w-4" />
      {compact ? null : "Install app"}
    </Button>
  );
}
