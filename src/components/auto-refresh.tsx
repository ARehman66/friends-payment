"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Soft-refresh server data while the tab is visible. */
export function AutoRefresh({ intervalMs = 20000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    function tick() {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }

    function start() {
      if (timer) return;
      timer = setInterval(tick, intervalMs);
    }

    function stop() {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    }

    function onVisibility() {
      if (document.visibilityState === "visible") {
        tick();
        start();
      } else {
        stop();
      }
    }

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs, router]);

  return null;
}
