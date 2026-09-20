import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  ADMIN_SESSION_COOKIE,
  isValidAdminSessionValue,
} from "@/lib/admin-auth";

import { LoginForm } from "./login-form";

export default async function Home() {
  const cookieStore = await cookies();
  if (isValidAdminSessionValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)) {
    redirect("/dashboard");
  }

  return (
    <div className="admin-shell flex min-h-full flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
        <div className="mb-8 text-center">
          <p className="admin-eyebrow">Sai Ki Gadi · Admin</p>
          <h1 className="admin-page-title mt-2">Sign in</h1>
          <p className="admin-caption mt-2">
            Use your admin credentials to continue.
          </p>
        </div>

        <div className="admin-card p-7 sm:p-8">
          <LoginForm />
        </div>

        <p className="admin-meta mt-8 text-center leading-relaxed">
          By continuing you agree to our{" "}
          <Link
            href="/terms"
            className="font-medium text-[var(--admin-accent)] underline-offset-2 hover:underline"
          >
            Terms &amp; Conditions
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="font-medium text-[var(--admin-accent)] underline-offset-2 hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
