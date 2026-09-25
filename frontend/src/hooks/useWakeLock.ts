import { useCallback, useEffect, useRef, useState } from "react";

export type WakeLockStatus = "unsupported" | "on" | "off";

interface WakeLockSentinel {
  released: boolean;
  addEventListener: (type: "release", listener: () => void) => void;
  release: () => Promise<void>;
}

interface WakeLockApi {
  request: (type: "screen") => Promise<WakeLockSentinel>;
}

/**
 * Screen Wake Lock for Cooking Mode.
 * - Feature-detects navigator.wakeLock
 * - Re-acquires the lock when the tab becomes visible again
 * - Releases on unmount / manual release
 */
export function useWakeLock() {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const wantLockRef = useRef(false);
  const [status, setStatus] = useState<WakeLockStatus>(() =>
    typeof navigator !== "undefined" && "wakeLock" in navigator ? "off" : "unsupported",
  );

  const supported = status !== "unsupported";

  const request = useCallback(async () => {
    if (!("wakeLock" in navigator)) return;
    wantLockRef.current = true;
    try {
      const sentinel = await (navigator as Navigator & { wakeLock: WakeLockApi }).wakeLock.request("screen");
      sentinelRef.current = sentinel;
      setStatus("on");
      sentinel.addEventListener("release", () => {
        // Fired when the system takes the lock away (e.g. tab hidden)
        setStatus((current) => (current === "on" ? "off" : current));
      });
    } catch {
      // e.g. low battery / browser denial
      setStatus("off");
    }
  }, []);

  const release = useCallback(async () => {
    wantLockRef.current = false;
    const sentinel = sentinelRef.current;
    sentinelRef.current = null;
    if (sentinel && !sentinel.released) {
      try {
        await sentinel.release();
      } catch {
        /* already released */
      }
    }
    setStatus((current) => (current === "unsupported" ? current : "off"));
  }, []);

  // Re-request when the page becomes visible again (mobile browsers drop the lock).
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible" && wantLockRef.current) {
        void request();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [request]);

  // Release on unmount.
  useEffect(() => {
    return () => {
      wantLockRef.current = false;
      const sentinel = sentinelRef.current;
      sentinelRef.current = null;
      if (sentinel && !sentinel.released) {
        void sentinel.release().catch(() => undefined);
      }
    };
  }, []);

  return { supported, status, request, release };
}