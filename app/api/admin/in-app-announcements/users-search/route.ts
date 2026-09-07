import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/in-app-announcements/admin-api";

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const membership = searchParams.get("membership") ?? "all";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(50, Math.max(10, Number(searchParams.get("pageSize") ?? 20)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = auth.supabase
    .from("users")
    .select(
      "id, first_name, last_name, phone, email, membership_type, verified, status",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (q) {
    query = query.or(
      `first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%,id.eq.${q}`,
    );
  }

  if (membership !== "all") {
    query = query.eq("membership_type", membership);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 },
    );
  }

  const users = (data ?? []).map((u) => ({
    id: u.id,
    fullName: `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || "—",
    phone: u.phone ?? "—",
    email: u.email ?? "—",
    membership_type: u.membership_type ?? "user",
    verified: Boolean(u.verified),
    status: u.status ?? true,
  }));

  return NextResponse.json({
    ok: true,
    users,
    page,
    pageSize,
    total: count ?? 0,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
  });
}
