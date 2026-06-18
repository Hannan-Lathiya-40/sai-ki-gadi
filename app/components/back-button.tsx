"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function BackButton() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tab = searchParams.get("tab") || "users";

  return (
    <button
      onClick={() => router.push(`/dashboard?tab=${tab}`)}
      className="text-sm font-semibold text-indigo-600 hover:underline"
    >
      ← Back
    </button>
  );
}
