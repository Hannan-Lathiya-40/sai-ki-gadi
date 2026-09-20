export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-[1480px] px-3 py-4 sm:px-5 sm:py-6">
      <div className="admin-card mb-5 p-5">
        <div className="admin-skeleton mb-3 h-3 w-40" />
        <div className="admin-skeleton mb-2 h-8 w-72" />
        <div className="admin-skeleton h-4 w-96 max-w-full" />
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="admin-card p-4">
            <div className="admin-skeleton mb-3 h-3 w-24" />
            <div className="admin-skeleton mb-2 h-8 w-16" />
            <div className="admin-skeleton h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-5">
        <div className="admin-card h-56 p-4 xl:col-span-3">
          <div className="admin-skeleton mb-4 h-4 w-48" />
          <div className="admin-skeleton h-36 w-full" />
        </div>
        <div className="admin-card h-56 p-4 xl:col-span-2">
          <div className="admin-skeleton mb-4 h-4 w-40" />
          <div className="admin-skeleton mx-auto h-32 w-32 rounded-full" />
        </div>
      </div>
    </div>
  );
}
