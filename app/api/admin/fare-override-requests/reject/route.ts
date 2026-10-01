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
  rejectionReason?: string;
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
  const requestId = body.requestId?.trim() ?? "";
  if (!requestId) {
    return NextResponse.json(
      { ok: false, error: "requestId is required." },
      { status: 400 },
    );
  }

  const { data, error } = await supabaseAdmin.rpc(
    "reject_fare_override_request",
    {
      p_request_id: requestId,
      p_reviewed_by: "admin",
      p_rejection_reason: body.rejectionReason?.trim() || null,
    },
  );

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, data });
}
