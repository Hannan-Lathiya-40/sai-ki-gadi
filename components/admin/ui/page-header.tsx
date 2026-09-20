import type { ReactNode } from "react";

export function PageHeader({
  eyebrow = "SAI KI GADI • ADMIN",
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="admin-card mb-5 px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="admin-eyebrow">{eyebrow}</p>
          <h1 className="admin-page-title mt-1.5">{title}</h1>
          {description ? (
            <p className="admin-caption mt-1.5 max-w-2xl">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--admin-border)] bg-[var(--admin-surface-muted)] text-[var(--admin-text-muted)]">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          aria-hidden
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-[var(--admin-text)]">{title}</p>
      {description ? (
        <p className="admin-caption mt-1 max-w-sm">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this data right now.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="admin-card border-[var(--admin-danger-border)] bg-[var(--admin-danger-soft)] px-5 py-4">
      <p className="text-sm font-semibold text-[var(--admin-danger)]">{title}</p>
      <p className="mt-1 text-sm text-[var(--admin-text-secondary)]">
        {description}
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="admin-btn admin-btn-secondary mt-3"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
