import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { hasAdminSession } from "@/lib/admin-session";
import {
  serviceRoleConfigIssue,
  supabaseAdmin,
  usingServiceRole,
} from "@/lib/supabase-admin";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: Context) {
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

  const { id } = await context.params;
  const { data, error } = await supabaseAdmin
    .from("fare_override_requests")
    .select(
      `
      id,
      user_id,
      from_city,
      from_state,
      to_city,
      to_state,
      vehicle_category,
      normal_min_fare,
      requested_fare,
      reason,
      status,
      rejection_reason,
      reviewed_at,
      reviewed_by,
      created_at,
      updated_at,
      users!fare_override_requests_user_id_fkey (
        id,
        first_name,
        last_name,
        phone
      )
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 },
    );
  }
  if (!data) {
    return NextResponse.json(
      { ok: false, error: "Request not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, data });
}
