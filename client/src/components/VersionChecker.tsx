import { useState, useEffect, useRef } from "react";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const POLL_INTERVAL_MS = 3 * 60 * 1000;

export function VersionChecker() {
  const initialVersion = useRef<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    async function fetchVersion(): Promise<string | null> {
      try {
        const res = await fetch("/api/version", { credentials: "include" });
        if (!res.ok) return null;
        const data = await res.json();
        return data.version ?? null;
      } catch {
        return null;
      }
    }

    async function check() {
      if (document.visibilityState !== "visible") return;
      const version = await fetchVersion();
      if (!version) return;
      if (initialVersion.current === null) {
        initialVersion.current = version;
        return;
      }
      if (version !== initialVersion.current) {
        setUpdateAvailable(true);
      }
    }

    fetchVersion().then((v) => {
      if (v) initialVersion.current = v;
    });

    const interval = setInterval(check, POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", check);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  if (!updateAvailable || dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-4 bg-primary px-4 py-2.5 text-primary-foreground shadow-md">
      <span className="text-sm font-medium">A new version of this app is available.</span>
      <Button
        size="sm"
        variant="secondary"
        className="h-7 gap-1.5 text-xs"
        onClick={() => window.location.reload()}
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Refresh now
      </Button>
      <button
        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 transition-opacity"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
