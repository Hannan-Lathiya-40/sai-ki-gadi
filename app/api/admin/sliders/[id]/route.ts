import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(req: NextRequest, context: Context) {
  try {
    const body = await req.json();

    const { image, status, display_order } = body;

    const { id } = await context.params;

    const { data, error } = await supabaseAdmin
      .from("sliders")
      .update({
        image,
        status,
        display_order,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
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

export async function DELETE(req: NextRequest, context: Context) {
  try {
    const { id } = await context.params;

    const { error } = await supabaseAdmin.from("sliders").delete().eq("id", id);

    if (error) {
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
