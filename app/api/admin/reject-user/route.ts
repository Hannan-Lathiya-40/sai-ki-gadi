import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(
  request: Request,
) {
  try {
    const { userId } =
      await request.json();

    const { error } =
      await supabaseAdmin
        .from("users")
        .update({
          verification_status:
            "rejected",
        })
        .eq("id", userId);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      ok: true,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Something went wrong",
      },
      {
        status: 500,
      },
    );
  }
}