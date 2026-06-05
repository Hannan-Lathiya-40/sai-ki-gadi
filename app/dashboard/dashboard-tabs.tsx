"use client";

import App from "next/app";
import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";

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

type WinnersUser = {
  id: string;
  user_id: string;
  date: string;
  slot: string;
  image: string | null;
  created_at: string;
  users: {
    first_name: string;
    last_name: string;
    phone: string;
  } | null;
};

type AppUser = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  membership_type: string | null;
  verified: boolean | null;
  status: boolean | null;
};

type Requirement = {
  id: string;
  source_city: string;
  source_state: string;
  destination_city: string;
  destination_state: string;
  car_type: string;
  trip_type: string;
  price: string;
  journey_start_at: string;
  ride_type: string;
  created_at: string;
  users: {
    first_name: string;
    last_name: string;
    phone: string;
  } | null;
  assigned_user: {
    first_name: string;
    last_name: string;
    phone: string;
  } | null;

  booked: boolean;
  booking_remark: string | null;
};

type Exchange = {
  id: string;

  available_source_city: string;
  available_source_state: string;
  available_destination_city: string;
  available_destination_state: string;
  available_car_type: string;
  available_trip_type: string;
  available_at: string;

  expected_source_city: string;
  expected_source_state: string;
  expected_destination_city: string;
  expected_destination_state: string;
  expected_car_type: string;
  expected_trip_type: string;
  expected_at: string;

  description: string | null;
  created_at: string;

  booked: boolean;

  users: {
    first_name: string;
    last_name: string;
    phone: string;
  } | null;

  exchanged_user: {
    first_name: string;
    last_name: string;
    phone: string;
  } | null;
};

type Slider = {
  id: string;
  image: string;
  status: boolean;
  created_at: string;
};

type city = {
  id: number;
  city: string;
  state: string;
  district: string | null;
  is_active: boolean;
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
  winnerUser: WinnersUser[];
  cities: city[];
  sliders: Slider[];
  users: AppUser[];
  requirements: Requirement[];
  exchanges: Exchange[];
  // winners: {
  //   id: string;
  //   date: string;
  //   slot: string;
  //   image: string | null;
  //   created_at: string;
  //   users: {
  //     first_name: string;
  //     last_name: string;
  //     phone: string;
  //   } | null;
  // }[];
};

