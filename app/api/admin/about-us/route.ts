import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export type AboutUsContentRow = {
  id: string;
  language_code: string;
  title: string;
  description: string;
  mission: string;
  vision: string;
  offerings: string;
  closing: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const SUPPORTED_LANGUAGE_CODES = ["en", "hi", "gu", "mr", "kn"] as const;

const SELECT_COLUMNS =
  "id, language_code, title, description, mission, vision, offerings, closing, is_active, created_at, updated_at";

function isSupportedLanguageCode(value: unknown): value is (typeof SUPPORTED_LANGUAGE_CODES)[number] {
  return (
    typeof value === "string" &&
    SUPPORTED_LANGUAGE_CODES.includes(value as (typeof SUPPORTED_LANGUAGE_CODES)[number])
  );
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const languageCode = searchParams.get("language_code");

    if (languageCode) {
      if (!isSupportedLanguageCode(languageCode)) {
        return NextResponse.json(
          { error: "Invalid language_code." },
          { status: 400 },
        );
      }

      const { data, error } = await supabaseAdmin
        .from("about_us_content")
        .select(SELECT_COLUMNS)
        .eq("language_code", languageCode)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ item: (data as AboutUsContentRow | null) ?? null });
    }

    const { data, error } = await supabaseAdmin
      .from("about_us_content")
      .select(SELECT_COLUMNS)
      .order("language_code", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: (data ?? []) as AboutUsContentRow[] });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const languageCode = body.language_code;

    if (!isSupportedLanguageCode(languageCode)) {
      return NextResponse.json(
        { error: "language_code must be one of: en, hi, gu, mr, kn." },
        { status: 400 },
      );
    }

    const title = normalizeText(body.title);
    const description = normalizeText(body.description);
    const mission = normalizeText(body.mission);
    const vision = normalizeText(body.vision);
    const offerings = normalizeText(body.offerings);
    const closing = normalizeText(body.closing);
    const isActive = body.is_active !== false;

    if (!title && !description && !mission && !vision && !offerings && !closing) {
      return NextResponse.json(
        { error: "At least one content field must be provided." },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("about_us_content")
      .upsert(
        {
          language_code: languageCode,
          title,
          description,
          mission,
          vision,
          offerings,
          closing,
          is_active: isActive,
        },
        { onConflict: "language_code" },
      )
      .select(SELECT_COLUMNS)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as AboutUsContentRow);
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
