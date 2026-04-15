"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type VerificationActionsProps = {
  userId: string;
  isVerified: boolean;
};

export function VerificationActions({
  userId,
  isVerified,
}: VerificationActionsProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const acceptVerification = async () => {
    setError("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/verify-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "Could not mark user as verified.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not mark user as verified.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button
        onClick={() => {
          void acceptVerification();
        }}
        disabled={isVerified || isSubmitting}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isVerified ? "Already Verified" : isSubmitting ? "Accepting..." : "Accept Verification"}
      </button>
      {error ? (
        <p className="text-sm text-rose-700">{error}</p>
      ) : null}
    </div>
  );
}
