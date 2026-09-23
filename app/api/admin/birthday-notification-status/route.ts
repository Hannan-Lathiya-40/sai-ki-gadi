import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { hasAdminSession } from "@/lib/admin-session";
import {
  serviceRoleConfigIssue,
  supabaseAdmin,
  usingServiceRole,
} from "@/lib/supabase-admin";

function getKolkataDateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * Real status for Birthday Notifications admin card (no fake metrics).
 */
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

  try {
    const dateKey = getKolkataDateKey();

    const [settingsRes, birthdayUsersRes, logsRes] = await Promise.all([
      supabaseAdmin
        .from("birthday_notification_settings")
        .select("enabled, send_time, updated_at")
        .eq("id", 1)
        .maybeSingle(),
      supabaseAdmin.rpc("list_users_with_birthday_on", { p_date: dateKey }),
      supabaseAdmin
        .from("birthday_notification_logs")
        .select(
          "id, birthday_user_id, status, sent_at, scheduled_key, created_at",
        )
        .eq("birthday_date", dateKey)
        .eq("scheduled_key", "scheduled")
        .order("created_at", { ascending: false }),
    ]);

    if (settingsRes.error) {
      return NextResponse.json(
        { ok: false, error: settingsRes.error.message },
        { status: 500 },
      );
    }

    const todayBirthdayCount = Array.isArray(birthdayUsersRes.data)
      ? birthdayUsersRes.data.length
      : 0;

    const logs = logsRes.data ?? [];
    const successCount = logs.filter((l) => l.status === "success").length;
    const failureCount = logs.filter((l) => l.status === "failure").length;
    const pendingCount = logs.filter((l) => l.status === "pending").length;

    const lastSuccess = logs.find((l) => l.status === "success" && l.sent_at);

    return NextResponse.json({
      ok: true,
      timezone: "Asia/Kolkata",
      date: dateKey,
      settings: settingsRes.data ?? null,
      todayBirthdayCount,
      birthdayUsersError: birthdayUsersRes.error?.message ?? null,
      logsError: logsRes.error?.message ?? null,
      processed: {
        success: successCount,
        failure: failureCount,
        pending: pendingCount,
        totalLogged: logs.length,
      },
      lastScheduledSuccessAt: lastSuccess?.sent_at ?? null,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Something went wrong" },
      { status: 500 },
    );
  }
}
