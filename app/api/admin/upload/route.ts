import { randomUUID } from "crypto";

import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

function normalizeMediaKind(value: FormDataEntryValue | null): "image" | "video" {
  return value === "video" ? "video" : "image";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const file = formData.get("file") as File | null;
    const mediaKind = normalizeMediaKind(formData.get("mediaKind"));

    if (!file) {
      return NextResponse.json(
        {
          error: "No file uploaded",
        },
        {
          status: 400,
        },
      );
    }

    const allowedTypes =
      mediaKind === "video" ? ALLOWED_VIDEO_TYPES : ALLOWED_IMAGE_TYPES;
    const maxBytes = mediaKind === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;

    if (!allowedTypes.has(file.type)) {
      return NextResponse.json(
        {
          error:
            mediaKind === "video"
              ? "Unsupported video format. Use MP4, MOV, or WebM."
              : "Unsupported image format. Use JPG, PNG, WebP, or GIF.",
        },
        {
          status: 400,
        },
      );
    }

    if (file.size > maxBytes) {
      const limitMb = Math.round(maxBytes / (1024 * 1024));
      return NextResponse.json(
        {
          error: `File is too large. Maximum size is ${limitMb} MB.`,
        },
        {
          status: 400,
        },
      );
    }

    const bytes = await file.arrayBuffer();

    const buffer = Buffer.from(bytes);

    const fileName = `${randomUUID()}-${file.name}`;

    const { error } = await supabaseAdmin.storage
      .from("winner-images")
      .upload(fileName, buffer, {
        contentType: file.type,
      });

    if (error) {
      throw error;
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage
      .from("winner-images")
      .getPublicUrl(fileName);

    return NextResponse.json({
      url: publicUrl,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Upload failed",
      },
      {
        status: 500,
      },
    );
  }
}
