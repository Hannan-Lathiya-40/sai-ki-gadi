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
  sparkline?: number[];
};

const accentBar: Record<NonNullable<KpiCardProps["status"]>, string> = {
  default: "bg-slate-300",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
  info: "bg-sky-500",
};

function MiniSparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const w = 72;
  const h = 24;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 2) - 1;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="mt-2 text-[var(--admin-accent)]"
      aria-hidden
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon,
  trendLabel,
  status = "default",
  onClick,
  lastUpdated,
  sparkline,
}: KpiCardProps) {
  const className = `admin-card admin-card-hover relative overflow-hidden p-4 text-left ${
    onClick ? "cursor-pointer" : ""
  }`;

  const body = (
    <>
      <span
        className={`absolute left-0 top-0 h-full w-0.5 ${accentBar[status]}`}
        aria-hidden
      />
      <div className="flex items-start justify-between gap-3 pl-1.5">
        <div className="min-w-0">
          <p className="admin-eyebrow tracking-[0.08em]">{title}</p>
          <p className="mt-1.5 text-[1.75rem] font-semibold tabular-nums tracking-tight text-[var(--admin-text)]">
            {value}
          </p>
        </div>
        {icon ? (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--admin-radius-sm)] border border-[var(--admin-border)] bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)]">
            {icon}
          </span>
        ) : null}
      </div>
      {subtitle ? (
        <p className="admin-caption mt-1 pl-1.5">{subtitle}</p>
      ) : null}
      {trendLabel ? (
        <p className="mt-2 pl-1.5 text-xs font-semibold text-[var(--admin-success)]">
          {trendLabel}
        </p>
      ) : null}
      {sparkline && sparkline.length > 1 ? (
        <div className="pl-1.5">
          <MiniSparkline values={sparkline} />
        </div>
      ) : null}
      {lastUpdated ? (
        <p className="admin-meta mt-2 pl-1.5">Updated {lastUpdated}</p>
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {body}
      </button>
    );
  }

  return <article className={className}>{body}</article>;
}
