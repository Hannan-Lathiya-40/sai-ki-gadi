import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { hasAdminSession } from "@/lib/admin-session";
import { supabaseAdmin } from "@/lib/supabase-admin";

type VerifyPayload = {
  userId?: string;
};

export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (!hasAdminSession(cookieStore)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as VerifyPayload;
  const userId = body.userId?.trim() ?? "";
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Invalid request payload." },
      { status: 400 },
    );
  }

  const { error } = await supabaseAdmin
    .from("users")
    .update({
      verified: true,
      verification_status: "approved",
    })
    .eq("id", userId);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
