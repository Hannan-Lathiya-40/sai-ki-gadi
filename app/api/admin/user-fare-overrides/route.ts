import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { hasAdminSession } from "@/lib/admin-session";
import {
  serviceRoleConfigIssue,
  supabaseAdmin,
  usingServiceRole,
} from "@/lib/supabase-admin";

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url);
  const status = (searchParams.get("status") ?? "approved").trim();
  const q = (searchParams.get("q") ?? "").trim();
  const vehicle = (searchParams.get("vehicle") ?? "").trim();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number(searchParams.get("pageSize") ?? "30") || 30),
  );
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from("user_fare_overrides")
    .select(
      `
      id,
      user_id,
      from_city,
      from_state,
      to_city,
      to_state,
      vehicle_category,
      allowed_min_fare,
      status,
      starts_at,
      expires_at,
      approved_by,
      approved_at,
      request_id,
      revoked_at,
      revoked_by,
      created_at,
      updated_at,
      users!user_fare_overrides_user_id_fkey (
        id,
        first_name,
        last_name,
        phone
      )
    `,
      { count: "exact" },
    )
    .order("approved_at", { ascending: false })
    .range(from, to);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }
  if (vehicle) {
    query = query.ilike("vehicle_category", vehicle);
  }
  if (q) {
    const pattern = `%${q}%`;
    query = query.or(
      `from_city.ilike.${pattern},to_city.ilike.${pattern},vehicle_category.ilike.${pattern}`,
    );
  }

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 },
    );
  }

  const rows = data ?? [];

  // One query for active rules; match in memory (avoids N+1 RPCs).
  const { data: rules } = await supabaseAdmin
    .from("route_minimum_fares")
    .select(
      "from_city, from_state, to_city, to_state, vehicle_category, minimum_fare",
    )
    .eq("is_active", true)
    .limit(2000);

  const norm = (v: string | null | undefined) =>
    String(v ?? "")
      .trim()
      .toLowerCase();

  const enriched = rows.map((row) => {
    const vehicleHit = (rules ?? []).find(
      (r) =>
        r.vehicle_category &&
        norm(r.from_city) === norm(row.from_city) &&
        norm(r.from_state) === norm(row.from_state) &&
        norm(r.to_city) === norm(row.to_city) &&
        norm(r.to_state) === norm(row.to_state) &&
        norm(r.vehicle_category) === norm(row.vehicle_category),
    );
    const legacyHit = (rules ?? []).find(
      (r) =>
        !r.vehicle_category &&
        norm(r.from_city) === norm(row.from_city) &&
        norm(r.from_state) === norm(row.from_state) &&
        norm(r.to_city) === norm(row.to_city) &&
        norm(r.to_state) === norm(row.to_state),
    );
    const normal = vehicleHit?.minimum_fare ?? legacyHit?.minimum_fare ?? null;
    return {
      ...row,
      normal_min_fare: normal != null ? Number(normal) : null,
    };
  });

  return NextResponse.json({
    ok: true,
    data: enriched,
    total: count ?? 0,
    page,
    pageSize,
  });
}
