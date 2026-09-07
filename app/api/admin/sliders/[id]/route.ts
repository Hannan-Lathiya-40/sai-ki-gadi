import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

function normalizeMediaType(value: unknown): "image" | "video" {
  return value === "video" ? "video" : "image";
}

export async function PUT(req: NextRequest, context: Context) {
  try {
    const body = await req.json();

    const { image, status, display_order, media_type } = body;

    if (!image || typeof image !== "string" || !image.trim()) {
      return NextResponse.json(
        {
          error: "Media URL is required",
        },
        {
          status: 400,
        },
      );
    }

    const { id } = await context.params;

    const { data, error } = await supabaseAdmin
      .from("sliders")
      .update({
        image: image.trim(),
        status,
        display_order,
        media_type: normalizeMediaType(media_type),
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
