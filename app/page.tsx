import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ADMIN_SESSION_COOKIE } from "@/lib/admin-auth";

import { LoginForm } from "./login-form";

export default async function Home() {
  const cookieStore = await cookies();
  if (cookieStore.get(ADMIN_SESSION_COOKIE)?.value === "1") {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-gradient-to-b from-slate-50 to-indigo-50/80">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">
            MeriGadi Admin
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Sign in
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Use your admin credentials to continue.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-lg shadow-slate-200/60">
          <LoginForm />
        </div>

        <p className="mt-8 text-center text-xs leading-relaxed text-slate-500">
          By continuing you agree to our{" "}
          <Link
            href="/terms"
            className="font-medium text-indigo-600 underline-offset-2 hover:underline"
          >
            Terms &amp; Conditions
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="font-medium text-indigo-600 underline-offset-2 hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
