import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

function normalizeMediaType(value: unknown): "image" | "video" {
  return value === "video" ? "video" : "image";
}

export async function POST(req: Request) {
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

    const { data, error } = await supabaseAdmin
      .from("sliders")
      .insert({
        image: image.trim(),
        status,
        display_order,
        media_type: normalizeMediaType(media_type),
      })
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
