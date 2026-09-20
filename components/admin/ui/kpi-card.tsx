import type { ReactNode } from "react";

type KpiCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trendLabel?: string | null;
  status?: "default" | "success" | "warning" | "danger" | "info";
  onClick?: () => void;
  lastUpdated?: string | null;
};

const statusStyles: Record<NonNullable<KpiCardProps["status"]>, string> = {
  default: "border-slate-200 bg-white",
  success: "border-emerald-200 bg-emerald-50/60",
  warning: "border-amber-200 bg-amber-50/60",
  danger: "border-rose-200 bg-rose-50/60",
  info: "border-sky-200 bg-sky-50/60",
};

export function KpiCard({
  title,
  value,
  subtitle,
  icon,
  trendLabel,
  status = "default",
  onClick,
  lastUpdated,
}: KpiCardProps) {
  const Comp = onClick ? "button" : "article";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`rounded-xl border p-4 text-left shadow-sm transition ${statusStyles[status]} ${
        onClick ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {title}
          </p>
          <p className="mt-1.5 text-3xl font-bold tabular-nums text-slate-900">
            {value}
          </p>
        </div>
        {icon ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900/5 text-slate-700">
            {icon}
          </span>
        ) : null}
      </div>
      {subtitle ? (
        <p className="mt-1 text-xs text-slate-600">{subtitle}</p>
      ) : null}
      {trendLabel ? (
        <p className="mt-2 text-xs font-semibold text-emerald-700">{trendLabel}</p>
      ) : null}
      {lastUpdated ? (
        <p className="mt-2 text-[11px] text-slate-400">Updated {lastUpdated}</p>
      ) : null}
    </Comp>
  );
}
