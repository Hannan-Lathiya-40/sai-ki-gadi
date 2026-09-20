import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { hasAdminSession } from "@/lib/admin-session";
import {
  serviceRoleConfigIssue,
  supabaseAdmin,
  usingServiceRole,
} from "@/lib/supabase-admin";

/**
 * Shared gate for all `/api/admin/*` routes (except login).
 * Requires a valid admin session cookie and server-side service role.
 */
export async function requireAdminApi() {
  const cookieStore = await cookies();
  if (!hasAdminSession(cookieStore)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      ),
    };
  }

  if (!usingServiceRole) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          ok: false,
          error:
            serviceRoleConfigIssue() ??
            "Server-only SUPABASE_SERVICE_ROLE_KEY is required.",
        },
        { status: 503 },
      ),
    };
  }

  return { ok: true as const, supabase: supabaseAdmin };
}

export function safeErrorMessage(error: unknown, fallback: string): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    const message = (error as { message: string }).message;
    // Avoid leaking raw Postgres/RLS internals to the admin UI.
    if (/permission denied|rls|jwt|service.role/i.test(message)) {
      return fallback;
    }
    return message;
  }
  return fallback;
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { ok: false, error: "Unauthorized" },
    { status: 401 },
  );
}
