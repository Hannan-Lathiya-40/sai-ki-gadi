import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { hasAdminSession } from "@/lib/admin-session";
import {
  serviceRoleConfigIssue,
  supabaseAdmin,
  usingServiceRole,
} from "@/lib/supabase-admin";

type Context = {
  params: Promise<{ id: string }>;
};

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

export async function PUT(request: Request, context: Context) {
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

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Body;

  const from_city = normalizePart(body.from_city ?? "");
  const from_state = normalizePart(body.from_state ?? "");
  const to_city = normalizePart(body.to_city ?? "");
  const to_state = normalizePart(body.to_state ?? "");
  const fareRaw = body.minimum_fare;
  const minimum_fare =
    typeof fareRaw === "number" ? fareRaw : Number(String(fareRaw ?? "").trim());

  if (!from_city || !from_state || !to_city || !to_state) {
    return NextResponse.json(
      { ok: false, error: "From/To city and state are required." },
      { status: 400 },
    );
  }
  if (
    from_city.toLowerCase() === to_city.toLowerCase() &&
    from_state.toLowerCase() === to_state.toLowerCase()
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "From and To cannot be the same city and state.",
      },
      { status: 400 },
    );
  }
  if (!Number.isFinite(minimum_fare) || minimum_fare <= 0) {
    return NextResponse.json(
      { ok: false, error: "Minimum fare must be a number greater than 0." },
      { status: 400 },
    );
  }

  const { data, error } = await supabaseAdmin
    .from("route_minimum_fares")
    .update({
      from_city,
      from_state,
      to_city,
      to_state,
      minimum_fare,
      is_active: body.is_active !== false,
    })
    .eq("id", id)
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

export async function PATCH(request: Request, context: Context) {
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

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    is_active?: boolean;
  };

  if (typeof body.is_active !== "boolean") {
    return NextResponse.json(
      { ok: false, error: "is_active boolean is required." },
      { status: 400 },
    );
  }

  const { data, error } = await supabaseAdmin
    .from("route_minimum_fares")
    .update({ is_active: body.is_active })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, data });
}

export async function DELETE(_request: Request, context: Context) {
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

  const { id } = await context.params;
  const { error } = await supabaseAdmin
    .from("route_minimum_fares")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
