import { AdminFontSizeControl } from "@/components/admin-font-size-control";
import { AdminNotificationsBell } from "@/components/admin-notifications-bell";
import { ADMIN_FONT_SIZE_BOOTSTRAP_SCRIPT } from "@/lib/admin-font-size";

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
      <script
        dangerouslySetInnerHTML={{ __html: ADMIN_FONT_SIZE_BOOTSTRAP_SCRIPT }}
      />
      <div className="sticky top-0 z-40 flex h-12 items-center justify-end gap-2 border-b border-slate-200 bg-white/95 px-3 backdrop-blur sm:gap-3 sm:px-6">
        <p className="mr-auto truncate text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
          Sai ki Gadi Admin
        </p>
        <AdminFontSizeControl />
        <AdminNotificationsBell />
      </div>
      {children}
    </div>
  );
}
