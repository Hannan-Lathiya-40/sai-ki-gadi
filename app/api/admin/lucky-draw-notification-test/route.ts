import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { hasAdminSession } from "@/lib/admin-session";
import {
  serviceRoleConfigIssue,
  usingServiceRole,
} from "@/lib/supabase-admin";

/**
 * Admin-only proxy to force a Lucky Draw FCM send for today's winner.
 * Never exposes the service-role key to the browser.
 */
export async function POST() {
  const cookieStore = await cookies();
  if (!hasAdminSession(cookieStore)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  if (!usingServiceRole) {
    return NextResponse.json(
      {
        ok: false,
        error:
          serviceRoleConfigIssue() ??
          "Server-only SUPABASE_SERVICE_ROLE_KEY is required.",
      },
      { status: 503 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { ok: false, error: "Supabase server configuration is incomplete." },
      { status: 503 },
    );
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/send-lucky-draw-notification`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ force: true }),
      },
    );

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            (payload &&
              typeof payload === "object" &&
              "error" in payload &&
              typeof (payload as { error: unknown }).error === "string" &&
              (payload as { error: string }).error) ||
            `Edge function returned ${response.status}`,
        },
        { status: response.status >= 400 ? response.status : 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      result: payload,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to invoke Lucky Draw notification function." },
      { status: 502 },
    );
  }
}
