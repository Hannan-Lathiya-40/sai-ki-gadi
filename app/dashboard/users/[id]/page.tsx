import Link from "next/link";
import { BackButton } from "@/app/components/back-button";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { DocumentManager } from "../../../dashboard/verification/[userId]/document-manager";

type UserDetailRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  business_name: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  membership_type: string | null;
  verified: boolean | null;
  status: boolean | null;
  created_at: string | null;
};

type IdentityDocRow = {
  user_id: string;
  aadhaar_number?: string | null;
  aadhaar_file_path?: string | null;
  pan_file_path?: string | null;
  gst_file_path?: string | null;
  driving_license_front_path?: string | null;
  driving_license_back_path?: string | null;
  aadhaar_front_path?: string | null;
  aadhaar_back_path?: string | null;
};

type DocumentItem = {
  label: string;
  pathField: string;
  path: string | null;
  signedUrl: string | null;
};

const IDENTITY_BUCKET = "identity-documents";

async function createSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.storage
    .from(IDENTITY_BUCKET)
    .createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

function fullName(user: UserDetailRow): string {
  const name = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
  if (name) return name;
  return user.email || user.phone || user.id;
}

function userAddress(user: UserDetailRow): string {
  const parts = [
    user.address_line_1,
    user.address_line_2,
    user.city,
    user.state,
    user.pincode,
  ].filter(Boolean);
  return parts.join(", ") || "—";
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [{ data: user, error: userError }, docsResult] = await Promise.all([
    supabaseAdmin
      .from("users")
      .select(
        "id, first_name, last_name, phone, email, business_name, address_line_1, address_line_2, city, state, pincode, membership_type, verified, status, created_at",
      )
      .eq("id", id)
      .maybeSingle<UserDetailRow>(),
    (async () => {
      const modern = await supabaseAdmin
        .from("user_identity_documents")
        .select(
          "user_id, aadhaar_number, driving_license_front_path, driving_license_back_path, aadhaar_front_path, aadhaar_back_path",
        )
        .eq("user_id", id)
        .maybeSingle<IdentityDocRow>();
      if (!modern.error) return modern;
      return supabaseAdmin
        .from("user_identity_documents")
        .select(
          "user_id, aadhaar_number, aadhaar_file_path, pan_file_path, gst_file_path",
        )
        .eq("user_id", id)
        .maybeSingle<IdentityDocRow>();
    })(),
  ]);

  if (userError) throw new Error(`Unable to load user: ${userError.message}`);
  if (!user) notFound();

  const { data: docs } = docsResult;

  const baseDocs: Omit<DocumentItem, "signedUrl">[] =
    docs?.driving_license_front_path !== undefined
      ? [
          {
            label: "Driving License Front",
            pathField: "driving_license_front_path",
            path: docs?.driving_license_front_path ?? null,
          },
          {
            label: "Driving License Back",
            pathField: "driving_license_back_path",
            path: docs?.driving_license_back_path ?? null,
          },
          {
            label: "Aadhaar Front",
            pathField: "aadhaar_front_path",
            path: docs?.aadhaar_front_path ?? null,
          },
          {
            label: "Aadhaar Back",
            pathField: "aadhaar_back_path",
            path: docs?.aadhaar_back_path ?? null,
          },
        ]
      : [
          {
            label: "Aadhaar Document",
            pathField: "aadhaar_file_path",
            path: docs?.aadhaar_file_path ?? null,
          },
          {
            label: "PAN Document",
            pathField: "pan_file_path",
            path: docs?.pan_file_path ?? null,
          },
          {
            label: "GST Document",
            pathField: "gst_file_path",
            path: docs?.gst_file_path ?? null,
          },
        ];

  const documents: DocumentItem[] = await Promise.all(
    baseDocs.map(async (doc) => ({
      ...doc,
      signedUrl: doc.path ? await createSignedUrl(doc.path) : null,
    })),
  );

  return (
    <div className="min-h-screen bg-slate-100">
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        {/* <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-indigo-600 hover:underline"
          >
            ← Back to dashboard
          </Link>
        </div> */}
        <div className="mb-6">
          <BackButton />
        </div>

        {/* User Info Section */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {fullName(user)}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Review user details and uploaded verification documents.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Membership
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {user.membership_type || "user"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Verification Status
              </p>
              <p
                className={`mt-1 text-sm font-semibold ${user.verified ? "text-emerald-600" : "text-amber-600"}`}
              >
                {user.verified ? "Verified" : "Unverified"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Account Status
              </p>
              <p
                className={`mt-1 text-sm font-semibold ${user.status ? "text-emerald-600" : "text-red-600"}`}
              >
                {user.status ? "Active" : "Blocked"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Joined
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {user.created_at
                  ? new Date(user.created_at).toLocaleString()
                  : "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Phone
              </p>
              <p className="mt-1 text-sm text-slate-900">{user.phone || "—"}</p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Email
              </p>
              <p className="mt-1 text-sm text-slate-900">{user.email || "—"}</p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Aadhaar Number
              </p>
              <p className="mt-1 text-sm text-slate-900">
                {docs?.aadhaar_number || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Business Name
              </p>
              <p className="mt-1 text-sm text-slate-900">
                {user.business_name || "—"}
              </p>
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Address
              </p>
              <p className="mt-1 text-sm text-slate-900">{userAddress(user)}</p>
            </div>
          </div>
        </section>

        {/* Documents Section */}
        <DocumentManager userId={id} documents={documents} />
      </main>
    </div>
  );
}
