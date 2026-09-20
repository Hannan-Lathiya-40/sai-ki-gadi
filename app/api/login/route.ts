import { NextResponse } from "next/server";

import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSessionValue,
  getAdminPassword,
  getAdminUsername,
} from "@/lib/admin-auth";

type LoginRequest = {
  username?: string;
  password?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as LoginRequest;
  const username = body.username?.trim() ?? "";
  const password = body.password ?? "";

  const expectedUser = getAdminUsername();
  const expectedPass = getAdminPassword();

  if (username !== expectedUser || password !== expectedPass) {
    return NextResponse.json(
      { ok: false, error: "Invalid username or password." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSessionValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
