"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  requestId: string;
  status: string;
};

export function ProfileChangeActions({ requestId, status }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");

  const isPending = status === "pending";

  const approve = async () => {
    setError("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/profile-changes/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };
      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "Could not approve request.");
        return;
      }
      router.push("/dashboard?tab=profile-changes");
      router.refresh();
    } catch {
      setError("Could not approve request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const reject = async () => {
    setError("");
    if (!reason.trim()) {
      setError("Rejection reason is required.");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/profile-changes/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, reason: reason.trim() }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };
      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "Could not reject request.");
        return;
      }
      router.push("/dashboard?tab=profile-changes");
      router.refresh();
    } catch {
      setError("Could not reject request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isPending) {
    return (
      <p className="text-sm text-slate-500">
        This request is already {status}.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {!rejectOpen ? (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => void approve()}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {isSubmitting ? "Working…" : "Approve"}
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => setRejectOpen(true)}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
          >
            Reject
          </button>
        </div>
      ) : (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-800">
            Reject Profile Change
          </p>
          <textarea
            className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                setRejectOpen(false);
                setReason("");
                setError("");
              }}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => void reject()}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {isSubmitting ? "Rejecting…" : "Reject Request"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
