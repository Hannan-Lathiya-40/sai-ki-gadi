"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type MembershipCounts = {
  user: number;
  pro: number;
  pro_plus: number;
};

type PendingVerificationUser = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  membershipType: "user" | "pro" | "pro_plus";
};

type DashboardTabsProps = {
  totalUsers: number;
  membership: MembershipCounts;
  verifiedCount: number;
  unverifiedCount: number;
  pendingVerificationUsers: PendingVerificationUser[];
  rejectedPartialUsers: PendingVerificationUser[];
  notStartedVerificationUsers: PendingVerificationUser[];
  showRlsHint: boolean;
};

type TabKey = "overview" | "pending" | "rejected-partial" | "not-started";

function formatMembership(value: PendingVerificationUser["membershipType"]) {
  if (value === "pro_plus") return "Pro Plus";
  if (value === "pro") return "Pro";
  return "User";
}

export function DashboardTabs({
  totalUsers,
  membership,
  verifiedCount,
  unverifiedCount,
  pendingVerificationUsers,
  rejectedPartialUsers,
  notStartedVerificationUsers,
  showRlsHint,
}: DashboardTabsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const pendingCount = pendingVerificationUsers.length;
  const rejectedPartialCount = rejectedPartialUsers.length;
  const notStartedCount = notStartedVerificationUsers.length;

  const overviewCards = useMemo(
    () => [
      {
        label: "Total users",
        value: totalUsers,
        subtitle: "All signed-up accounts",
        accent: "border-slate-900 bg-slate-900 text-white shadow-slate-300/40",
      },
      {
        label: "User",
        value: membership.user,
        subtitle: "Standard membership",
        accent: "border-slate-200 bg-white text-slate-900",
      },
      {
        label: "Pro",
        value: membership.pro,
        subtitle: "Pro membership",
        accent: "border-indigo-100 bg-indigo-50 text-indigo-700",
      },
      {
        label: "Pro Plus",
        value: membership.pro_plus,
        subtitle: "Pro Plus membership",
        accent: "border-violet-100 bg-violet-50 text-violet-700",
      },
      {
        label: "Verified",
        value: verifiedCount,
        subtitle: "Approved accounts",
        accent: "border-emerald-100 bg-emerald-50 text-emerald-700",
      },
      {
        label: "Unverified",
        value: unverifiedCount,
        subtitle: "Pending or incomplete",
        accent: "border-amber-100 bg-amber-50 text-amber-700",
      },
    ],
    [
      membership.pro,
      membership.pro_plus,
      membership.user,
      totalUsers,
      unverifiedCount,
      verifiedCount,
    ],
  );

  const logout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  };

  return (
    <section>
      <header className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
              Admin Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              MeriGadi Verification Console
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Monitor signup analytics and manually verify document uploads.
            </p>
          </div>
          <button
            onClick={logout}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Log out
          </button>
        </div>
      </header>

      {showRlsHint ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Dashboard is using Supabase anon key. With your current RLS policies,
          admin pages may return no rows. Add{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code> in website env for full admin
          visibility.
        </div>
      ) : null}

      <div className="mb-6 flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <button
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === "overview"
              ? "bg-indigo-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
          onClick={() => setActiveTab("overview")}
        >
          Analytics
        </button>
        <button
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === "pending"
              ? "bg-indigo-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
          onClick={() => setActiveTab("pending")}
        >
          Pending Verification ({pendingCount})
        </button>
        <button
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === "rejected-partial"
              ? "bg-indigo-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
          onClick={() => setActiveTab("rejected-partial")}
        >
          Rejected/Partial ({rejectedPartialCount})
        </button>
        <button
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === "not-started"
              ? "bg-indigo-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
          onClick={() => setActiveTab("not-started")}
        >
          Not Started ({notStartedCount})
        </button>
      </div>

      {activeTab === "overview" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {overviewCards.map((card) => (
            <article
              key={card.label}
              className={`rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${card.accent}`}
            >
              <p className="text-sm font-semibold opacity-85">{card.label}</p>
              <p className="mt-2 text-3xl font-bold">{card.value}</p>
              <p className="mt-1 text-xs opacity-75">{card.subtitle}</p>
            </article>
          ))}
        </div>
      ) : activeTab === "pending" ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Membership
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingVerificationUsers.length === 0 ? (
                  <tr>
                    <td
                      className="px-4 py-10 text-center text-slate-500"
                      colSpan={4}
                    >
                      No users are currently waiting for manual verification.
                    </td>
                  </tr>
                ) : (
                  pendingVerificationUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => {
                        router.push(`/dashboard/verification/${user.id}`);
                      }}
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">
                          {user.fullName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {user.id.slice(0, 8)}...
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{user.phone}</td>
                      <td className="px-4 py-3 text-slate-600">{user.email}</td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {formatMembership(user.membershipType)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === "rejected-partial" ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Membership
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rejectedPartialUsers.length === 0 ? (
                  <tr>
                    <td
                      className="px-4 py-10 text-center text-slate-500"
                      colSpan={4}
                    >
                      No rejected or partially uploaded verification users.
                    </td>
                  </tr>
                ) : (
                  rejectedPartialUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => {
                        router.push(`/dashboard/verification/${user.id}`);
                      }}
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">
                          {user.fullName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {user.id.slice(0, 8)}...
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{user.phone}</td>
                      <td className="px-4 py-3 text-slate-600">{user.email}</td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {formatMembership(user.membershipType)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Membership
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {notStartedVerificationUsers.length === 0 ? (
                  <tr>
                    <td
                      className="px-4 py-10 text-center text-slate-500"
                      colSpan={4}
                    >
                      Every unverified user has initiated verification.
                    </td>
                  </tr>
                ) : (
                  notStartedVerificationUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">
                          {user.fullName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {user.id.slice(0, 8)}...
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{user.phone}</td>
                      <td className="px-4 py-3 text-slate-600">{user.email}</td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {formatMembership(user.membershipType)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
