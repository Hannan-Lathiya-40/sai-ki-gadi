type Point = { label: string; value: number };

export function SimpleBarChart({
  title,
  points,
  emptyLabel = "No data available",
}: {
  title: string;
  points: Point[];
  emptyLabel?: string;
}) {
  const max = Math.max(...points.map((p) => p.value), 1);

  return (
    <section className="admin-card h-full p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="admin-section-title">{title}</h3>
      </div>
      {points.length === 0 ? (
        <p className="admin-caption py-10 text-center">{emptyLabel}</p>
      ) : (
        <div className="flex h-44 items-end gap-1.5 border-b border-[var(--admin-border)] pb-1">
          {points.map((p) => (
            <div
              key={p.label}
              className="group relative flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
            >
              <span className="pointer-events-none absolute -top-6 hidden rounded bg-[var(--admin-primary)] px-1.5 py-0.5 text-[10px] font-semibold text-white group-hover:block">
                {p.value}
              </span>
              <div
                className="w-full rounded-t-[3px] bg-[var(--admin-primary)]/85 transition-opacity group-hover:opacity-100"
                style={{
                  height: `${Math.max(4, (p.value / max) * 100)}%`,
                  opacity: 0.85,
                }}
              />
              <span className="w-full truncate text-center text-[10px] text-[var(--admin-text-faint)]">
                {p.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function SimpleDonutChart({
  title,
  slices,
  emptyLabel = "No data available",
}: {
  title: string;
  slices: { label: string; value: number; color: string }[];
  emptyLabel?: string;
}) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const radius = 36;
  const circumference = 2 * Math.PI * radius;

  const arcs = slices.reduce<
    { label: string; color: string; dash: string; offset: number }[]
  >((acc, slice) => {
    const len = total === 0 ? 0 : (slice.value / total) * circumference;
    const offset = acc.reduce((sum, item) => {
      const match = /^([\d.]+)/.exec(item.dash);
      return sum + (match ? Number(match[1]) : 0);
    }, 0);
    return [
      ...acc,
      {
        label: slice.label,
        color: slice.color,
        dash: `${len} ${circumference - len}`,
        offset,
      },
    ];
  }, []);

  return (
    <section className="admin-card h-full p-4 sm:p-5">
      <h3 className="admin-section-title mb-4">{title}</h3>
      {total === 0 ? (
        <p className="admin-caption py-10 text-center">{emptyLabel}</p>
      ) : (
        <div className="flex items-center gap-5">
          <svg viewBox="0 0 100 100" className="h-32 w-32 shrink-0">
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="var(--admin-border)"
              strokeWidth="10"
            />
            {arcs.map((arc) => (
              <circle
                key={arc.label}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={arc.color}
                strokeWidth="10"
                strokeDasharray={arc.dash}
                strokeDashoffset={-arc.offset}
                strokeLinecap="butt"
                transform="rotate(-90 50 50)"
              />
            ))}
            <text
              x="50"
              y="50"
              textAnchor="middle"
              dominantBaseline="central"
              fill="var(--admin-text)"
              style={{ fontSize: "14px", fontWeight: 650 }}
            >
              {total}
            </text>
          </svg>
          <ul className="min-w-0 flex-1 space-y-2 text-xs">
            {slices.map((s) => (
              <li key={s.label} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: s.color }}
                />
                <span className="truncate text-[var(--admin-text-secondary)]">
                  {s.label}
                </span>
                <span className="ml-auto font-semibold tabular-nums text-[var(--admin-text)]">
                  {s.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
