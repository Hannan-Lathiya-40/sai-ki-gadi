"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export type AdminNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  user_id: string | null;
  is_read: boolean;
  created_at: string;
};

function formatRelative(iso: string): string {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return "";
  const diffSec = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (diffSec < 45) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function playNotificationSound() {
  try {
    const audio = new Audio("/sounds/notification.wav");
    audio.volume = 0.55;
    void audio.play().catch(() => {
      // Autoplay may be blocked until a user gesture — ignore.
    });
  } catch {
    // Ignore sound errors.
  }
}

type ToastState = {
  id: string;
  title: string;
  message: string;
} | null;

export function AdminNotificationsBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const hydratedRef = useRef(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await res.json()) as {
        ok?: boolean;
        notifications?: AdminNotification[];
      };
      if (!res.ok || !payload.ok || !payload.notifications) {
        return;
      }
      setNotifications(payload.notifications);
      for (const n of payload.notifications) {
        seenIdsRef.current.add(n.id);
      }
      hydratedRef.current = true;
    } catch {
      // Keep previous list.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  // Realtime: new rows appear without refresh.
  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) return;

    const channel = client
      .channel("admin-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "admin_notifications",
        },
        (payload) => {
          const row = payload.new as AdminNotification;
          if (!row?.id) return;
          if (seenIdsRef.current.has(row.id)) return;
          seenIdsRef.current.add(row.id);

          setNotifications((prev) => {
            if (prev.some((n) => n.id === row.id)) return prev;
            return [row, ...prev].slice(0, 50);
          });

          if (hydratedRef.current) {
            setToast({
              id: row.id,
              title: row.title,
              message: row.message,
            });
            playNotificationSound();
          }
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const markRead = async (ids?: string[], markAllRead = false) => {
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          markAllRead ? { markAllRead: true } : { ids: ids ?? [] },
        ),
      });
      const payload = (await res.json()) as { ok?: boolean };
      if (!res.ok || !payload.ok) return;

      setNotifications((prev) =>
        prev.map((n) => {
          if (markAllRead) return { ...n, is_read: true };
          if (ids?.includes(n.id)) return { ...n, is_read: true };
          return n;
        }),
      );
    } catch {
      // Ignore.
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        <span aria-hidden>🔔</span>
        {unreadCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-bold text-slate-900">Notifications</p>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => void markRead(undefined, true)}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">
                Loading…
              </p>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">
                No notifications yet.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={`w-full px-4 py-3 text-left hover:bg-slate-50 ${
                        n.is_read ? "bg-white" : "bg-indigo-50/60"
                      }`}
                      onClick={() => {
                        if (!n.is_read) void markRead([n.id]);
                      }}
                    >
                      <p className="text-sm font-semibold text-slate-900">
                        {n.title}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-600">
                        {n.message}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatRelative(n.created_at)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed right-4 top-16 z-[60] w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-indigo-200 bg-white p-4 shadow-2xl sm:right-6">
          <p className="text-sm font-bold text-slate-900">
            🔔 {toast.title}
          </p>
          <p className="mt-1 text-sm text-slate-600">{toast.message}</p>
          <button
            type="button"
            className="mt-3 text-xs font-semibold text-indigo-600"
            onClick={() => setToast(null)}
          >
            Dismiss
          </button>
        </div>
      ) : null}
    </div>
  );
}
