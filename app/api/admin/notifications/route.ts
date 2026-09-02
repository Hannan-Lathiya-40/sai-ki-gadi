import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { hasAdminSession } from "@/lib/admin-session";
import {
  serviceRoleConfigIssue,
  supabaseAdmin,
  usingServiceRole,
} from "@/lib/supabase-admin";

export type AdminNotificationRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  user_id: string | null;
  is_read: boolean;
  created_at: string;
};

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

  const { data, error } = await supabaseAdmin
    .from("admin_notifications")
    .select("id, type, title, message, user_id, is_read, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 },
    );
  }

  const notifications = (data ?? []) as AdminNotificationRow[];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return NextResponse.json({
    ok: true,
    notifications,
    unreadCount,
  });
}

type PatchBody = {
  ids?: string[];
  markAllRead?: boolean;
};

export async function PATCH(request: Request) {
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

  const body = (await request.json().catch(() => ({}))) as PatchBody;

  let query = supabaseAdmin
    .from("admin_notifications")
    .update({ is_read: true })
    .eq("is_read", false);

  if (body.markAllRead) {
    // all unread
  } else if (Array.isArray(body.ids) && body.ids.length > 0) {
    query = query.in("id", body.ids);
  } else {
    return NextResponse.json(
      { ok: false, error: "Provide ids or markAllRead." },
      { status: 400 },
    );
  }

  const { error } = await query;
  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
