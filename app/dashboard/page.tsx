import type { Metadata } from "next";

import { supabaseAdmin, usingServiceRole } from "@/lib/supabase-admin";

import { DashboardTabs } from "./dashboard-tabs";

export const metadata: Metadata = {
  title: "Dashboard | Sai ki Gadi Admin",
  description: "Admin dashboard for profile verification.",
};

export const dynamic = "force-dynamic";

type UserRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  membership_type: string | null;
  membership_started_at: string | null;
  membership_expires_at: string | null;
  membership_duration_days: number | null;
  verified: boolean | null;
  status: boolean | null;
  verification_status: string | null;
  created_at: string | null;
  welcome_completed: boolean | null;
  admin_remarks: string | null;
  last_active_at: string | null;
  rating_average: number | null;
  rating_count: number | null;
  requirement_count: number;
  exchange_count: number;
  availability_count: number;
  driver_requirement_count: number;
  total_posts: number;
};

type UserIdRow = {
  user_id: string;
};

function countByUserId(rows: UserIdRow[] | null | undefined): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows ?? []) {
    if (!row.user_id) continue;
    counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
  }
  return counts;
}

async function fetchAllUserIds(table: string): Promise<UserIdRow[]> {
  const pageSize = 1000;
  let from = 0;
  const all: UserIdRow[] = [];

  while (true) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select("user_id")
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`Unable to fetch ${table} owners: ${error.message}`);
    }

    const rows = (data ?? []) as UserIdRow[];
    all.push(...rows);

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return all;
}

type IdentityDocRow = {
  user_id: string;
  aadhaar_number?: string | null;
  aadhaar_uploaded?: boolean | null;
  pan_uploaded?: boolean | null;
  gst_uploaded?: boolean | null;
  aadhaar_file_path?: string | null;
  pan_file_path?: string | null;
  gst_file_path?: string | null;
  driving_license_front_path?: string | null;
  driving_license_back_path?: string | null;
  aadhaar_front_path?: string | null;
  aadhaar_back_path?: string | null;
};

// type MembershipCounts = {
//   user: number;
//   pro: number;
//   pro_plus: number;
// };

type MembershipCounts = {
  regular: number;
  silver: number;
  gold: number;
  platinum: number;
};

type PendingVerificationUser = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  membershipType: "regular" | "silver" | "gold" | "platinum";
};

function normalizeMembership(
  value: string | null,
): "regular" | "silver" | "gold" | "platinum" {
  if (
    value === "regular" ||
    value === "silver" ||
    value === "gold" ||
    value === "platinum"
  ) {
    return value;
  }

  return "regular";
}

function hasAnyUploadedDocs(row: IdentityDocRow): boolean {
  const modern =
    Boolean(row.driving_license_front_path) ||
    Boolean(row.driving_license_back_path) ||
    Boolean(row.aadhaar_front_path) ||
    Boolean(row.aadhaar_back_path);
  if (modern) return true;

  const flags =
    Boolean(row.aadhaar_uploaded) ||
    Boolean(row.pan_uploaded) ||
    Boolean(row.gst_uploaded);
  if (flags) return true;

  return Boolean(
    row.aadhaar_file_path || row.pan_file_path || row.gst_file_path,
  );
}

function hasAadhaarNumber(row: IdentityDocRow): boolean {
  return Boolean(row.aadhaar_number?.trim());
}

function hasAllRequiredDocs(row: IdentityDocRow): boolean {
  const modern =
    Boolean(row.driving_license_front_path) &&
    Boolean(row.driving_license_back_path) &&
    Boolean(row.aadhaar_front_path) &&
    Boolean(row.aadhaar_back_path);
  if (modern) return true;

  const legacyFlags =
    Boolean(row.aadhaar_uploaded) &&
    Boolean(row.pan_uploaded) &&
    Boolean(row.gst_uploaded);
  if (legacyFlags) return true;

  return Boolean(
    row.aadhaar_file_path && row.pan_file_path && row.gst_file_path,
  );
}

