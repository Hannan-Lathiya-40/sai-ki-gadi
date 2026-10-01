"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { VEHICLE_CATEGORIES } from "@/lib/vehicle-categories";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type UserEmbed = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
} | null;

type OverrideRow = {
  id: string;
  user_id: string;
  from_city: string;
  from_state: string;
  to_city: string;
  to_state: string;
  vehicle_category: string;
  allowed_min_fare: number;
  normal_min_fare: number | null;
  status: string;
  expires_at: string | null;
  approved_at: string;
  users: UserEmbed | UserEmbed[];
};

function userLabel(users: OverrideRow["users"]): string {
  const u = Array.isArray(users) ? users[0] : users;
  if (!u) return "Unknown user";
  const name = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
  return name || u.phone || "Unknown user";
}

function formatInr(n: number | null) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

export function ActiveFareOverridesPanel() {
  const router = useRouter();
  const [rows, setRows] = useState<OverrideRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [q, setQ] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [status, setStatus] = useState("approved");
  const [page, setPage] = useState(1);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "30",
        status,
      });
      if (q.trim()) params.set("q", q.trim());
      if (vehicle) params.set("vehicle", vehicle);
      const res = await fetch(`/api/admin/user-fare-overrides?${params}`);
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        data?: OverrideRow[];
        total?: number;
      };
      if (!res.ok || json.ok === false) {
        throw new Error(json.error ?? "Failed to load overrides.");
      }
      setRows(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [page, status, q, vehicle]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const channel = supabase
      .channel("admin-user-fare-overrides")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_fare_overrides" },
        () => {
          void load();
          router.refresh();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load, router]);

  const doRevoke = async () => {
    if (!revokeId) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/user-fare-overrides/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overrideId: revokeId,
          reason: revokeReason,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || json.ok === false) {
        throw new Error(json.error ?? "Revoke failed.");
      }
      setSuccess("Override revoked. User returns to normal minimum.");
      setTimeout(() => setSuccess(""), 3000);
      setRevokeId(null);
      setRevokeReason("");
      void load();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Revoke failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-900">
          Active Fare Overrides
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          User-specific allowed minimums. Temporary overrides stop working after
          expiry without relying on a cron job.
        </p>
      </div>

      {error ? (
        <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <input
          type="search"
          placeholder="Search city…"
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          className="h-10 rounded-xl border border-slate-300 px-3 text-sm"
        />
        <select
          value={vehicle}
          onChange={(e) => {
            setPage(1);
            setVehicle(e.target.value);
          }}
          className="h-10 rounded-xl border border-slate-300 px-3 text-sm"
        >
          <option value="">All vehicles</option>
          {VEHICLE_CATEGORIES.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          className="h-10 rounded-xl border border-slate-300 px-3 text-sm"
        >
          <option value="approved">Active (approved)</option>
          <option value="revoked">Revoked</option>
          <option value="expired">Expired</option>
          <option value="all">All</option>
        </select>
      </div>

      <div className="admin-table-wrap">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  User
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Route
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Vehicle
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Allowed Min
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Normal Min
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Expires
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    No overrides found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {userLabel(row.users)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.from_city} → {row.to_city}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                        {row.vehicle_category}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-700">
                      {formatInr(row.allowed_min_fare)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatInr(row.normal_min_fare)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {row.expires_at
                        ? new Date(row.expires_at).toLocaleDateString("en-IN")
                        : "Until Revoked"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          row.status === "approved"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {row.status === "approved" ? "Active" : row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {row.status === "approved" ? (
                        <button
                          type="button"
                          onClick={() => setRevokeId(row.id)}
                          className="rounded-lg bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-200"
                        >
                          Revoke
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="rounded-lg border px-3 py-1.5 disabled:opacity-40"
        >
          Previous
        </button>
        <span>
          Page {page} · {total} total
        </span>
        <button
          type="button"
          disabled={page * 30 >= total}
          onClick={() => setPage((p) => p + 1)}
          className="rounded-lg border px-3 py-1.5 disabled:opacity-40"
        >
          Next
        </button>
      </div>

      {revokeId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h4 className="text-lg font-bold text-slate-900">Revoke Override</h4>
            <p className="mt-2 text-sm text-slate-600">
              The user will return to the normal minimum fare for this route and
              vehicle.
            </p>
            <textarea
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              rows={3}
              placeholder="Optional reason…"
              className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setRevokeId(null)}
                className="flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void doRevoke()}
                className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                Confirm Revoke
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
