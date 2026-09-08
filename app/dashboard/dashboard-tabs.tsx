"use client";

import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { exportToExcel } from "@/lib/export-excel";
import { formatDateTime } from "@/lib/format-datetime";

import { AboutUsAdminPanel } from "./components/about-us-admin-panel";
import { InAppAnnouncementsAdminPanel } from "./components/in-app-announcements-admin-panel";
import { AdminNavIcon } from "./admin-nav-icons";

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

type WinnerMediaType = "image" | "video";

type WinnersUser = {
  id: string;
  user_id: string;
  date: string;
  slot: string;
  image: string | null;
  media_type?: WinnerMediaType | null;
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

  membership_started_at: string | null;
  membership_expires_at: string | null;
  membership_duration_days: number | null;

  verified: boolean | null;

  status: boolean | null;

  created_at: string | null;
  welcome_completed: boolean | null;
  admin_remarks: string | null;
  last_active_at: string | null;
  rating_average: number | null;
  rating_count: number | null;
  blood_group: string | null;
  birth_date: string | null;
  date_of_birth: string | null;
  reference_1_name: string | null;
  reference_1_mobile: string | null;
  reference_2_name: string | null;
  reference_2_mobile: string | null;
  user_roles: string[] | null;
  requirement_count: number;
  exchange_count: number;
  availability_count: number;
  driver_requirement_count: number;
  total_posts: number;
};

const USER_ROLE_LABELS: Record<string, string> = {
  car_owner: "Car Owner",
  driver: "Driver",
  booking_agent: "Booking Agent",
};

function cellDash(value: string | number | null | undefined): string {
  if (value == null) return "-";
  const text = String(value).trim();
  return text ? text : "-";
}

