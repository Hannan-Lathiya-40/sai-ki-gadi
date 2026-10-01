import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { hasAdminSession } from "@/lib/admin-session";
import {
  serviceRoleConfigIssue,
  supabaseAdmin,
  usingServiceRole,
} from "@/lib/supabase-admin";

type Body = {
  overrideId?: string;
  reason?: string;
};

export async function POST(request: Request) {
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

  const body = (await request.json().catch(() => ({}))) as Body;
  const overrideId = body.overrideId?.trim() ?? "";
  if (!overrideId) {
    return NextResponse.json(
      { ok: false, error: "overrideId is required." },
      { status: 400 },
    );
  }

  const { data, error } = await supabaseAdmin.rpc("revoke_user_fare_override", {
    p_override_id: overrideId,
    p_revoked_by: "admin",
    p_reason: body.reason?.trim() || null,
  });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, data });
}
