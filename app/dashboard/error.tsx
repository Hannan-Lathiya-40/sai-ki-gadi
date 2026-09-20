"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <p className="admin-eyebrow text-[var(--admin-danger)]">Error</p>
      <h1 className="admin-page-title mt-2">Something went wrong</h1>
      <p className="admin-caption mt-2 max-w-md">
        We couldn&apos;t load this admin page right now. Try again — if it keeps
        happening, check your connection and session.
      </p>
      <p className="admin-meta mt-3 max-w-sm break-all">
        {error.message || "Unexpected error"}
      </p>
      <button
        type="button"
        onClick={reset}
        className="admin-btn admin-btn-primary mt-6"
      >
        Try again
      </button>
    </div>
  );
}
