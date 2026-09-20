import { requireAdminApi } from "@/lib/admin-api";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export async function DELETE(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  const __adminGate = await requireAdminApi();
  if (!__adminGate.ok) return __adminGate.response;

  try {
    const { id } = await context.params;

    const { error } = await supabaseAdmin.from("cities").delete().eq("id", id);

    if (error) {
      console.error(error);

      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      {
        status: 500,
      },
    );
  }
}
