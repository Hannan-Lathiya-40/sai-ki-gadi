import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { hasAdminSession } from "@/lib/admin-session";
import {
  serviceRoleConfigIssue,
  supabaseAdmin,
  usingServiceRole,
} from "@/lib/supabase-admin";

type Body = {
  from_city?: string;
  from_state?: string;
  to_city?: string;
  to_state?: string;
  minimum_fare?: number | string;
  is_active?: boolean;
};

function normalizePart(value: string): string {
  return value.trim();
}

function validateBody(body: Body): {
  ok: true;
  row: {
    from_city: string;
    from_state: string;
    to_city: string;
    to_state: string;
    minimum_fare: number;
    is_active: boolean;
  };
} | { ok: false; error: string } {
  const from_city = normalizePart(body.from_city ?? "");
  const from_state = normalizePart(body.from_state ?? "");
  const to_city = normalizePart(body.to_city ?? "");
  const to_state = normalizePart(body.to_state ?? "");
  const fareRaw = body.minimum_fare;
  const minimum_fare =
    typeof fareRaw === "number" ? fareRaw : Number(String(fareRaw ?? "").trim());

  if (!from_city || !from_state || !to_city || !to_state) {
    return { ok: false, error: "From/To city and state are required." };
  }
  if (
    from_city.toLowerCase() === to_city.toLowerCase() &&
    from_state.toLowerCase() === to_state.toLowerCase()
  ) {
    return {
      ok: false,
      error: "From and To cannot be the same city and state.",
    };
  }
  if (!Number.isFinite(minimum_fare) || minimum_fare <= 0) {
    return { ok: false, error: "Minimum fare must be a number greater than 0." };
  }

  return {
    ok: true,
    row: {
      from_city,
      from_state,
      to_city,
      to_state,
      minimum_fare,
      is_active: body.is_active !== false,
    },
  };
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (!hasAdminSession(cookieStore)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }
  if (!usingServiceRole) {
    return NextResponse.json(
      {
        ok: false,
        error:
          serviceRoleConfigIssue() ??
          "Server-only SUPABASE_SERVICE_ROLE_KEY is required.",
      },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as Body;
  const validated = validateBody(body);
  if (!validated.ok) {
    return NextResponse.json(
      { ok: false, error: validated.error },
      { status: 400 },
    );
  }

  const { data, error } = await supabaseAdmin
    .from("route_minimum_fares")
    .insert(validated.row)
    .select("*")
    .single();

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("duplicate") || msg.includes("unique")) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "An equivalent route rule already exists (case/whitespace-insensitive).",
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, data });
}
