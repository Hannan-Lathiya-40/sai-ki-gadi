import { requireAdminApi } from "@/lib/admin-api";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const __adminGate = await requireAdminApi();
  if (!__adminGate.ok) return __adminGate.response;

  try {
    const body = await request.json();

    const { from_user_id, to_user_id, reason, description } = body;

    const { data, error } = await supabaseAdmin
      .from("fraud_reports")
      .insert({
        from_user_id,
        to_user_id,
        reason,
        description,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
