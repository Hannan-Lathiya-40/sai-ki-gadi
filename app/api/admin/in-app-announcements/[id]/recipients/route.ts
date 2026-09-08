import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/in-app-announcements/admin-api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const { data, error } = await auth.supabase
    .from("in_app_announcement_recipients")
    .select(
      `
      user_id,
      created_at,
      users:user_id (
        id,
        first_name,
        last_name,
        phone,
        membership_type
      )
    `,
    )
    .eq("announcement_id", id)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, recipients: data ?? [] });
}

export async function PUT(request: Request, context: Ctx) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const body = await request.json();
  const userIds = Array.isArray(body.userIds)
    ? (body.userIds as unknown[]).filter(
        (x): x is string => typeof x === "string" && x.length > 0,
      )
    : [];

  // Replace selection atomically for this announcement
  const { error: delError } = await auth.supabase
    .from("in_app_announcement_recipients")
    .delete()
    .eq("announcement_id", id);

  if (delError) {
    return NextResponse.json(
      { ok: false, error: delError.message },
      { status: 400 },
    );
  }

  if (userIds.length === 0) {
    return NextResponse.json({ ok: true, count: 0 });
  }

  const rows = userIds.map((user_id) => ({
    announcement_id: id,
    user_id,
  }));

  const { error: insError } = await auth.supabase
    .from("in_app_announcement_recipients")
    .insert(rows);

  if (insError) {
    return NextResponse.json(
      { ok: false, error: insError.message },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, count: userIds.length });
}