function fullNameOf(user: UserRow): string {
  const fromParts = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
  if (fromParts) return fromParts;
  if (user.email) return user.email;
  if (user.phone) return user.phone;
  return "Unknown user";
}

export default async function DashboardPage() {
  const [
    { data: users, error: usersError },
    docsResult,
    requirementOwnerIds,
    exchangeOwnerIds,
    availabilityOwnerIds,
    driverOwnerIds,
  ] = await Promise.all([
    supabaseAdmin
      .from("users")
      .select(
        "id, first_name, last_name, phone, email, membership_type,membership_started_at,membership_expires_at,membership_duration_days, verified, status, verification_status, created_at, welcome_completed, admin_remarks, last_active_at, rating_average, rating_count",
      ),
    (async () => {
      // Prefer current mobile schema columns.
      const modern = await supabaseAdmin
        .from("user_identity_documents")
        .select(
          "user_id, aadhaar_number, driving_license_front_path, driving_license_back_path, aadhaar_front_path, aadhaar_back_path",
        );
      if (!modern.error) return modern;

      // Fallback to schema.sql columns.
      return supabaseAdmin
        .from("user_identity_documents")
        .select(
          "user_id, aadhaar_number, aadhaar_uploaded, pan_uploaded, gst_uploaded, aadhaar_file_path, pan_file_path, gst_file_path",
        );
    })(),
    fetchAllUserIds("requirements"),
    fetchAllUserIds("exchange_listings"),
    fetchAllUserIds("cab_avail_listings"),
    fetchAllUserIds("driver_listings"),
  ]);
  const { data: docs, error: docsError } = docsResult;

  if (usersError) {
    throw new Error(`Unable to fetch users: ${usersError.message}`);
  }
  if (docsError) {
    throw new Error(
      `Unable to fetch verification documents: ${docsError.message}`,
    );
  }

  const requirementCounts = countByUserId(requirementOwnerIds);
  const exchangeCounts = countByUserId(exchangeOwnerIds);
  const availabilityCounts = countByUserId(availabilityOwnerIds);
  const driverCounts = countByUserId(driverOwnerIds);

  const allUsers: UserRow[] = (users ?? []).map((user) => {
    const requirement_count = requirementCounts.get(user.id) ?? 0;
    const exchange_count = exchangeCounts.get(user.id) ?? 0;
    const availability_count = availabilityCounts.get(user.id) ?? 0;
    const driver_requirement_count = driverCounts.get(user.id) ?? 0;

    return {
      ...user,
      welcome_completed: user.welcome_completed ?? false,
      admin_remarks: user.admin_remarks ?? null,
      last_active_at: user.last_active_at ?? null,
      rating_average: user.rating_average ?? null,
      rating_count: user.rating_count ?? null,
      requirement_count,
      exchange_count,
      availability_count,
      driver_requirement_count,
      total_posts:
        requirement_count +
        exchange_count +
        availability_count +
        driver_requirement_count,
    };
  });
  const allDocs: IdentityDocRow[] = docs ?? [];

  const membership: MembershipCounts = {
    regular: 0,
    silver: 0,
    gold: 0,
    platinum: 0,
  };
  let verifiedCount = 0;
  let unverifiedCount = 0;

  for (const user of allUsers) {
    const normalized = normalizeMembership(user.membership_type);
    membership[normalized] += 1;
    if (user.verified) verifiedCount += 1;
    else unverifiedCount += 1;
  }

  const docsByUserId = new Map(allDocs.map((row) => [row.user_id, row]));
  const uploadedDocUserIds = new Set(
    allDocs.filter(hasAnyUploadedDocs).map((row) => row.user_id),
  );
  const pendingVerificationUsers: PendingVerificationUser[] = allUsers
    .filter((user) => {
      const row = docsByUserId.get(user.id);

      return (
        user.verification_status === "pending" && row && hasAnyUploadedDocs(row)
      );
    })
    .map((user) => ({
      id: user.id,
      fullName: fullNameOf(user),
      phone: user.phone ?? "—",
      email: user.email ?? "—",
      membershipType: normalizeMembership(user.membership_type),
    }));
  const rejectedPartialUsers: PendingVerificationUser[] = allUsers
    .filter((user) => user.verification_status === "rejected")
    .map((user) => ({
      id: user.id,
      fullName: fullNameOf(user),
      phone: user.phone ?? "—",
      email: user.email ?? "—",
      membershipType: normalizeMembership(user.membership_type),
    }));
  const notStartedVerificationUsers: PendingVerificationUser[] = allUsers
    .filter((user) => {
      return (
        user.verification_status === "pending" &&
        !uploadedDocUserIds.has(user.id)
      );
    })
    .map((user) => ({
      id: user.id,
      fullName: fullNameOf(user),
      phone: user.phone ?? "—",
      email: user.email ?? "—",
      membershipType: normalizeMembership(user.membership_type),
    }));

  const { data: winners } = await supabaseAdmin
    .from("winners")
    .select(
      `
    *,
    users (
      first_name,
      last_name,
      phone
    )
  `,
    )
    .order("created_at", { ascending: false });

  const { data: cities } = await supabaseAdmin
    .from("cities")
    .select("*")
    .order("city", { ascending: true });

  const { data: sliders } = await supabaseAdmin
    .from("sliders")
    .select("*")
    .order("display_order", { ascending: true })
    .order("created_at", {
      ascending: false,
    });

  const { data: prioritySettingsRow } = await supabaseAdmin
    .from("requirement_priority_settings")
    .select(
      "matching_platinum_minutes, all_platinum_minutes, all_gold_minutes, updated_at",
    )
    .eq("id", 1)
    .maybeSingle();

  const prioritySettings = {
    matching_platinum_minutes:
      prioritySettingsRow?.matching_platinum_minutes ?? 4,
    all_platinum_minutes: prioritySettingsRow?.all_platinum_minutes ?? 4,
    all_gold_minutes: prioritySettingsRow?.all_gold_minutes ?? 3,
    updated_at: prioritySettingsRow?.updated_at ?? null,
  };

  const { data: requirements, error: requirementsError } = await supabaseAdmin
    .from("requirements")
    .select(
      `
      *,
      users!requirements_user_id_fkey (
        first_name,
        last_name,
        phone
      ),
      assigned_user:users!requirements_assigned_to_user_id_fkey (
        first_name,
        last_name,
        phone
      )
    `,
    )
    .order("created_at", {
      ascending: false,
    });

  console.log("REQUIREMENTS:", requirements);
  console.log("REQUIREMENTS ERROR:", requirementsError);

  const { data: exchanges } = await supabaseAdmin
    .from("exchange_listings")
    .select(
      `
    *,
    users!exchange_listings_user_id_fkey (
      first_name,
      last_name,
      phone
    ),
    exchanged_user:users!exchange_listings_exchanged_to_user_id_fkey (
      first_name,
      last_name,
      phone
    )
  `,
    )
    .order("created_at", {
      ascending: false,
    });

  const { data: fraudReports } = await supabaseAdmin
    .from("fraud_reports")
    .select(
      `
    *,
    from_user:users!fraud_reports_from_user_id_fkey (
      first_name,
      last_name,
      phone
    ),
    to_user:users!fraud_reports_to_user_id_fkey (
      first_name,
      last_name,
      phone
    )
  `,
    )
    .order("created_at", {
      ascending: false,
    });

  return (
    <div className="min-h-screen bg-slate-100">
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <DashboardTabs
          totalUsers={allUsers.length}
          membership={membership}
          verifiedCount={verifiedCount}
          unverifiedCount={unverifiedCount}
          pendingVerificationUsers={pendingVerificationUsers}
          rejectedPartialUsers={rejectedPartialUsers}
          notStartedVerificationUsers={notStartedVerificationUsers}
          showRlsHint={!usingServiceRole}
          winnerUser={winners ?? []}
          cities={cities ?? []}
          sliders={sliders ?? []}
          users={allUsers ?? []}
          requirements={requirements ?? []}
          exchanges={exchanges ?? []}
          fraudReports={fraudReports ?? []}
          prioritySettings={prioritySettings}
        />
      </main>
    </div>
  );
}
