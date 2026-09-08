import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/in-app-announcements/admin-api";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Ctx) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const { data: source, error } = await auth.supabase
    .from("in_app_announcements")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !source) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? "Announcement not found" },
      { status: 404 },
    );
  }

  const {
    id: _id,
    created_at: _c,
    updated_at: _u,
    published_at: _p,
    archived_at: _a,
    ...rest
  } = source;

  const { data, error: insertError } = await auth.supabase
    .from("in_app_announcements")
    .insert({
      ...rest,
      internal_name: `${source.internal_name} (Copy)`,
      status: "draft",
      published_at: null,
      archived_at: null,
    })
    .select("*")
    .single();

  if (insertError) {
    return NextResponse.json(
      { ok: false, error: insertError.message },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, item: data });
}
