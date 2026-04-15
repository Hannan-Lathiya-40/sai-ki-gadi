import { ADMIN_SESSION_COOKIE } from "./admin-auth";

export function isAdminSessionCookieValue(value: string | undefined): boolean {
  return value === "1";
}

type CookieReader = {
  get: (name: string) => { value?: string } | undefined;
};

export function hasAdminSession(cookies: CookieReader): boolean {
  return isAdminSessionCookieValue(cookies.get(ADMIN_SESSION_COOKIE)?.value);
}
