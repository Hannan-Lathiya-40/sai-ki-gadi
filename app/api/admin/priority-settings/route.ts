import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

/** Legacy column names: all_platinum=Diamond, all_gold=Gold, matching_platinum=Silver */
export type RequirementPrioritySettings = {
  id: number;
  matching_platinum_minutes: number;
  all_platinum_minutes: number;
  all_gold_minutes: number;
  updated_at: string;
};

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("requirement_priority_settings")
      .select(
        "id, matching_platinum_minutes, all_platinum_minutes, all_gold_minutes, updated_at",
      )
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        {
          error:
            "Priority settings row not found. Apply migration 027_requirement_priority_settings.sql.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(data as RequirementPrioritySettings);
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    const matching = Number(body.matching_platinum_minutes);
    const platinum = Number(body.all_platinum_minutes);
    const gold = Number(body.all_gold_minutes);

    if (
      ![matching, platinum, gold].every(
        (n) => Number.isInteger(n) && n > 0 && n <= 1440,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Each duration must be a whole number of minutes between 1 and 1440.",
        },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("requirement_priority_settings")
      .upsert(
        {
          id: 1,
          matching_platinum_minutes: matching,
          all_platinum_minutes: platinum,
          all_gold_minutes: gold,
        },
        { onConflict: "id" },
      )
      .select(
        "id, matching_platinum_minutes, all_platinum_minutes, all_gold_minutes, updated_at",
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
