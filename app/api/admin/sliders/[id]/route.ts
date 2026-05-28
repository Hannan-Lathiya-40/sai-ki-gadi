import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

type Params = {
  params: {
    id: string;
  };
};

export async function PUT(
  req: Request,
  { params }: Params,
) {
  try {
    const body = await req.json();

    const { image, status } = body;

    const { data, error } =
      await supabaseAdmin
        .from("sliders")
        .update({
          image,
          status,
        })
        .eq("id", params.id)
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

export async function DELETE(
  req: Request,
  { params }: Params,
) {
  try {
    const { error } =
      await supabaseAdmin
        .from("sliders")
        .delete()
        .eq("id", params.id);

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