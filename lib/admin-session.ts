import {
  ADMIN_SESSION_COOKIE,
  isValidAdminSessionValue,
} from "./admin-auth";

export function isAdminSessionCookieValue(value: string | undefined): boolean {
  return isValidAdminSessionValue(value);
}

type CookieReader = {
  get: (name: string) => { value?: string } | undefined;
};

export function hasAdminSession(cookies: CookieReader): boolean {
  return isAdminSessionCookieValue(cookies.get(ADMIN_SESSION_COOKIE)?.value);
}
