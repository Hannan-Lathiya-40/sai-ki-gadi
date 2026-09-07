import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

function normalizeMediaType(value: unknown): "image" | "video" {
  return value === "video" ? "video" : "image";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.image || typeof body.image !== "string" || !body.image.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Media URL is required",
        },
        {
          status: 400,
        },
      );
    }

    const { error } = await supabaseAdmin.from("winners").insert({
      user_id: body.user_id,
      date: body.date,
      slot: body.slot,
      image: body.image.trim(),
      media_type: normalizeMediaType(body.media_type),
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
      },
      {
        status: 500,
      },
    );
  }
}
