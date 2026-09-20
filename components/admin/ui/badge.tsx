import type { ReactNode } from "react";

type Tone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "accent";

const toneClass: Record<Tone, string> = {
  neutral: "admin-badge admin-badge-neutral",
  success: "admin-badge admin-badge-success",
  warning: "admin-badge admin-badge-warning",
  danger: "admin-badge admin-badge-danger",
  info: "admin-badge admin-badge-info",
  accent: "admin-badge admin-badge-accent",
};

export function AdminBadge({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`${toneClass[tone]} ${className}`.trim()}>{children}</span>
  );
}

const STATUS_TONE: Record<string, Tone> = {
  verified: "success",
  approved: "success",
  active: "success",
  resolved: "success",
  pending: "warning",
  partial: "warning",
  rejected: "danger",
  inactive: "neutral",
  fraud: "danger",
  regular: "neutral",
  silver: "info",
  gold: "warning",
  platinum: "accent",
  diamond: "accent",
};

export function StatusBadge({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  const key = status.trim().toLowerCase();
  const tone = STATUS_TONE[key] ?? "neutral";
  return <AdminBadge tone={tone}>{label ?? status}</AdminBadge>;
}
