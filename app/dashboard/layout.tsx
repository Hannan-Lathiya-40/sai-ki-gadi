import { AdminNotificationsBell } from "@/components/admin-notifications-bell";

/**
 * Shared dashboard chrome so the notification bell works on the main
 * dashboard and all detail routes (verification, cars, users, etc.).
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen">
      <div className="sticky top-0 z-40 flex h-12 items-center justify-end gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
        <p className="mr-auto text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
          Sai ki Gadi Admin
        </p>
        <AdminNotificationsBell />
      </div>
      {children}
    </div>
  );
}
