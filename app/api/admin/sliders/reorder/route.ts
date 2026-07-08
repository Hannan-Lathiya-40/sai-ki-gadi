import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function PUT(request: Request) {
  try {
    const { sliders } = await request.json();

    for (const slider of sliders) {
      const { error } = await supabaseAdmin
        .from("sliders")
        .update({
          display_order: slider.display_order,
        })
        .eq("id", slider.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Something went wrong",
      },
      {
        status: 500,
      },
    );
  }
}
