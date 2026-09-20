"use client";

import { useEffect, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type LiveStatus = "connecting" | "live" | "offline";

/**
 * Lightweight realtime health indicator based on admin_notifications channel.
 * Does not reload the page; only reflects subscription status.
 */
export function AdminLiveStatus() {
  const [status, setStatus] = useState<LiveStatus>(() =>
    typeof window !== "undefined" && !getSupabaseBrowserClient()
      ? "offline"
      : "connecting",
  );
  const [lastEventAt, setLastEventAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return;
    }

    const channel = supabase
      .channel("admin-live-status")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_notifications" },
        () => {
          if (cancelled) return;
          setLastEventAt(new Date().toLocaleTimeString());
          setStatus("live");
        },
      )
      .subscribe((state) => {
        if (cancelled) return;
        if (state === "SUBSCRIBED") setStatus("live");
        else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT")
          setStatus("offline");
        else setStatus("connecting");
      });

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, []);

  const label =
    status === "live"
      ? "Live"
      : status === "offline"
        ? "Offline"
        : "Connecting";
  const color =
    status === "live"
      ? "bg-emerald-500"
      : status === "offline"
        ? "bg-rose-500"
        : "bg-amber-400";

  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700"
      title={lastEventAt ? `Last event ${lastEventAt}` : "Realtime status"}
    >
      <span className={`h-2 w-2 rounded-full ${color}`} aria-hidden />
      <span>{label}</span>
      {lastEventAt ? (
        <span className="hidden text-slate-400 sm:inline">{lastEventAt}</span>
      ) : null}
    </div>
  );
}
