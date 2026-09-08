export const ADMIN_FONT_SIZE_STORAGE_KEY = "adminFontSize";

export type AdminFontSize = "normal" | "medium" | "large";

export const ADMIN_FONT_SIZE_OPTIONS: ReadonlyArray<{
  value: AdminFontSize;
  label: string;
  ariaLabel: string;
  /** CSS font-size on html; empty string means browser default (unused for A+). */
  scale: string;
}> = [
  {
    value: "normal",
    label: "A+",
    ariaLabel: "Set normal font size",
    scale: "105%",
  },
  {
    value: "medium",
    label: "A++",
    ariaLabel: "Set medium font size",
    scale: "118%",
  },
  {
    value: "large",
    label: "A+++",
    ariaLabel: "Set large font size",
    scale: "130%",
  },
];

export function isAdminFontSize(value: unknown): value is AdminFontSize {
  return value === "normal" || value === "medium" || value === "large";
}

export function readStoredAdminFontSize(): AdminFontSize {
  try {
    const stored = window.localStorage.getItem(ADMIN_FONT_SIZE_STORAGE_KEY);
    if (isAdminFontSize(stored)) return stored;
  } catch {
    // Ignore storage access errors (private mode, blocked storage, etc.).
  }
  return "normal";
}

export function applyAdminFontSize(size: AdminFontSize): void {
  const option = ADMIN_FONT_SIZE_OPTIONS.find((item) => item.value === size);
  const scale = option?.scale ?? "105%";

  document.documentElement.setAttribute("data-admin-font-size", size);
  document.documentElement.style.fontSize = scale;
}

export function clearAdminFontSize(): void {
  document.documentElement.removeAttribute("data-admin-font-size");
  document.documentElement.style.removeProperty("font-size");
}

export function persistAdminFontSize(size: AdminFontSize): void {
  try {
    window.localStorage.setItem(ADMIN_FONT_SIZE_STORAGE_KEY, size);
  } catch {
    // Ignore storage write errors.
  }
}

/** Inline bootstrap script — runs before paint to avoid font-size flash. */
export const ADMIN_FONT_SIZE_BOOTSTRAP_SCRIPT = `(function(){try{var k=${JSON.stringify(
  ADMIN_FONT_SIZE_STORAGE_KEY,
)};var v=localStorage.getItem(k);if(v!=="medium"&&v!=="large"){v="normal";}var s=v==="large"?"130%":v==="medium"?"118%":"105%";document.documentElement.setAttribute("data-admin-font-size",v);document.documentElement.style.fontSize=s;}catch(e){}})();`;