function formatBirthDateCell(value: string | null | undefined): string {
  if (!value) return "-";
  const iso = String(value).trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${date.getFullYear()}`;
}

function formatUserRolesCell(roles: string[] | null | undefined): string {
  if (!roles || roles.length === 0) return "-";
  const labels = roles
    .map((role) => USER_ROLE_LABELS[role] ?? role)
    .filter(Boolean);
  return labels.length > 0 ? labels.join(", ") : "-";
}

type UserSortKey =
  | "created_newest"
  | "created_oldest"
  | "last_active_recent"
  | "last_active_least"
  | "total_posts"
  | "rating";

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

type SliderMediaType = "image" | "video";

type Slider = {
  id: string;
  image: string;
  status: boolean;
  display_order: number;
  created_at: string;
  media_type?: SliderMediaType | null;
};

type city = {
  id: number;
  city: string;
  state: string;
  district: string | null;
  is_active: boolean;
};

type FraudReport = {
  id: string;
  reason: string;
  description: string | null;
  created_at: string;

  from_user_id: string;
  to_user_id: string;

  from_user: {
    first_name: string;
    last_name: string;
    phone: string;
  } | null;

  to_user: {
    first_name: string;
    last_name: string;
    phone: string;
  } | null;
};

/** Legacy column names mapped in UI as Diamond / Gold / Silver. */
type PrioritySettings = {
  /** Silver Priority Duration */
  matching_platinum_minutes: number;
  /** Diamond Priority Duration */
  all_platinum_minutes: number;
  /** Gold Priority Duration */
  all_gold_minutes: number;
  updated_at?: string | null;
};

export type ProfileChangeRequestRow = {
  id: string;
  user_id: string;
  status: string;
  requested_changes:
    | { field?: string; old_value?: string; new_value?: string }[]
    | null;
  rejection_reason: string | null;
  requested_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  users: {
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
  } | null;
};

export type VehicleVerificationRow = {
  id: string;
  user_id: string;
  registration_number: string;
  normalized_registration_number: string;
  verification_status: string;
  rejection_reason: string | null;
  created_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  users: {
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
  } | null;
};

export type RouteMinimumFareRow = {
  id: string;
  from_city: string;
  from_state: string;
  to_city: string;
  to_state: string;
  minimum_fare: number;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
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
  fraudReports: FraudReport[];
  prioritySettings: PrioritySettings;
  profileChangeRequests: ProfileChangeRequestRow[];
  vehicles: VehicleVerificationRow[];
  routeMinimumFares: RouteMinimumFareRow[];
  serviceRoleIssue?: string | null;
  profileChangeRequestsError?: string | null;
  vehiclesError?: string | null;
  routeMinimumFaresError?: string | null;
  supabaseHost?: string | null;
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
  | "birthday-date"
  | "requirements"
  | "exchanges"
  | "fraud-reports"
  | "priority-settings"
  | "profile-changes"
  | "car-verification"
  | "minimum-fares"
  | "about-us"
  | "in-app-popups";

type NavTabItem = {
  key: TabKey;
  label: string;
  count?: number;
  highlightIfCountAboveZero?: boolean;
};

function AdminNavCard({
  item,
  isActive,
  onSelect,
}: {
  item: NavTabItem;
  isActive: boolean;
  onSelect: (key: TabKey) => void;
}) {
  const showCount = item.count !== undefined;
  const isUrgent =
    item.highlightIfCountAboveZero && (item.count ?? 0) > 0 && !isActive;

  return (
    <button
      type="button"
      onClick={() => onSelect(item.key)}
      className={`admin-nav-card flex h-auto min-h-14 w-full items-start gap-0 overflow-visible whitespace-normal rounded-xl border px-3 py-2.5 text-left transition active:scale-[0.98] sm:items-center sm:px-3.5 sm:py-2.5 ${
        isActive
          ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
          : isUrgent
            ? "border-amber-300 bg-amber-50 text-slate-900 hover:border-amber-400 hover:bg-amber-100"
            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm"
      }`}
    >
      <AdminNavIcon tabKey={item.key} isActive={isActive} />
      <span
        className={`admin-nav-card-label min-w-0 flex-1 whitespace-normal break-words text-[13px] font-semibold leading-snug sm:text-sm ${
          isActive ? "text-white" : "text-slate-900"
        }`}
      >
        {item.label}
      </span>
      {showCount ? (
        <span
          className={`ml-2 shrink-0 self-start rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums sm:self-center sm:px-2 sm:text-xs ${
            isActive
              ? "bg-indigo-500 text-white"
              : isUrgent
                ? "bg-amber-200 text-amber-900"
                : "bg-slate-100 text-slate-600"
          }`}
        >
          {item.count}
        </span>
      ) : null}
    </button>
  );
}

type BirthdaySortKey = "dob_oldest" | "dob_newest";
type BirthdayPresetFilter = "all" | "today" | "this_month" | "not_set";

const BIRTHDAY_PAGE_SIZE = 50;

/** Parse signup DOB (`users.birth_date`) as a local calendar date for sorting/filters. */
function parseBirthDateValue(value: string | null | undefined): Date | null {
  if (!value) return null;
  const iso = String(value).trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (match) {
    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
    );
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toDateInputValue(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatMembership(value: PendingVerificationUser["membershipType"]) {
  switch (value) {
    case "gold":
      return "Gold";

    case "platinum":
      return "Platinum";

    case "silver":
      return "Silver";

    default:
      return "Regular";
  }
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
  fraudReports,
  prioritySettings,
  profileChangeRequests,
  vehicles,
  routeMinimumFares,
  serviceRoleIssue = null,
  profileChangeRequestsError = null,
  vehiclesError = null,
  routeMinimumFaresError = null,
  supabaseHost = null,
}: DashboardTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [profileChangeFilter, setProfileChangeFilter] = useState<
    "pending" | "approved" | "rejected" | "all"
  >("pending");
  const [vehicleFilter, setVehicleFilter] = useState<
    "pending" | "approved" | "rejected" | "all"
  >("pending");

  useEffect(() => {
    const tab = searchParams.get("tab") as TabKey | null;

    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);
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
  const [userSearch, setUserSearch] = useState("");

  const [userMembership, setUserMembership] = useState("all");

  const [userVerification, setUserVerification] = useState("all");

  const [userStatusFilter, setUserStatusFilter] = useState("all");

  const [userFromDate, setUserFromDate] = useState("");

  const [userToDate, setUserToDate] = useState("");
  const [userSort, setUserSort] = useState<UserSortKey>("created_newest");
  const [birthdaySearch, setBirthdaySearch] = useState("");
  const [birthdayExactDate, setBirthdayExactDate] = useState("");
  const [birthdayFromDate, setBirthdayFromDate] = useState("");
  const [birthdayToDate, setBirthdayToDate] = useState("");
  const [birthdayPreset, setBirthdayPreset] =
    useState<BirthdayPresetFilter>("all");
  const [birthdaySort, setBirthdaySort] =
    useState<BirthdaySortKey>("dob_oldest");
  const [birthdayPage, setBirthdayPage] = useState(1);
  const [remarksDrafts, setRemarksDrafts] = useState<Record<string, string>>(
    {},
  );
  const [exportingRequirements, setExportingRequirements] = useState(false);
  const pendingCount = pendingVerificationUsers.length;
  const pendingProfileChangeCount = profileChangeRequests.filter(
    (r) => r.status === "pending",
  ).length;
  const filteredProfileChangeRequests = profileChangeRequests.filter((r) =>
    profileChangeFilter === "all" ? true : r.status === profileChangeFilter,
  );
  const pendingVehicleCount = vehicles.filter(
    (v) => v.verification_status === "pending",
  ).length;
  const filteredVehicles = vehicles.filter((v) =>
    vehicleFilter === "all" ? true : v.verification_status === vehicleFilter,
  );
  const rejectedPartialCount = rejectedPartialUsers.length;
  const notStartedCount = notStartedVerificationUsers.length;

  const quickAccessTabs = useMemo<NavTabItem[]>(
    () => [
      { key: "overview", label: "Analytics" },
      {
        key: "pending",
        label: "Pending Verification",
        count: pendingCount,
        highlightIfCountAboveZero: true,
      },
      {
        key: "car-verification",
        label: "Car Verification",
        count: pendingVehicleCount,
        highlightIfCountAboveZero: true,
      },
      { key: "users", label: "Users", count: users?.length || 0 },
      {
        key: "requirements",
        label: "Requirements",
        count: requirements?.length || 0,
      },
      {
        key: "fraud-reports",
        label: "Fraud Reports",
        count: fraudReports?.length || 0,
        highlightIfCountAboveZero: true,
      },
    ],
    [
      pendingCount,
      pendingVehicleCount,
      users?.length,
      requirements?.length,
      fraudReports?.length,
    ],
  );

  const allFeatureTabs = useMemo<NavTabItem[]>(
    () =>
      [
        { key: "about-us" as const, label: "About Us" },
        { key: "birthday-date" as const, label: "Birthday Date" },
        {
          key: "cities" as const,
          label: "Cities",
          count: cities.length || 0,
        },
        {
          key: "exchanges" as const,
          label: "Exchanges",
          count: exchanges?.length || 0,
        },
        { key: "in-app-popups" as const, label: "In-App Pop-ups" },
        {
          key: "not-started" as const,
          label: "Not Started",
          count: notStartedCount,
        },
        {
          key: "priority-settings" as const,
          label: "Priority Timeline",
        },
        {
          key: "profile-changes" as const,
          label: "Profile Changes",
          count: pendingProfileChangeCount,
        },
        {
          key: "rejected-partial" as const,
          label: "Rejected/Partial",
          count: rejectedPartialCount,
        },
        {
          key: "minimum-fares" as const,
          label: "Set Minimum Fare",
          count: routeMinimumFares.length,
        },
        {
          key: "sliders" as const,
          label: "Sliders",
          count: sliders?.length || 0,
        },
        {
          key: "winners" as const,
          label: "Winners",
          count: winnerUser.length,
        },
      ].sort((a, b) => a.label.localeCompare(b.label)),
    [
      cities.length,
      exchanges?.length,
      notStartedCount,
      pendingProfileChangeCount,
      rejectedPartialCount,
      routeMinimumFares.length,
      sliders?.length,
      winnerUser.length,
    ],
  );

  const [showWinnerModal, setShowWinnerModal] = useState(false);

  const [winnerUsers, setWinnerUsers] = useState<PendingVerificationUser[]>([]);

  const [selectedUserId, setSelectedUserId] = useState("");

  const [winnerDate, setWinnerDate] = useState("");

  const [winnerSlot, setWinnerSlot] = useState("");

  const [winnerImage, setWinnerImage] = useState("");

  const [winnerMediaType, setWinnerMediaType] =
    useState<WinnerMediaType>("image");

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

  const [showMinimumFareModal, setShowMinimumFareModal] = useState(false);
  const [editingMinimumFareId, setEditingMinimumFareId] = useState<
    string | null
  >(null);
  const [minFareFromCity, setMinFareFromCity] = useState("");
  const [minFareFromState, setMinFareFromState] = useState("");
  const [minFareToCity, setMinFareToCity] = useState("");
  const [minFareToState, setMinFareToState] = useState("");
  const [minFareAmount, setMinFareAmount] = useState("");
  const [minFareActive, setMinFareActive] = useState(true);
  const [savingMinimumFare, setSavingMinimumFare] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");

  const [errorMessage, setErrorMessage] = useState("");

  const [showSliderModal, setShowSliderModal] = useState(false);

  const [sliderImage, setSliderImage] = useState("");

  const [sliderMediaType, setSliderMediaType] =
    useState<SliderMediaType>("image");

  const [sliderStatus, setSliderStatus] = useState(true);

  const [sliderOrder, setSliderOrder] = useState(0);

  const [editingSliderId, setEditingSliderId] = useState<string | null>(null);

  const [savingSlider, setSavingSlider] = useState(false);

  const [sliderList, setSliderList] = useState(sliders);

  useEffect(() => {
    setSliderList(sliders);
  }, [sliders]);

  // UI labels: Diamond / Gold / Silver — DB columns stay legacy names.
  // all_platinum_minutes → Diamond, all_gold_minutes → Gold,
  // matching_platinum_minutes → Silver
  const [diamondMinutes, setDiamondMinutes] = useState(
    String(prioritySettings?.all_platinum_minutes ?? 4),
  );
  const [goldMinutes, setGoldMinutes] = useState(
    String(prioritySettings?.all_gold_minutes ?? 3),
  );
  const [silverMinutes, setSilverMinutes] = useState(
    String(prioritySettings?.matching_platinum_minutes ?? 4),
  );
  const [savingPrioritySettings, setSavingPrioritySettings] = useState(false);
  const [prioritySettingsMessage, setPrioritySettingsMessage] = useState<
    string | null
  >(null);

  useEffect(() => {
    setDiamondMinutes(String(prioritySettings?.all_platinum_minutes ?? 4));
    setGoldMinutes(String(prioritySettings?.all_gold_minutes ?? 3));
    setSilverMinutes(String(prioritySettings?.matching_platinum_minutes ?? 4));
  }, [prioritySettings]);

  const diamondPreview = Number(diamondMinutes) || 0;
  const goldPreview = Number(goldMinutes) || 0;
  const silverPreview = Number(silverMinutes) || 0;
  const everyoneAfterMinutes = diamondPreview + goldPreview + silverPreview;

  async function savePrioritySettings() {
    const diamond = Number(diamondMinutes);
    const gold = Number(goldMinutes);
    const silver = Number(silverMinutes);

    if (
      ![diamond, gold, silver].every(
        (n) => Number.isInteger(n) && n > 0 && n <= 1440,
      )
    ) {
      setPrioritySettingsMessage(
        "Each duration must be a whole number between 1 and 1440 minutes.",
      );
      return;
    }

    setSavingPrioritySettings(true);
    setPrioritySettingsMessage(null);

    try {
      const response = await fetch("/api/admin/priority-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Legacy column names — semantics: Diamond / Gold / Silver
          all_platinum_minutes: diamond,
          all_gold_minutes: gold,
          matching_platinum_minutes: silver,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setPrioritySettingsMessage(
          payload?.error ?? "Failed to save settings.",
        );
        return;
      }
      setDiamondMinutes(String(payload.all_platinum_minutes));
      setGoldMinutes(String(payload.all_gold_minutes));
      setSilverMinutes(String(payload.matching_platinum_minutes));
      const total =
        payload.all_platinum_minutes +
        payload.all_gold_minutes +
        payload.matching_platinum_minutes;
      setPrioritySettingsMessage(
        `Saved. Timeline: Diamond ${payload.all_platinum_minutes} + Gold ${payload.all_gold_minutes} + Silver ${payload.matching_platinum_minutes} = ${total} minutes to open access.`,
      );
    } catch {
      setPrioritySettingsMessage("Failed to save settings.");
    } finally {
      setSavingPrioritySettings(false);
    }
  }

  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const [showFraudModal, setShowFraudModal] = useState(false);

  const [fromUserId, setFromUserId] = useState("");
  const [toUserId, setToUserId] = useState("");
  const [fraudReason, setFraudReason] = useState("");
  const [fraudDescription, setFraudDescription] = useState("");

  const [savingFraud, setSavingFraud] = useState(false);
  const [editingFraudId, setEditingFraudId] = useState<string | null>(null);

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

  const updateMembership = async (
    userId: string,
    membershipType: string,
    membershipDurationDays?: number,
  ) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          membership_type: membershipType,
          membership_duration_days: membershipDurationDays,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed");
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to update membership");
    }
  };

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

  const filteredUsers = useMemo(() => {
    const filtered = users.filter((user) => {
      const search = userSearch.toLowerCase();

      const fullName =
        `${user.first_name ?? ""} ${user.last_name ?? ""}`.toLowerCase();

      const matchesSearch =
        fullName.includes(search) ||
        (user.phone ?? "").toLowerCase().includes(search) ||
        (user.email ?? "").toLowerCase().includes(search);

      const matchesMembership =
        userMembership === "all" || user.membership_type === userMembership;

      const matchesVerification =
        userVerification === "all"
          ? true
          : userVerification === "verified"
            ? user.verified
            : !user.verified;

      const matchesStatus =
        userStatusFilter === "all"
          ? true
          : userStatusFilter === "active"
            ? user.status
            : !user.status;

      const created = user.created_at ? new Date(user.created_at) : null;

      const matchesDate =
        (!userFromDate || (created && created >= new Date(userFromDate))) &&
        (!userToDate ||
          (created && created <= new Date(userToDate + "T23:59:59")));

      return (
        matchesSearch &&
        matchesMembership &&
        matchesVerification &&
        matchesStatus &&
        matchesDate
      );
    });

    const timeValue = (value: string | null | undefined) => {
      if (!value) return 0;
      const time = new Date(value).getTime();
      return Number.isNaN(time) ? 0 : time;
    };

    return [...filtered].sort((a, b) => {
      switch (userSort) {
        case "created_oldest":
          return timeValue(a.created_at) - timeValue(b.created_at);
        case "created_newest":
          return timeValue(b.created_at) - timeValue(a.created_at);
        case "last_active_least":
          return timeValue(a.last_active_at) - timeValue(b.last_active_at);
        case "last_active_recent":
          return timeValue(b.last_active_at) - timeValue(a.last_active_at);
        case "total_posts":
          return (b.total_posts ?? 0) - (a.total_posts ?? 0);
        case "rating":
          return (b.rating_average ?? 0) - (a.rating_average ?? 0);
        default:
          return 0;
      }
    });
  }, [
    users,
    userSearch,
    userMembership,
    userVerification,
    userStatusFilter,
    userFromDate,
    userToDate,
    userSort,
  ]);

  const filteredBirthdayUsers = useMemo(() => {
    const search = birthdaySearch.trim().toLowerCase();
    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();
    const thisMonth = todayMonth;

    const exact = birthdayExactDate
      ? parseBirthDateValue(birthdayExactDate)
      : null;
    const from = birthdayFromDate
      ? parseBirthDateValue(birthdayFromDate)
      : null;
    const to = birthdayToDate ? parseBirthDateValue(birthdayToDate) : null;

    const filtered = users.filter((user) => {
      const fullName =
        `${user.first_name ?? ""} ${user.last_name ?? ""}`.toLowerCase();
      const matchesSearch =
        !search ||
        fullName.includes(search) ||
        (user.phone ?? "").toLowerCase().includes(search) ||
        (user.email ?? "").toLowerCase().includes(search);

      if (!matchesSearch) return false;

      const dob = parseBirthDateValue(user.birth_date);

      if (birthdayPreset === "not_set") {
        return dob == null;
      }

      // Date-based filters require a DOB value
      const needsDob =
        birthdayPreset === "today" ||
        birthdayPreset === "this_month" ||
        Boolean(exact) ||
        Boolean(from) ||
        Boolean(to);

      if (dob == null) {
        return !needsDob;
      }

      if (birthdayPreset === "today") {
        if (dob.getMonth() + 1 !== todayMonth || dob.getDate() !== todayDay) {
          return false;
        }
      }

      if (birthdayPreset === "this_month") {
        if (dob.getMonth() + 1 !== thisMonth) return false;
      }

      if (exact) {
        if (
          dob.getFullYear() !== exact.getFullYear() ||
          dob.getMonth() !== exact.getMonth() ||
          dob.getDate() !== exact.getDate()
        ) {
          return false;
        }
      }

      if (from && dob < from) return false;
      if (to && dob > to) return false;

      return true;
    });

    const dobTime = (value: string | null | undefined) => {
      const parsed = parseBirthDateValue(value);
      return parsed ? parsed.getTime() : null;
    };

    return [...filtered].sort((a, b) => {
      const aTime = dobTime(a.birth_date);
      const bTime = dobTime(b.birth_date);

      // Missing DOB last for both sort directions
      if (aTime == null && bTime == null) return 0;
      if (aTime == null) return 1;
      if (bTime == null) return -1;

      return birthdaySort === "dob_oldest" ? aTime - bTime : bTime - aTime;
    });
  }, [
    users,
    birthdaySearch,
    birthdayExactDate,
    birthdayFromDate,
    birthdayToDate,
    birthdayPreset,
    birthdaySort,
  ]);

  const birthdayTotalPages = Math.max(
    1,
    Math.ceil(filteredBirthdayUsers.length / BIRTHDAY_PAGE_SIZE),
  );
  const birthdayPageSafe = Math.min(birthdayPage, birthdayTotalPages);
  const paginatedBirthdayUsers = useMemo(() => {
    const start = (birthdayPageSafe - 1) * BIRTHDAY_PAGE_SIZE;
    return filteredBirthdayUsers.slice(start, start + BIRTHDAY_PAGE_SIZE);
  }, [filteredBirthdayUsers, birthdayPageSafe]);

  useEffect(() => {
    setBirthdayPage(1);
  }, [
    birthdaySearch,
    birthdayExactDate,
    birthdayFromDate,
    birthdayToDate,
    birthdayPreset,
    birthdaySort,
  ]);

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
        label: "Regular",
        value: membership.regular,
        subtitle: "Regular Members",
        tab: "users",
        accent: "border-slate-200 bg-white text-slate-900",
      },
      {
        label: "Gold",
        value: membership.gold,
        subtitle: "Gold Members",
        tab: "users",
        accent: "border-yellow-100 bg-yellow-50 text-yellow-700",
      },
      {
        label: "Platinum",
        value: membership.platinum,
        subtitle: "Platinum Members",
        tab: "users",
        accent: "border-purple-100 bg-purple-50 text-purple-700",
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
      membership.gold,
      membership.platinum,
      membership.regular,
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
          media_type: winnerMediaType,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Create Winner API Error:", {
          status: response.status,
          response: errorText,
        });

        let message = `Create winner failed (${response.status})`;
        try {
          const parsed = JSON.parse(errorText) as {
            error?: string;
            message?: string;
          };
          message = parsed.error || parsed.message || message;
        } catch {
          if (errorText.trim()) message = errorText;
        }

        window.alert(message);
        throw new Error(message);
      }

      setShowWinnerModal(false);

      setSelectedUserId("");
      setWinnerDate("");
      setWinnerSlot("");
      setWinnerImage("");
      setWinnerMediaType("image");
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
          display_order: sliderOrder,
          media_type: sliderMediaType,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed");
      }

      setShowSliderModal(false);

      setSliderImage("");

      setSliderMediaType("image");

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

  const onSliderDragEnd = async (result: any) => {
    if (!result.destination) return;

    const items = Array.from(sliderList);

    const [moved] = items.splice(result.source.index, 1);

    items.splice(result.destination.index, 0, moved);

    const updated = items.map((item, index) => ({
      ...item,
      display_order: index + 1,
    }));

    setSliderList(updated);

    try {
      await fetch("/api/admin/sliders/reorder", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sliders: updated.map((x) => ({
            id: x.id,
            display_order: x.display_order,
          })),
        }),
      });

      router.replace("/dashboard?tab=sliders");
      router.refresh();
    } catch (e) {
      console.error(e);
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

  const updateWelcome = async (id: string, welcomeCompleted: boolean) => {
    try {
      setUpdatingUserId(id);

      const response = await fetch(`/api/admin/users/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          welcome_completed: welcomeCompleted,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update welcome status");
      }

      await router.refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to update welcome status");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const updateRemarks = async (id: string, remarks: string) => {
    const current = users.find((user) => user.id === id)?.admin_remarks ?? "";
    if (remarks === current) return;

    try {
      setUpdatingUserId(id);

      const response = await fetch(`/api/admin/users/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          admin_remarks: remarks,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update remarks");
      }

      setRemarksDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

      await router.refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to update remarks");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const exportActiveUsers = () => {
    exportToExcel({
      sheetName: "Active Users",
      filename: `active-users-${new Date().toISOString().slice(0, 10)}.xlsx`,
      rows: filteredUsers.map((user) => ({
        Name: `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || "-",
        Phone: cellDash(user.phone),
        Email: cellDash(user.email),
        Plan: user.membership_type ?? "regular",
        "Date of Birth": formatBirthDateCell(user.date_of_birth),
        "Birth Date": formatBirthDateCell(user.birth_date),
        "Blood Group": cellDash(user.blood_group),
        "Reference 1 Name": cellDash(user.reference_1_name),
        "Reference 1 Mobile": cellDash(user.reference_1_mobile),
        "Reference 2 Name": cellDash(user.reference_2_name),
        "Reference 2 Mobile": cellDash(user.reference_2_mobile),
        "User Roles": formatUserRolesCell(user.user_roles),
        "Membership Start": formatDateTime(user.membership_started_at),
        "Membership End": formatDateTime(user.membership_expires_at),
        Verification: user.verified ? "Verified" : "Pending",
        Status: user.status ? "ON" : "OFF",
        "Created At": formatDateTime(user.created_at),
        "Last Active": formatDateTime(user.last_active_at),
        "Welcome Completed": user.welcome_completed ? "Yes" : "No",
        "Admin Remarks": user.admin_remarks ?? "",
        "Total Requirements": user.requirement_count ?? 0,
        "Total Exchange Listings": user.exchange_count ?? 0,
        "Total Cab Available Listings": user.availability_count ?? 0,
        "Total Driver Listings": user.driver_requirement_count ?? 0,
        "Total Posts": user.total_posts ?? 0,
        Rating: user.rating_average != null ? Number(user.rating_average) : "-",
      })),
    });
  };

  const exportPendingUsers = () => {
    exportToExcel({
      sheetName: "Pending Users",
      filename: `pending-users-${new Date().toISOString().slice(0, 10)}.xlsx`,
      rows: pendingVerificationUsers.map((user) => ({
        Name: user.fullName,
        Phone: user.phone,
        Email: user.email,
        Membership: formatMembership(user.membershipType),
      })),
    });
  };

  const exportRequirements = () => {
    try {
      setExportingRequirements(true);

      const rows = (filteredRequirements ?? []).map((item) => {
        const userName =
          `${item.users?.first_name ?? ""} ${item.users?.last_name ?? ""}`.trim();
        const assignedName = item.assigned_user
          ? `${item.assigned_user.first_name ?? ""} ${item.assigned_user.last_name ?? ""}`.trim()
          : "";

        const source = [item.source_city, item.source_state]
          .filter(Boolean)
          .join(", ");
        const destination = [item.destination_city, item.destination_state]
          .filter(Boolean)
          .join(", ");

        const route =
          item.source_city || item.destination_city
            ? `${cellDash(item.source_city)} → ${cellDash(item.destination_city)}`
            : "-";

        return {
          User: cellDash(userName),
          Phone: cellDash(item.users?.phone),
          Route: route,
          Source: cellDash(source),
          Destination: cellDash(destination),
          "Car Type": cellDash(item.car_type),
          "Trip Type": cellDash(item.trip_type),
          Fare:
            item.price != null && String(item.price).trim() !== ""
              ? item.price
              : "-",
          "Journey Start": item.journey_start_at
            ? formatDateTime(item.journey_start_at)
            : "-",
          Status: item.booked ? "Booked" : "Pending",
          "Booked By": cellDash(assignedName),
          "Driver Phone": cellDash(item.assigned_user?.phone),
          "Booking Remark": cellDash(item.booking_remark),
          "Ride Type": cellDash(item.ride_type),
          "Created At": item.created_at ? formatDateTime(item.created_at) : "-",
        };
      });

      const statusSuffix =
        reqStatus === "booked"
          ? "_booked"
          : reqStatus === "pending"
            ? "_pending"
            : "";

      exportToExcel({
        sheetName: "Requirements",
        filename: `requirements${statusSuffix}_${new Date().toISOString().slice(0, 10)}.xlsx`,
        rows,
      });

      alert("Requirements exported successfully.");
    } catch (error) {
      console.error(error);
      alert("Failed to export requirements.");
    } finally {
      setExportingRequirements(false);
    }
  };

  const createFraud = async () => {
    try {
      setSavingFraud(true);

      const payload = {
        from_user_id: fromUserId,
        to_user_id: toUserId,
        reason: fraudReason,
        description: fraudDescription,
      };

      const response = editingFraudId
        ? await fetch(`/api/admin/fraud-reports/${editingFraudId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/fraud-reports", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

      if (!response.ok) {
        const errorData = await response.json();

        throw new Error(errorData.error || "Failed");
      }

      setShowFraudModal(false);

      setEditingFraudId(null);
      setFromUserId("");
      setToUserId("");
      setFraudReason("");
      setFraudDescription("");

      router.refresh();
    } catch (error) {
      console.error(error);

      alert(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSavingFraud(false);
    }
  };

  const deleteFraud = async (id: string) => {
    const confirmDelete = window.confirm("Delete this fraud report?");

    if (!confirmDelete) return;

    try {
      const response = await fetch(`/api/admin/fraud-reports/${id}`, {
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

  const resetMinimumFareForm = () => {
    setEditingMinimumFareId(null);
    setMinFareFromCity("");
    setMinFareFromState("");
    setMinFareToCity("");
    setMinFareToState("");
    setMinFareAmount("");
    setMinFareActive(true);
  };

  const saveMinimumFare = async () => {
    try {
      setSavingMinimumFare(true);
      setErrorMessage("");
      const payload = {
        from_city: minFareFromCity,
        from_state: minFareFromState,
        to_city: minFareToCity,
        to_state: minFareToState,
        minimum_fare: Number(minFareAmount),
        is_active: minFareActive,
      };
      const url = editingMinimumFareId
        ? `/api/admin/minimum-fares/${editingMinimumFareId}`
        : "/api/admin/minimum-fares";
      const method = editingMinimumFareId ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };
      if (!response.ok || result.ok === false) {
        throw new Error(result.error ?? "Failed to save minimum fare.");
      }
      setSuccessMessage(
        editingMinimumFareId
          ? "Minimum fare rule updated."
          : "Minimum fare rule created.",
      );
      setShowMinimumFareModal(false);
      resetMinimumFareForm();
      setTimeout(() => setSuccessMessage(""), 3000);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong",
      );
      setTimeout(() => setErrorMessage(""), 4000);
    } finally {
      setSavingMinimumFare(false);
    }
  };

  const toggleMinimumFareActive = async (id: string, nextActive: boolean) => {
    try {
      setErrorMessage("");
      const response = await fetch(`/api/admin/minimum-fares/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: nextActive }),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };
      if (!response.ok || result.ok === false) {
        throw new Error(result.error ?? "Failed to update status.");
      }
      setSuccessMessage(nextActive ? "Rule activated." : "Rule deactivated.");
      setTimeout(() => setSuccessMessage(""), 3000);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong",
      );
      setTimeout(() => setErrorMessage(""), 4000);
    }
  };

  const deleteMinimumFare = async (id: string) => {
    if (!window.confirm("Delete this minimum fare rule?")) return;
    try {
      const response = await fetch(`/api/admin/minimum-fares/${id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };
      if (!response.ok || result.ok === false) {
        throw new Error(result.error ?? "Failed to delete rule.");
      }
      setSuccessMessage("Minimum fare rule deleted.");
      setTimeout(() => setSuccessMessage(""), 3000);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong",
      );
      setTimeout(() => setErrorMessage(""), 4000);
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
      <header className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
              Admin Dashboard
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:mt-1.5 sm:text-3xl">
              Sai ki Gadi Verification Console
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Monitor signup analytics and manually verify document uploads.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={logout}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      {showRlsHint ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">Admin cannot bypass RLS</p>
          <p className="mt-1">
            Profile Change Requests stay empty until a real{" "}
            <strong>server-only</strong> service-role/secret key is set for the
            same Supabase project this Admin Panel is connected to.
          </p>
          {serviceRoleIssue ? (
            <p className="mt-2">
              Detected issue: <code>{serviceRoleIssue}</code>
            </p>
          ) : null}
          <p className="mt-2">
            Connected host: <code>{supabaseHost || "unknown"}</code>. In
            Supabase Dashboard for that project → Settings → API Keys, copy the{" "}
            <strong>secret</strong> / service_role key into{" "}
            <code>SUPABASE_SERVICE_ROLE_KEY</code> in <code>.env.local</code>{" "}
            (not <code>NEXT_PUBLIC_*</code>), then restart Next.js. Do not use
            the publishable/anon key.
          </p>
        </div>
      ) : null}

      {profileChangeRequestsError ? (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          Failed to load profile change requests: {profileChangeRequestsError}
        </div>
      ) : null}

      <nav className="mb-5 space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            Quick Access
          </h2>
          <div className="grid grid-cols-2 gap-2 max-[360px]:grid-cols-1 md:grid-cols-3 lg:gap-2.5">
            {quickAccessTabs.map((item) => (
              <AdminNavCard
                key={item.key}
                item={item}
                isActive={activeTab === item.key}
                onSelect={setActiveTab}
              />
            ))}
          </div>
        </section>

        <div className="border-t border-slate-100" />

        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            All Admin Features
          </h2>
          <div className="grid grid-cols-2 gap-2 max-[360px]:grid-cols-1 md:grid-cols-3 lg:gap-2.5 xl:grid-cols-4">
            {allFeatureTabs.map((item) => (
              <AdminNavCard
                key={item.key}
                item={item}
                isActive={activeTab === item.key}
                onSelect={setActiveTab}
              />
            ))}
          </div>
        </section>
      </nav>

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
        <>
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={exportPendingUsers}
              className="h-11 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Export to Excel
            </button>
          </div>
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
                        <td className="px-4 py-3 text-slate-600">
                          {user.phone}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {user.email}
                        </td>
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
        </>
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
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={exportActiveUsers}
              className="h-11 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Export to Excel
            </button>
          </div>
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3 overflow-x-auto pb-1">
              <input
                type="text"
                placeholder="Search Name / Phone / Email"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="h-11 w-72 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 placeholder:text-slate-400"
              />

              <select
                value={userMembership}
                onChange={(e) => setUserMembership(e.target.value)}
                className="h-11 rounded-lg border border-slate-300 px-4 text-slate-900"
              >
                <option value="all">All Membership</option>
                <option value="regular">Regular</option>
                <option value="gold">Gold</option>
              </select>

              <select
                value={userVerification}
                onChange={(e) => setUserVerification(e.target.value)}
                className="h-11 rounded-lg border border-slate-300 px-4 text-slate-900"
              >
                <option value="all">All Verification</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
              </select>

              <select
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value)}
                className="h-11 rounded-lg border border-slate-300 px-4 text-slate-900"
              >
                <option value="all">All Status</option>
                <option value="active">ON</option>
                <option value="inactive">OFF</option>
              </select>

              <select
                value={userSort}
                onChange={(e) => setUserSort(e.target.value as UserSortKey)}
                className="h-11 rounded-lg border border-slate-300 px-4 text-slate-900"
              >
                <option value="created_newest">Created Date: Newest</option>
                <option value="created_oldest">Created Date: Oldest</option>
                <option value="last_active_recent">
                  Last Active: Most Recent
                </option>
                <option value="last_active_least">
                  Last Active: Least Recent
                </option>
                <option value="total_posts">Total Posts</option>
                <option value="rating">Rating</option>
              </select>

              <input
                type="date"
                value={userFromDate}
                onChange={(e) => setUserFromDate(e.target.value)}
                className="h-11 rounded-lg border border-slate-300 px-4 text-slate-900"
              />

              <input
                type="date"
                value={userToDate}
                onChange={(e) => setUserToDate(e.target.value)}
                className="h-11 rounded-lg border border-slate-300 px-4 text-slate-900"
              />

              <button
                onClick={() => {
                  setUserSearch("");
                  setUserMembership("all");
                  setUserVerification("all");
                  setUserStatusFilter("all");
                  setUserFromDate("");
                  setUserToDate("");
                  setUserSort("created_newest");
                }}
                className="h-11 whitespace-nowrap rounded-lg bg-red-500 px-4 text-white"
              >
                Reset
              </button>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                      User
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                      Phone
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                      Email
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                      Plan
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                      Date of Birth
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                      Birth Date
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                      Blood Group
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                      Reference 1 Name
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                      Reference 1 Mobile
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                      Reference 2 Name
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                      Reference 2 Mobile
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                      User Roles
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                      Created At
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                      Last Active
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-600">
                      Welcome Completed
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                      Admin Remarks
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-600">
                      Total Requirements
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-600">
                      Total Exchange Listings
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-600">
                      Total Cab Available Listings
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-600">
                      Total Driver Listings
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-600">
                      Total Posts
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-600">
                      Rating
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                      Membership Start
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                      Membership End
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                      Verification
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-600">
                      Status
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td
                        className="px-4 py-10 text-center text-slate-500"
                        colSpan={27}
                      >
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        onClick={() =>
                          router.push(`/dashboard/users/${user.id}?tab=users`)
                        }
                        className={`cursor-pointer hover:bg-slate-50 transition-all ${
                          updatingUserId === user.id
                            ? "opacity-50 pointer-events-none"
                            : ""
                        }`}
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">
                          {user.first_name ?? "-"} {user.last_name ?? "-"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                          {cellDash(user.phone)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                          {cellDash(user.email)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div onClick={(e) => e.stopPropagation()}>
                            <select
                              defaultValue={user.membership_type ?? "regular"}
                              className="rounded-lg border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-800"
                              onChange={(e) => {
                                const type = e.target.value;

                                if (type === "gold") {
                                  const duration = Number(
                                    prompt(
                                      "Enter membership duration in days\n\nExamples:\n7\n30\n90\n180\n365",
                                      "30",
                                    ),
                                  );

                                  if (!duration || duration <= 0) {
                                    return;
                                  }

                                  updateMembership(user.id, "gold", duration);
                                } else {
                                  updateMembership(user.id, "regular");
                                }
                              }}
                            >
                              <option value="regular">Regular</option>
                              <option value="gold">Gold</option>
                            </select>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {formatBirthDateCell(user.date_of_birth)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {formatBirthDateCell(user.birth_date)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {cellDash(user.blood_group)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {cellDash(user.reference_1_name)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {cellDash(user.reference_1_mobile)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {cellDash(user.reference_2_name)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {cellDash(user.reference_2_mobile)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {formatUserRolesCell(user.user_roles)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {formatDateTime(user.created_at)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {formatDateTime(user.last_active_at)}
                        </td>
                        <td
                          className="whitespace-nowrap px-4 py-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            disabled={updatingUserId === user.id}
                            onClick={() =>
                              updateWelcome(
                                user.id,
                                !Boolean(user.welcome_completed),
                              )
                            }
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                              user.welcome_completed
                                ? "bg-emerald-500"
                                : "bg-slate-300"
                            }`}
                            title={
                              user.welcome_completed
                                ? "Welcome completed"
                                : "Welcome pending"
                            }
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                user.welcome_completed
                                  ? "translate-x-6"
                                  : "translate-x-1"
                              }`}
                            />
                          </button>
                        </td>
                        <td
                          className="min-w-[180px] px-4 py-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={
                              remarksDrafts[user.id] ?? user.admin_remarks ?? ""
                            }
                            disabled={updatingUserId === user.id}
                            onChange={(e) =>
                              setRemarksDrafts((prev) => ({
                                ...prev,
                                [user.id]: e.target.value,
                              }))
                            }
                            onBlur={(e) =>
                              updateRemarks(user.id, e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.currentTarget.blur();
                              }
                            }}
                            placeholder="Add remarks..."
                            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-800"
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center font-semibold text-slate-800">
                          {user.requirement_count ?? 0}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center font-semibold text-slate-800">
                          {user.exchange_count ?? 0}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center font-semibold text-slate-800">
                          {user.availability_count ?? 0}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center font-semibold text-slate-800">
                          {user.driver_requirement_count ?? 0}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center font-semibold text-slate-800">
                          {user.total_posts ?? 0}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center font-semibold text-slate-800">
                          {user.rating_average != null
                            ? Number(user.rating_average).toFixed(2)
                            : "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">
                          {user.membership_started_at
                            ? new Date(
                                user.membership_started_at,
                              ).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">
                          {user.membership_expires_at
                            ? new Date(
                                user.membership_expires_at,
                              ).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
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
                        <td className="whitespace-nowrap px-4 py-3">
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
                        <td className="whitespace-nowrap px-4 py-3">
                          <div
                            className="flex items-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
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
      ) : activeTab === "birthday-date" ? (
        <>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900">Birthday Date</h2>
            <p className="mt-1 text-sm text-slate-600">
              Search and filter users by signup Date of Birth (
              <code className="text-xs">birth_date</code>).
            </p>
          </div>

          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                placeholder="Search users..."
                value={birthdaySearch}
                onChange={(e) => setBirthdaySearch(e.target.value)}
                className="h-11 w-72 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 placeholder:text-slate-400"
              />

              <label className="flex items-center gap-2 text-sm text-slate-600">
                <span className="whitespace-nowrap">Specific date</span>
                <input
                  type="date"
                  value={birthdayExactDate}
                  onChange={(e) => setBirthdayExactDate(e.target.value)}
                  className="h-11 rounded-lg border border-slate-300 px-4 text-slate-900"
                />
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-600">
                <span className="whitespace-nowrap">From</span>
                <input
                  type="date"
                  value={birthdayFromDate}
                  onChange={(e) => setBirthdayFromDate(e.target.value)}
                  className="h-11 rounded-lg border border-slate-300 px-4 text-slate-900"
                />
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-600">
                <span className="whitespace-nowrap">To</span>
                <input
                  type="date"
                  value={birthdayToDate}
                  onChange={(e) => setBirthdayToDate(e.target.value)}
                  className="h-11 rounded-lg border border-slate-300 px-4 text-slate-900"
                />
              </label>

              <select
                value={birthdayPreset}
                onChange={(e) =>
                  setBirthdayPreset(e.target.value as BirthdayPresetFilter)
                }
                className="h-11 rounded-lg border border-slate-300 px-4 text-slate-900"
              >
                <option value="all">All</option>
                <option value="today">Today&apos;s Birthday</option>
                <option value="this_month">This Month</option>
                <option value="not_set">Date of Birth Not Set</option>
              </select>

              <select
                value={birthdaySort}
                onChange={(e) =>
                  setBirthdaySort(e.target.value as BirthdaySortKey)
                }
                className="h-11 rounded-lg border border-slate-300 px-4 text-slate-900"
              >
                <option value="dob_oldest">DOB: Oldest → Newest</option>
                <option value="dob_newest">DOB: Newest → Oldest</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  setBirthdaySearch("");
                  setBirthdayExactDate("");
                  setBirthdayFromDate("");
                  setBirthdayToDate("");
                  setBirthdayPreset("all");
                  setBirthdaySort("dob_oldest");
                  setBirthdayPage(1);
                }}
                className="h-11 whitespace-nowrap rounded-lg bg-red-500 px-4 text-white"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="mb-3 text-sm text-slate-600">
            Showing {paginatedBirthdayUsers.length} of{" "}
            {filteredBirthdayUsers.length} users
            {birthdayPreset === "today"
              ? ` · Today (${toDateInputValue(new Date())})`
              : ""}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                      Name
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                      Email
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                      Phone
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                      Date of Birth
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                      Plan
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                      Verification
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-600">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedBirthdayUsers.length === 0 ? (
                    <tr>
                      <td
                        className="px-4 py-10 text-center text-slate-500"
                        colSpan={7}
                      >
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    paginatedBirthdayUsers.map((user) => (
                      <tr
                        key={user.id}
                        onClick={() =>
                          router.push(
                            `/dashboard/users/${user.id}?tab=birthday-date`,
                          )
                        }
                        className="cursor-pointer transition-all hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">
                          {`${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() ||
                            "-"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                          {cellDash(user.email)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                          {cellDash(user.phone)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {formatBirthDateCell(user.birth_date)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {formatMembership(
                            user.membership_type === "gold" ||
                              user.membership_type === "silver" ||
                              user.membership_type === "platinum"
                              ? user.membership_type
                              : "regular",
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              user.verified
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {user.verified ? "Verified" : "Pending"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              user.status
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {user.status ? "ON" : "OFF"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {filteredBirthdayUsers.length > BIRTHDAY_PAGE_SIZE ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-600">
                Page {birthdayPageSafe} of {birthdayTotalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={birthdayPageSafe <= 1}
                  onClick={() =>
                    setBirthdayPage((page) => Math.max(1, page - 1))
                  }
                  className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={birthdayPageSafe >= birthdayTotalPages}
                  onClick={() =>
                    setBirthdayPage((page) =>
                      Math.min(birthdayTotalPages, page + 1),
                    )
                  }
                  className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : activeTab === "requirements" ? (
        <>
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={exportRequirements}
              disabled={exportingRequirements}
              className="h-11 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {exportingRequirements ? "Exporting..." : "Export to Excel"}
            </button>
          </div>
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
      ) : activeTab === "fraud-reports" ? (
        <>
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => {
                setEditingFraudId(null);
                setFromUserId("");
                setToUserId("");
                setFraudReason("");
                setFraudDescription("");
                setShowFraudModal(true);
              }}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Report Fraud
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold text-slate-800">
                      Reporter
                    </th>
                    <th className="px-6 py-4 text-left font-bold text-slate-800">
                      Reported User
                    </th>
                    <th className="px-6 py-4 text-left font-bold text-slate-800">
                      Reason
                    </th>
                    <th className="px-6 py-4 text-left font-bold text-slate-800">
                      Description
                    </th>
                    <th className="px-6 py-4 text-left font-bold text-slate-800">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left font-bold text-slate-800">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {(fraudReports ?? []).length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-slate-500"
                      >
                        No fraud reports found.
                      </td>
                    </tr>
                  ) : (
                    (fraudReports ?? []).map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-slate-700">
                          {item.from_user?.first_name}
                        </td>

                        <td className="px-6 py-4 text-slate-700">
                          {item.to_user?.first_name}
                        </td>

                        <td className="px-6 py-4 text-slate-700">
                          {item.reason}
                        </td>

                        <td className="px-6 py-4 text-slate-700">
                          {item.description || "-"}
                        </td>

                        <td className="px-6 py-4 text-slate-700">
                          {new Date(item.created_at).toLocaleDateString()}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingFraudId(item.id);

                                setFromUserId(item.from_user_id);
                                setToUserId(item.to_user_id);

                                setFraudReason(item.reason);
                                setFraudDescription(item.description || "");

                                setShowFraudModal(true);
                              }}
                              className="rounded bg-amber-100 px-3 py-1 text-amber-700"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => deleteFraud(item.id)}
                              className="rounded bg-red-100 px-3 py-1 text-red-700"
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
      ) : activeTab === "sliders" ? (
        <>
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => {
                setEditingSliderId(null);

                setSliderImage("");

                setSliderMediaType("image");

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
                      Media
                    </th>

                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Type
                    </th>

                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Status
                    </th>

                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Display Order
                    </th>

                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Actions
                    </th>
                  </tr>
                </thead>

                <DragDropContext onDragEnd={onSliderDragEnd}>
                  <Droppable droppableId="sliders">
                    {(provided) => (
                      <tbody
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="divide-y divide-slate-100"
                      >
                        {sliders?.length === 0 ? (
                          <tr>
                            <td
                              className="px-4 py-10 text-center text-slate-500"
                              colSpan={5}
                            >
                              No sliders found.
                            </td>
                          </tr>
                        ) : (
                          sliderList.map((slider, index) => (
                            <Draggable
                              key={slider.id}
                              draggableId={slider.id}
                              index={index}
                            >
                              {(provided) => (
                                <tr
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className="hover:bg-slate-50 cursor-grab"
                                >
                                  <td className="px-4 py-3">
                                    {slider.media_type === "video" ? (
                                      <video
                                        src={slider.image}
                                        className="aspect-[10/5] w-40 rounded-xl object-cover"
                                        muted
                                        playsInline
                                        preload="metadata"
                                      />
                                    ) : (
                                      <img
                                        src={slider.image}
                                        alt="slider"
                                        className="aspect-[10/5] w-40 rounded-xl object-cover"
                                      />
                                    )}
                                  </td>

                                  <td className="px-4 py-3">
                                    <span
                                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                        slider.media_type === "video"
                                          ? "bg-violet-100 text-violet-700"
                                          : "bg-sky-100 text-sky-700"
                                      }`}
                                    >
                                      {slider.media_type === "video"
                                        ? "Video"
                                        : "Image"}
                                    </span>
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

                                  <td className="px-4 py-3 font-bold text-slate-700">
                                    {slider.display_order}
                                  </td>

                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => {
                                          setEditingSliderId(slider.id);
                                          setSliderImage(slider.image);
                                          setSliderMediaType(
                                            slider.media_type === "video"
                                              ? "video"
                                              : "image",
                                          );
                                          setSliderStatus(slider.status);
                                          setSliderOrder(slider.display_order);
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
                              )}
                            </Draggable>
                          ))
                        )}
                        {provided.placeholder}
                      </tbody>
                    )}
                  </Droppable>
                </DragDropContext>
              </table>
            </div>
          </div>
        </>
      ) : activeTab === "priority-settings" ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">
            Priority Timeline Settings
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Durations control Requirement feed access windows in this order:
            Diamond → Gold → Silver → Everyone. Changes apply on the next feed
            load — no app deploy required.
          </p>

          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Diamond Priority Duration
              </label>
              <p className="mb-2 text-xs text-slate-500">
                Gold membership purchased and trip_points &gt; 0
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={diamondMinutes}
                  onChange={(e) => setDiamondMinutes(e.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-indigo-500"
                />
                <span className="text-sm font-medium text-slate-500">
                  Minutes
                </span>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Gold Priority Duration
              </label>
              <p className="mb-2 text-xs text-slate-500">
                Gold membership purchased (trip_points not required)
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={goldMinutes}
                  onChange={(e) => setGoldMinutes(e.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-indigo-500"
                />
                <span className="text-sm font-medium text-slate-500">
                  Minutes
                </span>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Silver Priority Duration
              </label>
              <p className="mb-2 text-xs text-slate-500">
                trip_points &gt; 0 (Gold membership not required)
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={silverMinutes}
                  onChange={(e) => setSilverMinutes(e.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-indigo-500"
                />
                <span className="text-sm font-medium text-slate-500">
                  Minutes
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Preview timeline</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>0–{diamondPreview} min → Diamond</li>
              <li>Next {goldPreview} min → Gold</li>
              <li>Next {silverPreview} min → Silver</li>
              <li>After {everyoneAfterMinutes} min → Everyone</li>
            </ol>
          </div>

          {prioritySettingsMessage ? (
            <p className="mt-4 text-sm font-medium text-indigo-700">
              {prioritySettingsMessage}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => void savePrioritySettings()}
            disabled={savingPrioritySettings}
            className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savingPrioritySettings ? "Saving..." : "Save Settings"}
          </button>
        </div>
      ) : activeTab === "profile-changes" ? (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">
              Profile Change Requests
            </h2>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["pending", "Pending"],
                  ["approved", "Approved"],
                  ["rejected", "Rejected"],
                  ["all", "All"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setProfileChangeFilter(value)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                    profileChangeFilter === value
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-slate-600 border border-slate-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
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
                      Changes
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Requested
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProfileChangeRequests.length === 0 ? (
                    <tr>
                      <td
                        className="px-4 py-10 text-center text-slate-500"
                        colSpan={4}
                      >
                        No profile change requests in this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredProfileChangeRequests.map((req) => {
                      const name =
                        `${req.users?.first_name ?? ""} ${req.users?.last_name ?? ""}`.trim() ||
                        req.users?.phone ||
                        req.user_id;
                      const changeCount = Array.isArray(req.requested_changes)
                        ? req.requested_changes.length
                        : 0;
                      return (
                        <tr
                          key={req.id}
                          className="cursor-pointer hover:bg-slate-50"
                          onClick={() =>
                            router.push(`/dashboard/profile-changes/${req.id}`)
                          }
                        >
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">
                              {name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {req.users?.phone || "—"}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {changeCount} field
                            {changeCount === 1 ? "" : "s"}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {formatDateTime(req.requested_at)}
                          </td>
                          <td className="px-4 py-3 capitalize text-slate-700">
                            {req.status}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : activeTab === "car-verification" ? (
        <>
          {vehiclesError ? (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              Failed to load vehicles: {vehiclesError}
            </div>
          ) : null}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">
              Car Verification
            </h2>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["pending", "Pending"],
                  ["approved", "Approved"],
                  ["rejected", "Rejected"],
                  ["all", "All"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setVehicleFilter(value)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                    vehicleFilter === value
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-slate-600 border border-slate-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
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
                      Registration Number
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Submitted
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVehicles.length === 0 ? (
                    <tr>
                      <td
                        className="px-4 py-10 text-center text-slate-500"
                        colSpan={4}
                      >
                        No vehicles in this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredVehicles.map((vehicle) => {
                      const name =
                        `${vehicle.users?.first_name ?? ""} ${vehicle.users?.last_name ?? ""}`.trim() ||
                        vehicle.users?.phone ||
                        vehicle.user_id;
                      return (
                        <tr
                          key={vehicle.id}
                          className="cursor-pointer hover:bg-slate-50"
                          onClick={() =>
                            router.push(
                              `/dashboard/car-verification/${vehicle.id}`,
                            )
                          }
                        >
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">
                              {name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {vehicle.users?.phone || "—"}
                            </p>
                          </td>
                          <td className="px-4 py-3 font-semibold tracking-wide text-slate-800">
                            {vehicle.registration_number}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {formatDateTime(vehicle.created_at)}
                          </td>
                          <td className="px-4 py-3 capitalize text-slate-700">
                            {vehicle.verification_status}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : activeTab === "minimum-fares" ? (
        <>
          {routeMinimumFaresError ? (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              Failed to load minimum fares: {routeMinimumFaresError}
            </div>
          ) : null}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Set Minimum Fare
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Directional city+state rules. Rajkot → Ahmedabad is separate
                from Ahmedabad → Rajkot.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                resetMinimumFareForm();
                setShowMinimumFareModal(true);
              }}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Add Rule
            </button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      From City
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      From State
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      To City
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      To State
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Minimum Fare
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Created At
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Updated At
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {routeMinimumFares.length === 0 ? (
                    <tr>
                      <td
                        className="px-4 py-10 text-center text-slate-500"
                        colSpan={9}
                      >
                        No minimum fare rules yet.
                      </td>
                    </tr>
                  ) : (
                    routeMinimumFares.map((rule) => (
                      <tr key={rule.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {rule.from_city}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {rule.from_state}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {rule.to_city}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {rule.to_state}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          ₹{Number(rule.minimum_fare).toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              rule.is_active
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {rule.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {formatDateTime(rule.created_at)}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {formatDateTime(rule.updated_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMinimumFareId(rule.id);
                                setMinFareFromCity(rule.from_city);
                                setMinFareFromState(rule.from_state);
                                setMinFareToCity(rule.to_city);
                                setMinFareToState(rule.to_state);
                                setMinFareAmount(String(rule.minimum_fare));
                                setMinFareActive(rule.is_active);
                                setShowMinimumFareModal(true);
                              }}
                              className="rounded-lg bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-200"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void toggleMinimumFareActive(
                                  rule.id,
                                  !rule.is_active,
                                )
                              }
                              className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                            >
                              {rule.is_active ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteMinimumFare(rule.id)}
                              className="rounded-lg bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-200"
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
      ) : activeTab === "about-us" ? (
        <AboutUsAdminPanel />
      ) : activeTab === "in-app-popups" ? (
        <InAppAnnouncementsAdminPanel />
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
                setWinnerMediaType("image");

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
                      Media
                    </th>

                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Type
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
                        colSpan={7}
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
                            winner.media_type === "video" ? (
                              <video
                                src={winner.image}
                                className="aspect-[10/7] w-28 rounded-xl object-cover"
                                muted
                                playsInline
                                preload="metadata"
                              />
                            ) : (
                              <img
                                src={winner.image}
                                alt="winner"
                                className="aspect-[10/7] w-28 rounded-xl object-cover"
                              />
                            )
                          ) : (
                            <span className="text-slate-400">No Media</span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              winner.media_type === "video"
                                ? "bg-violet-100 text-violet-700"
                                : "bg-sky-100 text-sky-700"
                            }`}
                          >
                            {winner.media_type === "video" ? "Video" : "Image"}
                          </span>
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
                                setWinnerMediaType(
                                  winner.media_type === "video"
                                    ? "video"
                                    : "image",
                                );

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
      {showFraudModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {editingFraudId ? "Edit Fraud Report" : "Report Fraud"}
              </h2>

              <button
                onClick={() => setShowFraudModal(false)}
                className="text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <select
                value={fromUserId}
                onChange={(e) => setFromUserId(e.target.value)}
                className="h-12 w-full rounded-xl border border-slate-300 px-4 text-slate-900 bg-white"
              >
                <option value="">Report By</option>

                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name}
                  </option>
                ))}
              </select>

              <select
                value={toUserId}
                onChange={(e) => setToUserId(e.target.value)}
                className="h-12 w-full rounded-xl border border-slate-300 px-4 text-slate-900 bg-white"
              >
                <option value="">Fraud User</option>

                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name}
                  </option>
                ))}
              </select>

              <select
                value={fraudReason}
                onChange={(e) => setFraudReason(e.target.value)}
                className="h-12 w-full rounded-xl border border-slate-300 px-4 text-slate-900 bg-white"
              >
                <option value="">Select Reason</option>
                <option value="Payment Fraud">Payment Fraud</option>
                <option value="Fake Booking">Fake Booking</option>
                <option value="Spam">Spam</option>
                <option value="Misbehavior">Misbehavior</option>
              </select>

              <textarea
                value={fraudDescription}
                onChange={(e) => setFraudDescription(e.target.value)}
                placeholder="Description"
                className="w-full rounded-xl border border-slate-300 p-3 text-slate-900 placeholder:text-slate-400 bg-white"
                rows={4}
              />

              <button
                onClick={createFraud}
                disabled={savingFraud}
                className="w-full rounded-xl bg-red-600 py-3 font-semibold text-white"
              >
                {savingFraud ? "Saving..." : "Save Report"}
              </button>
            </div>
          </div>
        </div>
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
                  setWinnerMediaType("image");
                }}
                className="text-slate-500 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Media Type
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setWinnerMediaType("image");
                      if (!editingWinnerId) {
                        setWinnerImage("");
                      }
                    }}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                      winnerMediaType === "image"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Image
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setWinnerMediaType("video");
                      if (!editingWinnerId) {
                        setWinnerImage("");
                      }
                    }}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                      winnerMediaType === "video"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Video
                  </button>
                </div>
              </div>

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
                  {winnerMediaType === "video"
                    ? "Upload Video"
                    : "Upload Image"}
                </label>

                <input
                  type="file"
                  accept={
                    winnerMediaType === "video"
                      ? "video/mp4,video/quicktime,video/webm"
                      : "image/*"
                  }
                  onChange={async (e) => {
                    const file = e.target.files?.[0];

                    if (!file) return;

                    try {
                      setUploadingImage(true);

                      const formData = new FormData();

                      formData.append("file", file);
                      formData.append("mediaKind", winnerMediaType);

                      const response = await fetch("/api/admin/upload", {
                        method: "POST",
                        body: formData,
                      });

                      const data = await response.json();

                      if (!response.ok) {
                        throw new Error(data.error || "Upload failed");
                      }

                      setWinnerImage(data.url);
                    } catch (error) {
                      console.error(error);
                      window.alert(
                        error instanceof Error
                          ? error.message
                          : "Upload failed",
                      );
                    } finally {
                      setUploadingImage(false);
                    }
                  }}
                  className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-indigo-700"
                />

                {winnerImage ? (
                  winnerMediaType === "video" ? (
                    <video
                      src={winnerImage}
                      controls
                      className="mt-4 aspect-[10/7] w-full rounded-2xl object-cover"
                    />
                  ) : (
                    <img
                      src={winnerImage}
                      alt="preview"
                      className="mt-4 aspect-[10/7] w-full rounded-2xl object-cover"
                    />
                  )
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
                  ? winnerMediaType === "video"
                    ? "Uploading Video..."
                    : "Uploading Image..."
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

                  setSliderMediaType("image");

                  setSliderStatus(true);

                  setSliderOrder(0);
                }}
                className="text-slate-500 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Media Type
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSliderMediaType("image");
                      if (!editingSliderId) {
                        setSliderImage("");
                      }
                    }}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                      sliderMediaType === "image"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Image
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSliderMediaType("video");
                      if (!editingSliderId) {
                        setSliderImage("");
                      }
                    }}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                      sliderMediaType === "video"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Video
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {sliderMediaType === "video"
                    ? "Upload Video"
                    : "Upload Image"}
                </label>

                <input
                  type="file"
                  accept={
                    sliderMediaType === "video"
                      ? "video/mp4,video/quicktime,video/webm"
                      : "image/*"
                  }
                  onChange={async (e) => {
                    const file = e.target.files?.[0];

                    if (!file) return;

                    try {
                      setUploadingImage(true);

                      const formData = new FormData();

                      formData.append("file", file);
                      formData.append("mediaKind", sliderMediaType);

                      const response = await fetch("/api/admin/upload", {
                        method: "POST",
                        body: formData,
                      });

                      const data = await response.json();

                      if (!response.ok) {
                        throw new Error(data.error || "Upload failed");
                      }

                      setSliderImage(data.url);
                    } catch (error) {
                      console.error(error);
                      window.alert(
                        error instanceof Error
                          ? error.message
                          : "Upload failed",
                      );
                    } finally {
                      setUploadingImage(false);
                    }
                  }}
                  className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
                />

                {sliderImage ? (
                  sliderMediaType === "video" ? (
                    <video
                      src={sliderImage}
                      controls
                      className="mt-4 aspect-[10/5] w-full rounded-2xl object-cover"
                    />
                  ) : (
                    <img
                      src={sliderImage}
                      alt="preview"
                      className="mt-4 aspect-[10/5] w-full rounded-2xl object-cover"
                    />
                  )
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Display Order
                </label>

                <input
                  type="number"
                  min="0"
                  placeholder="Enter display order"
                  value={sliderOrder}
                  onChange={(e) => setSliderOrder(Number(e.target.value))}
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-indigo-500"
                />
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

      {showMinimumFareModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {editingMinimumFareId
                  ? "Edit Minimum Fare"
                  : "Add Minimum Fare"}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowMinimumFareModal(false);
                  resetMinimumFareForm();
                }}
                className="text-slate-500 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    From City
                  </label>
                  <input
                    type="text"
                    value={minFareFromCity}
                    onChange={(e) => setMinFareFromCity(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    From State
                  </label>
                  <input
                    type="text"
                    value={minFareFromState}
                    onChange={(e) => setMinFareFromState(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    To City
                  </label>
                  <input
                    type="text"
                    value={minFareToCity}
                    onChange={(e) => setMinFareToCity(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    To State
                  </label>
                  <input
                    type="text"
                    value={minFareToState}
                    onChange={(e) => setMinFareToState(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Minimum Fare (₹)
                </label>
                <input
                  type="number"
                  min={1}
                  step="1"
                  value={minFareAmount}
                  onChange={(e) => setMinFareAmount(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={minFareActive}
                  onChange={(e) => setMinFareActive(e.target.checked)}
                />
                Active
              </label>
              <button
                type="button"
                disabled={
                  savingMinimumFare ||
                  !minFareFromCity.trim() ||
                  !minFareFromState.trim() ||
                  !minFareToCity.trim() ||
                  !minFareToState.trim() ||
                  !minFareAmount.trim()
                }
                onClick={() => void saveMinimumFare()}
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {savingMinimumFare
                  ? "Saving…"
                  : editingMinimumFareId
                    ? "Update Rule"
                    : "Create Rule"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
