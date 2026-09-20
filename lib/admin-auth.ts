import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "merigaadi_admin_session";

const SESSION_MAX_AGE_MS = 60 * 60 * 24 * 7 * 1000;

/** Prefer env in production. Hardcoded fallback is documented as a known risk. */
export function getAdminUsername(): string {
  return process.env.ADMIN_USERNAME?.trim() || "admin";
}

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? "12345678";
}

function getSessionSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.ADMIN_PASSWORD?.trim() ||
    "merigaadi-dev-session-secret-change-me"
  );
}

/** @deprecated Use getAdminUsername() — kept for any residual imports. */
export const ADMIN_USERNAME = getAdminUsername();

/** @deprecated Use getAdminPassword() — kept for any residual imports. */
export const ADMIN_PASSWORD = getAdminPassword();

export function createAdminSessionValue(): string {
  const exp = Date.now() + SESSION_MAX_AGE_MS;
  const payload = Buffer.from(
    JSON.stringify({ role: "admin", exp }),
    "utf8",
  ).toString("base64url");
  const sig = createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

export function isValidAdminSessionValue(value: string | undefined): boolean {
  if (!value) return false;

  const parts = value.split(".");
  if (parts.length !== 2) return false;

  const [payload, sig] = parts;
  if (!payload || !sig) return false;

  const expected = createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url");

  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }

  try {
    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { role?: string; exp?: number };
    if (data.role !== "admin") return false;
    if (typeof data.exp !== "number" || Date.now() > data.exp) return false;
  } catch {
    return false;
  }

  return true;
}

export const ADMIN_SESSION_MAX_AGE_SECONDS = SESSION_MAX_AGE_MS / 1000;
