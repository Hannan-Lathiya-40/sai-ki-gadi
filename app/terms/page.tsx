import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions | Sai ki Gadi",
  description: "Sai ki Gadi terms and conditions",
};

export default function TermsPage() {
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
          Terms &amp; Conditions
        </h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: April 2026</p>

        <div className="mt-10 space-y-6 text-sm leading-relaxed text-slate-700">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-slate-900">
              1. Agreement
            </h2>
            <p>
              By accessing or using Sai ki Gadi&apos;s website and services, you
              agree to these Terms &amp; Conditions. If you do not agree, do not
              use the service. This is a starter document and should be reviewed
              by legal counsel before production use.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-semibold text-slate-900">
              2. Use of the service
            </h2>
            <p>
              You agree to provide accurate information, keep credentials
              confidential, and use the service only for lawful purposes. You
              must not attempt to disrupt, misuse, or reverse-engineer the
              service beyond what applicable law allows.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-semibold text-slate-900">
              3. Accounts and security
            </h2>
            <p>
              You are responsible for activity under your account. Notify us
              promptly of any unauthorized use using the contact method you
              publish for your business.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-semibold text-slate-900">
              4. Disclaimers and limitation of liability
            </h2>
            <p>
              The service is provided &quot;as is&quot; to the extent permitted
              by law. We are not liable for indirect or consequential damages
              arising from your use of the service, subject to applicable law.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-semibold text-slate-900">
              5. Changes
            </h2>
            <p>
              We may update these terms from time to time. Continued use after
              changes constitutes acceptance of the revised terms where
              permitted by law.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-semibold text-slate-900">
              6. Contact
            </h2>
            <p>
              For questions about these terms, contact Sai ki Gadi using the
              support channel you provide to customers.
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
