import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "success"
  | "icon";

const variantClass: Record<Variant, string> = {
  primary: "admin-btn admin-btn-primary",
  secondary: "admin-btn admin-btn-secondary",
  ghost: "admin-btn admin-btn-ghost",
  danger: "admin-btn admin-btn-danger",
  success: "admin-btn admin-btn-success",
  icon: "admin-btn admin-btn-secondary admin-btn-icon",
};

type AdminButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
  children: ReactNode;
};

export function AdminButton({
  variant = "secondary",
  loading = false,
  disabled,
  children,
  className = "",
  ...props
}: AdminButtonProps) {
  return (
    <button
      type="button"
      className={`${variantClass[variant]} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <span
          className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"
          aria-hidden
        />
      ) : null}
      {children}
    </button>
  );
}
