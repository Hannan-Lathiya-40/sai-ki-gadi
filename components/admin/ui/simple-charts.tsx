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
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {points.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">{emptyLabel}</p>
      ) : (
        <div className="mt-4 flex h-40 items-end gap-1.5">
          {points.map((p) => (
            <div
              key={p.label}
              className="flex min-w-0 flex-1 flex-col items-center gap-1"
              title={`${p.label}: ${p.value}`}
            >
              <span className="text-[10px] font-semibold tabular-nums text-slate-600">
                {p.value}
              </span>
              <div
                className="w-full rounded-t bg-slate-800/90"
                style={{ height: `${Math.max(4, (p.value / max) * 100)}%` }}
              />
              <span className="w-full truncate text-center text-[10px] text-slate-500">
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
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {total === 0 ? (
        <p className="mt-6 text-sm text-slate-500">{emptyLabel}</p>
      ) : (
        <div className="mt-3 flex items-center gap-4">
          <svg viewBox="0 0 100 100" className="h-28 w-28 shrink-0">
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="12"
            />
            {arcs.map((arc) => (
              <circle
                key={arc.label}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={arc.color}
                strokeWidth="12"
                strokeDasharray={arc.dash}
                strokeDashoffset={-arc.offset}
                transform="rotate(-90 50 50)"
              />
            ))}
            <text
              x="50"
              y="52"
              textAnchor="middle"
              className="fill-slate-900 text-[14px] font-bold"
            >
              {total}
            </text>
          </svg>
          <ul className="min-w-0 space-y-1.5 text-xs">
            {slices.map((s) => (
              <li key={s.label} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ background: s.color }}
                />
                <span className="truncate text-slate-600">{s.label}</span>
                <span className="ml-auto font-semibold tabular-nums text-slate-900">
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
