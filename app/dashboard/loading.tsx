export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 h-24 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white"
            />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      </div>
    </div>
  );
}
