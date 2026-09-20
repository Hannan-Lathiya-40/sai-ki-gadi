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
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-600">
        Something went wrong
      </p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">
        Admin panel error
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        {error.message || "An unexpected error occurred while loading this page."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
      >
        Try again
      </button>
    </div>
  );
}