type TabKey =
  | "overview"
  | "pending"
  | "rejected-partial"
  | "not-started"
  | "winners"
  | "cities"
  | "sliders"
  | "users"
  | "requirements"
  | "exchanges";

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
  winnerUser,
  cities,
  sliders,
  users,
  requirements,
  exchanges,
}: DashboardTabsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [reqSearch, setReqSearch] = useState("");
  const [reqStatus, setReqStatus] = useState("all");
  const [reqCarType, setReqCarType] = useState("all");
  const [reqTripType, setReqTripType] = useState("all");
  const [reqSourceCity, setReqSourceCity] = useState("all");
  const [reqDestinationCity, setReqDestinationCity] = useState("all");
  const [exchangeSearch, setExchangeSearch] = useState("");
  const [exchangeStatus, setExchangeStatus] = useState("all");
  const [exchangeCarType, setExchangeCarType] = useState("all");
  const [exchangeSourceCity, setExchangeSourceCity] = useState("all");
  const [exchangeDestinationCity, setExchangeDestinationCity] = useState("all");
  const [reqFromDate, setReqFromDate] = useState("");
  const [reqToDate, setReqToDate] = useState("");

  const [exchangeFromDate, setExchangeFromDate] = useState("");
  const [exchangeToDate, setExchangeToDate] = useState("");
  const pendingCount = pendingVerificationUsers.length;
  const rejectedPartialCount = rejectedPartialUsers.length;
  const notStartedCount = notStartedVerificationUsers.length;
  const [showWinnerModal, setShowWinnerModal] = useState(false);

  const [winnerUsers, setWinnerUsers] = useState<PendingVerificationUser[]>([]);

  const [selectedUserId, setSelectedUserId] = useState("");

  const [winnerDate, setWinnerDate] = useState("");

  const [winnerSlot, setWinnerSlot] = useState("");

  const [winnerImage, setWinnerImage] = useState("");

  const [savingWinner, setSavingWinner] = useState(false);

  const [uploadingImage, setUploadingImage] = useState(false);

  const [editingWinnerId, setEditingWinnerId] = useState<string | null>(null);

  const [showCityModal, setShowCityModal] = useState(false);

  const [editingCityId, setEditingCityId] = useState<number | null>(null);

  const [cityName, setCityName] = useState("");

  const [stateName, setStateName] = useState("");

  const [districtName, setDistrictName] = useState("");

  const [savingCity, setSavingCity] = useState(false);

  const [deletingCityId, setDeletingCityId] = useState<number | null>(null);

  const [successMessage, setSuccessMessage] = useState("");

  const [errorMessage, setErrorMessage] = useState("");

  const [showSliderModal, setShowSliderModal] = useState(false);

  const [sliderImage, setSliderImage] = useState("");

  const [sliderStatus, setSliderStatus] = useState(true);

  const [editingSliderId, setEditingSliderId] = useState<string | null>(null);

  const [savingSlider, setSavingSlider] = useState(false);

  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const sourceCities = [
    ...new Set(requirements?.map((r) => r.source_city).filter(Boolean)),
  ];

  const destinationCities = [
    ...new Set(requirements?.map((r) => r.destination_city).filter(Boolean)),
  ];

  const exchangeSourceCities = [
    ...new Set(exchanges?.map((e) => e.available_source_city).filter(Boolean)),
  ];

  const exchangeDestinationCities = [
    ...new Set(
      exchanges?.map((e) => e.available_destination_city).filter(Boolean),
    ),
  ];


  const cityOptions = [...new Set((cities ?? []).map((c) => c.city))];

  const requirementCarTypes = [
    ...new Set(requirements?.map((item) => item.car_type).filter(Boolean)),
  ];
  const filteredRequirements = requirements?.filter((item) => {
    const search = reqSearch.toLowerCase();

    const matchesSearch =
      `${item.users?.first_name ?? ""} ${item.users?.last_name ?? ""}`
        .toLowerCase()
        .includes(search) ||
      (item.users?.phone ?? "").toLowerCase().includes(search) ||
      (item.source_city ?? "").toLowerCase().includes(search) ||
      (item.destination_city ?? "").toLowerCase().includes(search);

    const matchesStatus =
      reqStatus === "all"
        ? true
        : reqStatus === "booked"
          ? item.booked
          : !item.booked;

    const matchesCar = reqCarType === "all" || item.car_type === reqCarType;

    const matchesTrip = reqTripType === "all" || item.trip_type === reqTripType;

    const matchesSource =
      reqSourceCity === "all" || item.source_city === reqSourceCity;

    const matchesDestination =
      reqDestinationCity === "all" ||
      item.destination_city === reqDestinationCity;

    const matchesDate =
      (!reqFromDate ||
        new Date(item.journey_start_at) >= new Date(reqFromDate)) &&
      (!reqToDate ||
        new Date(item.journey_start_at) <= new Date(reqToDate + "T23:59:59"));

    return (
      matchesSearch &&
      matchesStatus &&
      matchesCar &&
      matchesTrip &&
      matchesSource &&
      matchesDestination &&
      matchesDate
    );
  });

  const exchangeCarTypes = [
    ...new Set(
      exchanges?.map((item) => item.available_car_type).filter(Boolean),
    ),
  ];

  const filteredExchanges = exchanges?.filter((item) => {
    const search = exchangeSearch.toLowerCase();

    const matchesSearch =
      `${item.users?.first_name ?? ""} ${item.users?.last_name ?? ""}`
        .toLowerCase()
        .includes(search) ||
      (item.users?.phone ?? "").toLowerCase().includes(search) ||
      (item.available_source_city ?? "").toLowerCase().includes(search) ||
      (item.available_destination_city ?? "").toLowerCase().includes(search);

    const matchesStatus =
      exchangeStatus === "all"
        ? true
        : exchangeStatus === "booked"
          ? item.booked
          : !item.booked;

    const matchesCar =
      exchangeCarType === "all" || item.available_car_type === exchangeCarType;

    const matchesSource =
      exchangeSourceCity === "all" ||
      item.available_source_city === exchangeSourceCity;

    const matchesDestination =
      exchangeDestinationCity === "all" ||
      item.available_destination_city === exchangeDestinationCity;

    const matchesDate =
      (!exchangeFromDate ||
        new Date(item.created_at) >= new Date(exchangeFromDate)) &&
      (!exchangeToDate ||
        new Date(item.created_at) <= new Date(exchangeToDate + "T23:59:59"));
    return (
      matchesSearch &&
      matchesStatus &&
      matchesCar &&
      matchesSource &&
      matchesDestination &&
      matchesDate
    );
  });

  const overviewCards = useMemo(
    () => [
      {
        label: "Total users",
        value: totalUsers,
        subtitle: "All signed-up accounts",
        tab: "users",
        accent: "border-slate-900 bg-slate-900 text-white shadow-slate-300/40",
      },
      {
        label: "User",
        value: membership.user,
        subtitle: "Standard membership",
        tab: "users",
        accent: "border-slate-200 bg-white text-slate-900",
      },
      {
        label: "Pro",
        value: membership.pro,
        subtitle: "Pro membership",
        tab: "users",
        accent: "border-indigo-100 bg-indigo-50 text-indigo-700",
      },
      {
        label: "Pro Plus",
        value: membership.pro_plus,
        subtitle: "Pro Plus membership",
        tab: "users",
        accent: "border-violet-100 bg-violet-50 text-violet-700",
      },
      {
        label: "Verified",
        value: verifiedCount,
        subtitle: "Approved accounts",
        tab: "pending",
        accent: "border-emerald-100 bg-emerald-50 text-emerald-700",
      },
      {
        label: "Unverified",
        value: unverifiedCount,
        subtitle: "Pending or incomplete",
        tab: "not-started",
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

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await fetch("/api/admin/users");

        const data = await response.json();

        setWinnerUsers(data.users ?? []);
      } catch (error) {
        console.error(error);
      }
    };

    loadUsers();
  }, []);

  const createWinner = async () => {
    try {
      setSavingWinner(true);

      const url = editingWinnerId
        ? `/api/admin/winners/${editingWinnerId}`
        : "/api/admin/winners";

      const method = editingWinnerId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: selectedUserId,
          date: winnerDate,
          slot: winnerSlot,
          image: winnerImage,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed");
      }

      setShowWinnerModal(false);

      setSelectedUserId("");
      setWinnerDate("");
      setWinnerSlot("");
      setWinnerImage("");
      setEditingWinnerId(null);

      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setSavingWinner(false);
    }
  };

  const deleteWinner = async (id: string) => {
    const confirmDelete = window.confirm("Delete this winner?");

    if (!confirmDelete) return;

    try {
      const response = await fetch(`/api/admin/winners/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed");
      }

      router.refresh();
    } catch (error) {
      console.error(error);
    }
  };

  const createSlider = async () => {
    try {
      setSavingSlider(true);

      const url = editingSliderId
        ? `/api/admin/sliders/${editingSliderId}`
        : "/api/admin/sliders";

      const method = editingSliderId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: sliderImage,
          status: sliderStatus,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed");
      }

      setShowSliderModal(false);

      setSliderImage("");

      setSliderStatus(true);

      setEditingSliderId(null);

      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setSavingSlider(false);
    }
  };

  const deleteSlider = async (id: string) => {
    const confirmDelete = window.confirm("Delete this slider?");

    if (!confirmDelete) return;

    try {
      const response = await fetch(`/api/admin/sliders/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed");
      }

      router.refresh();
    } catch (error) {
      console.error(error);
    }
  };

  const toggleUserStatus = async (id: string, status: boolean) => {
    try {
      setUpdatingUserId(id);

      const response = await fetch(`/api/admin/users/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: !status,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        console.log("USER STATUS ERROR:", errorData);

        throw new Error("Failed");
      }

      await router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const deleteUser = async (id: string) => {
    const confirmDelete = window.confirm("Delete this user?");

    if (!confirmDelete) return;

    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed");
      }

      router.refresh();
    } catch (error) {
      console.error(error);
    }
  };

  const createCity = async () => {
    try {
      setSavingCity(true);

      setErrorMessage("");

      const response = await fetch("/api/admin/cities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          city: cityName,
          state: stateName,
          district: districtName,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed");
      }

      setSuccessMessage(
        editingCityId
          ? "City updated successfully"
          : "City created successfully",
      );

      setShowCityModal(false);

      setCityName("");
      setStateName("");
      setDistrictName("");

      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);

      router.refresh();
    } catch (error) {
      console.error(error);

      setErrorMessage("Something went wrong");

      setTimeout(() => {
        setErrorMessage("");
      }, 3000);
    } finally {
      setSavingCity(false);
    }
  };

  const deleteCity = async (id: number) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this city?",
    );

    if (!confirmDelete) return;

    try {
      setDeletingCityId(id);

      setErrorMessage("");

      const response = await fetch(`/api/admin/cities/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed");
      }

      setSuccessMessage("City deleted successfully");

      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);

      router.refresh();
    } catch (error) {
      console.error(error);

      setErrorMessage("Failed to delete city");

      setTimeout(() => {
        setErrorMessage("");
      }, 3000);
    } finally {
      setDeletingCityId(null);
    }
  };

  return (
    <section>
      {successMessage ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errorMessage}
        </div>
      ) : null}
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
          admin pages may return no rows. Add
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
        <button
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === "winners"
              ? "bg-indigo-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
          onClick={() => setActiveTab("winners")}
        >
          Winners ({winnerUser.length})
        </button>
        <button
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === "cities"
              ? "bg-indigo-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
          onClick={() => setActiveTab("cities")}
        >
          Cities ({cities.length || 0})
        </button>
        <button
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === "sliders"
              ? "bg-indigo-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
          onClick={() => setActiveTab("sliders")}
        >
          Sliders ({sliders?.length || 0})
        </button>
        <button
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === "users"
              ? "bg-indigo-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
          onClick={() => setActiveTab("users")}
        >
          Users ({users?.length || 0})
        </button>
        <button
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === "requirements"
              ? "bg-indigo-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
          onClick={() => setActiveTab("requirements")}
        >
          Requirements ({requirements?.length || 0})
        </button>
        <button
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === "exchanges"
              ? "bg-indigo-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
          onClick={() => setActiveTab("exchanges")}
        >
          Exchanges ({exchanges?.length || 0})
        </button>
      </div>

      {activeTab === "overview" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {overviewCards.map((card) => (
            <article
              key={card.label}
              onClick={() => setActiveTab(card.tab as TabKey)}
              className={`cursor-pointer rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${card.accent}`}
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
      ) : activeTab === "not-started" ? (
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
      ) : activeTab === "cities" ? (
        <>
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => {
                setEditingCityId(null);

                setCityName("");
                setStateName("");
                setDistrictName("");

                setShowCityModal(true);
              }}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Add City
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      City
                    </th>

                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      State
                    </th>

                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      District
                    </th>

                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Status
                    </th>

                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {(cities?.length || 0) === 0 ? (
                    <tr>
                      <td
                        className="px-4 py-10 text-center text-slate-500"
                        colSpan={5}
                      >
                        No cities found.
                      </td>
                    </tr>
                  ) : (
                    (cities ?? []).map((city) => (
                      <tr key={city.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {city.city}
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {city.state}
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {city.district || "-"}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              city.is_active
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {city.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingCityId(city.id);

                                setCityName(city.city);

                                setStateName(city.state);

                                setDistrictName(city.district || "");

                                setShowCityModal(true);
                              }}
                              className="rounded-lg bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-200"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => deleteCity(city.id)}
                              disabled={deletingCityId === city.id}
                              className="rounded-lg bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-200"
                            >
                              {deletingCityId === city.id
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : activeTab === "users" ? (
        <>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full table-fixed divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="w-[220px] px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                      User
                    </th>

                    <th className="w-[140px] px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                      Phone
                    </th>

                    <th className="w-[240px] px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                      Email
                    </th>

                    <th className="w-[130px] px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                      Plan
                    </th>

                    <th className="w-[140px] px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                      Verification
                    </th>

                    <th className="w-[120px] px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-600">
                      Status
                    </th>

                    <th className="w-[140px] px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users?.length === 0 ? (
                    <tr>
                      <td
                        className="px-4 py-10 text-center text-slate-500"
                        colSpan={7}
                      >
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr
                        key={user.id}
                        className={`hover:bg-slate-50 transition-all ${
                          updatingUserId === user.id
                            ? "opacity-50 pointer-events-none"
                            : ""
                        }`}
                      >
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {user.first_name ?? "—"} {user.last_name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {user.phone ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {user.email ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                            {user.membership_type ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              user.verified
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {user.verified ? "Verified" : "Pending"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {updatingUserId === user.id ? (
                            <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                              <span className="h-2 w-2 animate-pulse rounded-full bg-blue-600" />
                              Updating...
                            </span>
                          ) : (
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                user.status
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {user.status ? "ON" : "OFF"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              disabled={updatingUserId === user.id}
                              onClick={() =>
                                toggleUserStatus(user.id, user.status ?? false)
                              }
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                                user.status ? "bg-emerald-500" : "bg-slate-300"
                              } ${
                                updatingUserId === user.id
                                  ? "cursor-not-allowed opacity-70"
                                  : ""
                              }`}
                            >
                              {updatingUserId === user.id ? (
                                <span className="mx-auto h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              ) : (
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                    user.status
                                      ? "translate-x-6"
                                      : "translate-x-1"
                                  }`}
                                />
                              )}
                            </button>

                            <button
                              onClick={() => deleteUser(user.id)}
                              className="rounded-lg bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-200"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : activeTab === "requirements" ? (
        <>
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3 overflow-x-auto pb-1">
              <input
                type="text"
                placeholder="Search User / Phone / City"
                value={reqSearch}
                onChange={(e) => setReqSearch(e.target.value)}
                className="h-11 w-72 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 placeholder:text-slate-400"
              />
              <select
                value={reqStatus}
                onChange={(e) => setReqStatus(e.target.value)}
                className="h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900"
              >
                <option value="all">All Status</option>
                <option value="booked">Booked</option>
                <option value="pending">Pending</option>
              </select>
              <select
                value={reqCarType}
                onChange={(e) => setReqCarType(e.target.value)}
                className="h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900"
              >
                <option value="all">All Cars</option>

                {requirementCarTypes.map((car) => (
                  <option key={car} value={car}>
                    {car}
                  </option>
                ))}
              </select>
              <select
                value={reqTripType}
                onChange={(e) => setReqTripType(e.target.value)}
                className="h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900"
              >
                <option value="all">All Trips</option>
                <option value="one_way">One Way</option>
                <option value="two_way">Two Way</option>
              </select>
              <select
                value={reqSourceCity}
                onChange={(e) => setReqSourceCity(e.target.value)}
                className="h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900"
              >
                <option value="all">All Sources</option>

                {cityOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
              <select
                value={reqDestinationCity}
                onChange={(e) => setReqDestinationCity(e.target.value)}
                className="h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900"
              >
                <option value="all">All Destinations</option>

                {cityOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={reqFromDate}
                onChange={(e) => setReqFromDate(e.target.value)}
                className="h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900"
              />

              <input
                type="date"
                value={reqToDate}
                onChange={(e) => setReqToDate(e.target.value)}
                className="h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900"
              />

              <button
                onClick={() => {
                  setReqSearch("");
                  setReqStatus("all");
                  setReqCarType("all");
                  setReqTripType("all");
                  setReqSourceCity("all");
                  setReqDestinationCity("all");
                  setReqFromDate("");
                  setReqToDate("");
                }}
                className="h-11 whitespace-nowrap rounded-lg bg-red-500 px-4 text-sm font-semibold text-white hover:bg-red-600"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"></div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold text-slate-800">
                      User
                    </th>

                    <th className="px-6 py-4 text-left font-bold text-slate-800">
                      Phone
                    </th>

                    <th className="px-6 py-4 text-left font-bold text-slate-800">
                      Source
                    </th>

                    <th className="px-6 py-4 text-left font-bold text-slate-800">
                      Destination
                    </th>

                    <th className="px-6 py-4 text-left font-bold text-slate-800">
                      Car Type
                    </th>

                    <th className="px-6 py-4 text-left font-bold text-slate-800">
                      Trip Type
                    </th>

                    <th className="px-6 py-4 text-left font-bold text-slate-800">
                      Price
                    </th>

                    <th className="px-6 py-4 text-left font-bold text-slate-800">
                      Journey Start
                    </th>

                    <th className="px-6 py-4 text-left font-bold text-slate-800">
                      Status
                    </th>

                    <th className="px-6 py-4 text-left font-bold text-slate-800">
                      Booked By
                    </th>

                    <th className="px-6 py-4 text-left font-bold text-slate-800">
                      Driver Phone
                    </th>

                    <th className="px-6 py-4 text-left font-bold text-slate-800">
                      Created
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {requirements?.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-10 text-center text-slate-500"
                      >
                        No requirements found.
                      </td>
                    </tr>
                  ) : (
                    filteredRequirements.map((item) => (
                      <tr key={item.id} className="border-t hover:bg-slate-50">
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {item.users?.first_name} {item.users?.last_name}
                        </td>

                        <td className="px-6 py-4 text-slate-700">
                          {item.users?.phone}
                        </td>

                        <td className="px-6 py-4 text-slate-700">
                          {item.source_city}, {item.source_state}
                        </td>

                        <td className="px-6 py-4 text-slate-700">
                          {item.destination_city}, {item.destination_state}
                        </td>

                        <td className="px-6 py-4 text-slate-700">
                          {item.car_type}
                        </td>

                        <td className="px-6 py-4 text-slate-700">
                          {item.trip_type}
                        </td>

                        <td className="px-6 py-4 text-slate-700">
                          ₹{item.price}
                        </td>

                        <td className="px-6 py-4 text-slate-700">
                          {new Date(item.journey_start_at).toLocaleString()}
                        </td>

                        <td>
                          {item.booked ? (
                            <span className="rounded bg-green-100 px-2 py-1 text-green-700 font-semibold">
                              Booked
                            </span>
                          ) : (
                            <span className="rounded bg-red-100 px-2 py-1 text-red-700 font-semibold">
                              Pending
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {item.assigned_user
                            ? `${item.assigned_user.first_name} ${item.assigned_user.last_name}`
                            : "-"}
                        </td>

                        <td className="px-6 py-4 font-medium text-slate-900">
                          {item.assigned_user?.phone ?? "-"}
                        </td>

                        <td className="px-6 py-4 text-slate-500">
                          {new Date(item.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : activeTab === "exchanges" ? (
        <>
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3 overflow-x-auto pb-1">
              <input
                type="text"
                placeholder="Search User / Phone / City"
                value={exchangeSearch}
                onChange={(e) => setExchangeSearch(e.target.value)}
                className="h-11 w-72 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 placeholder:text-slate-500"
              />

              <select
                value={exchangeStatus}
                onChange={(e) => setExchangeStatus(e.target.value)}
                className="h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900"
              >
                <option value="all">All Status</option>
                <option value="booked">Exchanged</option>
                <option value="pending">Pending</option>
              </select>

              <select
                value={exchangeCarType}
                onChange={(e) => setExchangeCarType(e.target.value)}
                className="h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900"
              >
                <option value="all">All Cars</option>

                {exchangeCarTypes.map((car) => (
                  <option key={car} value={car}>
                    {car}
                  </option>
                ))}
              </select>

              <select
                value={exchangeSourceCity}
                onChange={(e) => setExchangeSourceCity(e.target.value)}
                className="h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900"
              >
                <option value="all">All Sources</option>

                {cityOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>

              <select
                value={exchangeDestinationCity}
                onChange={(e) => setExchangeDestinationCity(e.target.value)}
                className="h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900"
              >
                <option value="all">All Destinations</option>

                {cityOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={exchangeFromDate}
                onChange={(e) => setExchangeFromDate(e.target.value)}
                className="h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900"
              />

              <input
                type="date"
                value={exchangeToDate}
                onChange={(e) => setExchangeToDate(e.target.value)}
                className="h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900"
              />

              <button
                onClick={() => {
                  setReqSearch("");
                  setReqStatus("all");
                  setReqCarType("all");
                  setReqTripType("all");
                  setReqSourceCity("all");
                  setReqDestinationCity("all");
                  setReqFromDate("");
                  setReqToDate("");
                }}
                className="h-11 whitespace-nowrap rounded-lg bg-red-500 px-4 text-sm font-semibold text-white hover:bg-red-600"
              >
                Reset
              </button>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold text-slate-800">
                      User
                    </th>
                    <th className="px-6 py-4 text-left font-bold text-slate-800">
                      Phone
                    </th>
                    <th className="px-6 py-4 text-left font-bold text-slate-800">
                      Available Route
                    </th>
                    <th className="px-6 py-4 text-left font-bold text-slate-800">
                      Available Car
                    </th>
                    <th className="px-6 py-4 text-left font-bold text-slate-800">
                      Expected Route
                    </th>
                    <th className="px-6 py-4 text-left font-bold text-slate-800">
                      Expected Car
                    </th>
                    <th className="px-6 py-4 text-left font-bold text-slate-800">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left font-bold text-slate-800">
                      Exchanged To
                    </th>
                    <th className="px-6 py-4 text-left font-bold text-slate-800">
                      Driver Phone
                    </th>
                    <th className="px-6 py-4 text-left font-bold text-slate-800">
                      Created
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredExchanges?.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {item.users?.first_name} {item.users?.last_name}
                      </td>

                      <td className="px-6 py-4 text-slate-700">
                        {item.users?.phone}
                      </td>

                      <td className="px-6 py-4 text-slate-700">
                        {item.available_source_city}→
                        {item.available_destination_city}
                      </td>

                      <td className="px-6 py-4 text-slate-700">
                        {item.available_car_type}
                      </td>

                      <td className="px-6 py-4 text-slate-700">
                        {item.expected_source_city}→
                        {item.expected_destination_city}
                      </td>

                      <td className="px-6 py-4 text-slate-700">
                        {item.expected_car_type}
                      </td>

                      <td className="px-6 py-4">
                        {item.booked ? (
                          <span className="rounded bg-green-100 px-2 py-1 text-green-700 font-semibold">
                            Exchanged
                          </span>
                        ) : (
                          <span className="rounded bg-red-100 px-2 py-1 text-red-700 font-semibold">
                            Pending
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {item.exchanged_user
                          ? `${item.exchanged_user.first_name} ${item.exchanged_user.last_name}`
                          : "-"}
                      </td>

                      <td className="px-6 py-4 text-slate-700">
                        {item.exchanged_user?.phone ?? "-"}
                      </td>

                      <td className="px-6 py-4 text-slate-700">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : activeTab === "sliders" ? (
        <>
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => {
                setEditingSliderId(null);

                setSliderImage("");

                setSliderStatus(true);

                setShowSliderModal(true);
              }}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Add Slider
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Image
                    </th>

                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Status
                    </th>

                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {sliders?.length === 0 ? (
                    <tr>
                      <td
                        className="px-4 py-10 text-center text-slate-500"
                        colSpan={3}
                      >
                        No sliders found.
                      </td>
                    </tr>
                  ) : (
                    (sliders ?? []).map((slider) => (
                      <tr key={slider.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <img
                            src={slider.image}
                            alt="slider"
                            className="aspect-[10/5] w-40 rounded-xl object-cover"
                          />
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              slider.status
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {slider.status ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingSliderId(slider.id);

                                setSliderImage(slider.image);

                                setSliderStatus(slider.status);

                                setShowSliderModal(true);
                              }}
                              className="rounded-lg bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-200"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => deleteSlider(slider.id)}
                              className="rounded-lg bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-200"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => {
                setEditingWinnerId(null);

                setSelectedUserId("");
                setWinnerDate("");
                setWinnerSlot("");
                setWinnerImage("");

                setShowWinnerModal(true);
              }}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              {editingWinnerId ? "Edit Winner" : "Add Winner"}{" "}
            </button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      User
                    </th>

                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Phone
                    </th>

                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Date
                    </th>

                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Slot
                    </th>

                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Image
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {winnerUser.length === 0 ? (
                    <tr>
                      <td
                        className="px-4 py-10 text-center text-slate-500"
                        colSpan={5}
                      >
                        No winners found.
                      </td>
                    </tr>
                  ) : (
                    winnerUser.map((winner) => (
                      <tr key={winner.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {winner.users?.first_name} {winner.users?.last_name}
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {winner.users?.phone}
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {winner.date}
                        </td>

                        <td className="px-4 py-3">
                          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                            {winner.slot}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          {winner.image ? (
                            <img
                              src={winner.image}
                              alt="winner"
                              className="aspect-[10/7] w-28 rounded-xl object-cover"
                            />
                          ) : (
                            <span className="text-slate-400">No Image</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingWinnerId(winner.id);

                                setSelectedUserId(winner.user_id ?? "");

                                setWinnerDate(winner.date);

                                setWinnerSlot(winner.slot);

                                setWinnerImage(winner.image ?? "");

                                setShowWinnerModal(true);
                              }}
                              className="rounded-lg bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-200"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => deleteWinner(winner.id)}
                              className="rounded-lg bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-200"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      {showWinnerModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {editingWinnerId ? "Edit Winner" : "Add Winner"}
              </h2>
              <button
                onClick={() => {
                  setShowWinnerModal(false);

                  setEditingWinnerId(null);

                  setSelectedUserId("");
                  setWinnerDate("");
                  setWinnerSlot("");
                  setWinnerImage("");
                }}
                className="text-slate-500 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Select User
                </label>

                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  // className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-indigo-500"
                >
                  <option value="">Select user</option>

                  {winnerUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.fullName} ({user.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Date
                </label>

                <input
                  type="date"
                  value={winnerDate}
                  onChange={(e) => setWinnerDate(e.target.value)}
                  // className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Slot
                </label>

                <input
                  type="text"
                  placeholder="Enter slot"
                  value={winnerSlot}
                  onChange={(e) => setWinnerSlot(e.target.value)}
                  // className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500"
                />
              </div>

              {/* <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Image URL
                  </label>

                  <input
                    type="text"
                    placeholder="Enter image url"
                    value={winnerImage}
                    onChange={(e) => setWinnerImage(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
                  />
                </div> */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Upload Image
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];

                    if (!file) return;

                    try {
                      setUploadingImage(true);

                      const formData = new FormData();

                      formData.append("file", file);

                      const response = await fetch("/api/admin/upload", {
                        method: "POST",
                        body: formData,
                      });

                      const data = await response.json();

                      console.log("UPLOAD RESPONSE", data);

                      setWinnerImage(data.url);
                    } catch (error) {
                      console.error(error);
                    } finally {
                      setUploadingImage(false);
                    }
                  }}
                  // className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                  className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-indigo-700"
                />

                {winnerImage ? (
                  <img
                    src={winnerImage}
                    alt="preview"
                    className="mt-4 aspect-[10/7] w-full rounded-2xl object-cover"
                  />
                ) : null}
              </div>

              <button
                onClick={createWinner}
                disabled={
                  savingWinner ||
                  uploadingImage ||
                  !selectedUserId ||
                  !winnerDate ||
                  !winnerSlot ||
                  !winnerImage
                }
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploadingImage
                  ? "Uploading Image..."
                  : savingWinner
                    ? "Saving..."
                    : editingWinnerId
                      ? "Update Winner"
                      : "Create Winner"}{" "}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {showSliderModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {editingSliderId ? "Edit Slider" : "Add Slider"}
              </h2>

              <button
                onClick={() => {
                  setShowSliderModal(false);

                  setEditingSliderId(null);

                  setSliderImage("");

                  setSliderStatus(true);
                }}
                className="text-slate-500 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Upload Image
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];

                    if (!file) return;

                    try {
                      setUploadingImage(true);

                      const formData = new FormData();

                      formData.append("file", file);

                      const response = await fetch("/api/admin/upload", {
                        method: "POST",
                        body: formData,
                      });

                      const data = await response.json();

                      setSliderImage(data.url);
                    } catch (error) {
                      console.error(error);
                    } finally {
                      setUploadingImage(false);
                    }
                  }}
                  className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
                />

                {sliderImage ? (
                  <img
                    src={sliderImage}
                    alt="preview"
                    className="mt-4 aspect-[10/5] w-full rounded-2xl object-cover"
                  />
                ) : null}
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={sliderStatus}
                  onChange={(e) => setSliderStatus(e.target.checked)}
                />

                <span className="text-sm font-semibold text-slate-700">
                  Active Status
                </span>
              </div>

              <button
                onClick={createSlider}
                disabled={savingSlider || uploadingImage || !sliderImage}
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700"
              >
                {savingSlider
                  ? "Saving..."
                  : editingSliderId
                    ? "Update Slider"
                    : "Create Slider"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {showCityModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {editingCityId ? "Edit City" : "Add City"}
              </h2>

              <button
                onClick={() => {
                  setShowCityModal(false);

                  setEditingCityId(null);

                  setCityName("");
                  setStateName("");
                  setDistrictName("");
                }}
                className="text-slate-500 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  City
                </label>

                <input
                  type="text"
                  value={cityName}
                  onChange={(e) => setCityName(e.target.value)}
                  placeholder="Enter city"
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  State
                </label>

                <input
                  type="text"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  placeholder="Enter state"
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  District
                </label>

                <input
                  type="text"
                  value={districtName}
                  onChange={(e) => setDistrictName(e.target.value)}
                  placeholder="Enter district"
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-indigo-500"
                />
              </div>

              <button
                onClick={createCity}
                disabled={savingCity || !cityName || !stateName}
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700"
              >
                {editingCityId ? "Update City" : "Create City"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
