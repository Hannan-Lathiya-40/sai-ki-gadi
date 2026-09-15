import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { hasAdminSession } from "@/lib/admin-session";
import {
  serviceRoleConfigIssue,
  supabaseAdmin,
  usingServiceRole,
} from "@/lib/supabase-admin";

export type LuckyDrawNotificationSettings = {
  id: number;
  enabled: boolean;
  slots: string[];
  updated_at: string | null;
};

/** Fixed daily slots admins may enable (Asia/Kolkata HH:MM). */
export const LUCKY_DRAW_ALLOWED_SLOTS = [
  "10:00",
  "14:00",
  "18:00",
  "21:00",
] as const;

function unauthorized() {
  return NextResponse.json(
    { ok: false, error: "Unauthorized" },
    { status: 401 },
  );
}

function serviceUnavailable() {
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

async function requireAdmin() {
  const cookieStore = await cookies();
  if (!hasAdminSession(cookieStore)) {
    return { ok: false as const, response: unauthorized() };
  }
  if (!usingServiceRole) {
    return { ok: false as const, response: serviceUnavailable() };
  }
  return { ok: true as const };
}

function normalizeSlots(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null;
  const allowed = new Set<string>(LUCKY_DRAW_ALLOWED_SLOTS);
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const slot = raw.trim();
    if (!allowed.has(slot)) continue;
    if (!out.includes(slot)) out.push(slot);
  }
  out.sort();
  if (out.length < 3 || out.length > 4) return null;
  return out;
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { data, error } = await supabaseAdmin
      .from("lucky_draw_notification_settings")
      .select("id, enabled, slots, updated_at")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Lucky Draw notification settings not found. Apply migration 050_lucky_draw_notifications.sql.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      settings: data as LuckyDrawNotificationSettings,
      allowedSlots: LUCKY_DRAW_ALLOWED_SLOTS,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Something went wrong" },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const enabled = body.enabled === true;
    const slots = normalizeSlots(body.slots);

    if (!slots) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Select 3 or 4 notification times from: 10:00 AM, 02:00 PM, 06:00 PM, 09:00 PM.",
        },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("lucky_draw_notification_settings")
      .upsert(
        {
          id: 1,
          enabled,
          slots,
        },
        { onConflict: "id" },
      )
      .select("id, enabled, slots, updated_at")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      settings: data as LuckyDrawNotificationSettings,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Something went wrong" },
      { status: 500 },
    );
  }
}
