import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { hasAdminSession } from "@/lib/admin-session";
import {
  serviceRoleConfigIssue,
  supabaseAdmin,
  usingServiceRole,
} from "@/lib/supabase-admin";

/** Lightweight counts for dashboard cards — avoids loading full tables. */
export async function GET() {
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

  const [
    rulesTotal,
    rulesActive,
    pendingRequests,
    activeOverrides,
    expiredOverrides,
  ] = await Promise.all([
    supabaseAdmin
      .from("route_minimum_fares")
      .select("id", { count: "exact", head: true }),
    supabaseAdmin
      .from("route_minimum_fares")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabaseAdmin
      .from("fare_override_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabaseAdmin
      .from("user_fare_overrides")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved"),
    supabaseAdmin
      .from("user_fare_overrides")
      .select("id", { count: "exact", head: true })
      .eq("status", "expired"),
  ]);

  return NextResponse.json({
    ok: true,
    data: {
      minimumFareRules: rulesTotal.count ?? 0,
      activeRules: rulesActive.count ?? 0,
      pendingFareRequests: pendingRequests.count ?? 0,
      activeUserOverrides: activeOverrides.count ?? 0,
      expiredOverrides: expiredOverrides.count ?? 0,
    },
  });
}
