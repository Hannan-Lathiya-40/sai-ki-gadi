import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Sai ki Gadi",
  description: "Sai ki Gadi privacy policy",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-full bg-slate-50">
      <article className="mx-auto max-w-2xl px-6 py-14">
        <Link
          href="/"
          className="text-sm font-medium text-indigo-600 hover:underline"
        >
          &larr; Back to sign in
        </Link>
        <h1 className="mt-8 text-3xl font-bold tracking-tight text-slate-900">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: April 2026</p>

        <div className="mt-10 space-y-6 text-sm leading-relaxed text-slate-700">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-slate-900">
              1. Introduction
            </h2>
            <p>
              Sai ki Gadi (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;)
              respects your privacy. This policy describes how we collect, use,
              and protect information when you use our website and related
              services. This is a starter policy for your website; you should
              have it reviewed by legal counsel before production use.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-semibold text-slate-900">
              2. Information we collect
            </h2>
            <p>
              We may collect identifiers you provide (such as login ID and
              contact details), technical data (such as device type and
              browser), and usage data to operate and improve the service.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-semibold text-slate-900">
              3. How we use information
            </h2>
            <p>
              We use information to authenticate users, provide support, comply
              with law, and improve security and product experience.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-semibold text-slate-900">
              4. Sharing and retention
            </h2>
            <p>
              We do not sell your personal information. We may share data with
              service providers who assist our operations, under appropriate
              agreements. We retain data only as long as needed for the purposes
              described here or as required by law.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-semibold text-slate-900">
              5. Your choices
            </h2>
            <p>
              Depending on your region, you may have rights to access, correct,
              or delete your personal information. Contact us using the details
              you publish for your business to exercise those rights.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-semibold text-slate-900">
              6. Contact
            </h2>
            <p>
              For privacy questions, contact Sai ki Gadi using the support
              channel you provide to customers.
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
