import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { hasAdminSession } from "@/lib/admin-session";
import {
  serviceRoleConfigIssue,
  supabaseAdmin,
  usingServiceRole,
} from "@/lib/supabase-admin";

type Body = {
  requestId?: string;
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
          "Server-only SUPABASE_SERVICE_ROLE_KEY is required to reject requests.",
      },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as Body;
  const requestId = body.requestId?.trim() ?? "";
  const reason = body.reason?.trim() ?? "";
  if (!requestId) {
    return NextResponse.json(
      { ok: false, error: "Invalid request payload." },
      { status: 400 },
    );
  }
  if (!reason) {
    return NextResponse.json(
      { ok: false, error: "Rejection reason is required." },
      { status: 400 },
    );
  }

  const { error } = await supabaseAdmin.rpc("reject_profile_change_request", {
    p_request_id: requestId,
    p_rejection_reason: reason,
    p_reviewed_by: "admin",
  });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
