import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { hasAdminSession } from "@/lib/admin-session";
import { supabaseAdmin } from "@/lib/supabase-admin";

const IDENTITY_BUCKET = "identity-documents";

const allowedPathFields = [
  "driving_license_front_path",
  "driving_license_back_path",
  "aadhaar_front_path",
  "aadhaar_back_path",
  "aadhaar_file_path",
  "pan_file_path",
  "gst_file_path",
] as const;

type AllowedPathField = (typeof allowedPathFields)[number];

const legacyFlagByPathField: Partial<Record<AllowedPathField, string>> = {
  aadhaar_file_path: "aadhaar_uploaded",
  pan_file_path: "pan_uploaded",
  gst_file_path: "gst_uploaded",
};

type DeletePayload = {
  userId?: string;
  pathField?: string;
};

function isAllowedPathField(value: string): value is AllowedPathField {
  return allowedPathFields.includes(value as AllowedPathField);
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (!hasAdminSession(cookieStore)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as DeletePayload;
  const userId = body.userId?.trim() ?? "";
  const pathField = body.pathField?.trim() ?? "";

  if (!userId || !pathField || !isAllowedPathField(pathField)) {
    return NextResponse.json({ ok: false, error: "Invalid request payload." }, { status: 400 });
  }

  const { data: row, error: readError } = await supabaseAdmin
    .from("user_identity_documents")
    .select(pathField)
    .eq("user_id", userId)
    .maybeSingle();

  if (readError) {
    return NextResponse.json({ ok: false, error: readError.message }, { status: 400 });
  }

  const rowRecord = row as Record<string, unknown> | null;
  const currentPath = rowRecord?.[pathField];
  if (typeof currentPath !== "string" || currentPath.length === 0) {
    return NextResponse.json({ ok: false, error: "Document path not found." }, { status: 404 });
  }

  const { error: deleteStorageError } = await supabaseAdmin.storage
    .from(IDENTITY_BUCKET)
    .remove([currentPath]);

  if (deleteStorageError) {
    return NextResponse.json({ ok: false, error: deleteStorageError.message }, { status: 400 });
  }

  const updatePayload: Record<string, unknown> = { [pathField]: null };
  const legacyFlag = legacyFlagByPathField[pathField];
  if (legacyFlag) {
    updatePayload[legacyFlag] = false;
  }

  const { error: updateError } = await supabaseAdmin
    .from("user_identity_documents")
    .update(updatePayload)
    .eq("user_id", userId);

  if (updateError) {
    return NextResponse.json({ ok: false, error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
