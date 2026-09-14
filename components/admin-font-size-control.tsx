"use client";

import { useEffect, useState } from "react";

import {
  ADMIN_FONT_SIZE_OPTIONS,
  applyAdminFontSize,
  clearAdminFontSize,
  persistAdminFontSize,
  readStoredAdminFontSize,
  type AdminFontSize,
} from "@/lib/admin-font-size";

export function AdminFontSizeControl() {
  // SSR + first paint use "normal"; sync from localStorage after mount.
  // Actual page font is applied earlier by the dashboard bootstrap script.
  const [fontSize, setFontSize] = useState<AdminFontSize>("normal");

  useEffect(() => {
    const stored = readStoredAdminFontSize();
    setFontSize(stored);
    applyAdminFontSize(stored);

    return () => {
      // Keep admin scaling scoped to /dashboard routes only.
      clearAdminFontSize();
    };
  }, []);

  const handleSelect = (next: AdminFontSize) => {
    setFontSize(next);
    applyAdminFontSize(next);
    persistAdminFontSize(next);
  };

  return (
    <div
      className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5"
      role="group"
      aria-label="Font size accessibility controls"
    >
      {ADMIN_FONT_SIZE_OPTIONS.map((option) => {
        const isActive = fontSize === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelect(option.value)}
            aria-label={option.ariaLabel}
            aria-pressed={isActive}
            title={option.ariaLabel}
            className={`min-h-8 min-w-8 rounded-md px-1.5 text-[11px] font-bold leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 sm:min-w-9 sm:px-2 sm:text-xs ${
              isActive
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-transparent text-slate-600 hover:bg-white hover:text-slate-900"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
