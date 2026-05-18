import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log(body);
    const { error } = await supabaseAdmin
      .from("winners")
      .insert({
        user_id: body.user_id,
        date: body.date,
        slot: body.slot,
        image: body.image,
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