"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type DocumentItem = {
  label: string;
  pathField: string;
  path: string | null;
  signedUrl: string | null;
};

type DocumentManagerProps = {
  userId: string;
  documents: DocumentItem[];
};

export function DocumentManager({ userId, documents }: DocumentManagerProps) {
  const router = useRouter();
  const [deletingField, setDeletingField] = useState<string | null>(null);
  const [error, setError] = useState<string>("");

  const deleteDocument = async (pathField: string) => {
    setError("");
    setDeletingField(pathField);
    try {
      const response = await fetch("/api/admin/delete-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, pathField }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "Could not delete document.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not delete document.");
    } finally {
      setDeletingField(null);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Uploaded documents</h2>
      <p className="mt-1 text-sm text-slate-600">
        Review uploaded files. You can remove any file and ask the user to upload it again.
      </p>

      {error ? (
        <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {documents.map((doc) => {
          const hasUpload = Boolean(doc.path);
          const isDeleting = deletingField === doc.pathField;
          return (
            <article
              key={doc.pathField}
              className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
            >
              <div className="aspect-[4/3] bg-slate-100">
                {hasUpload && doc.signedUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- signed URL image preview
                  <img
                    src={doc.signedUrl}
                    alt={doc.label}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-3 text-center text-sm text-slate-500">
                    Not uploaded
                  </div>
                )}
              </div>
              <div className="space-y-2 p-4">
                <p className="font-semibold text-slate-900">{doc.label}</p>
                <p className="truncate text-xs text-slate-500">{doc.path ?? "No path"}</p>
                <button
                  disabled={!hasUpload || isDeleting}
                  onClick={() => {
                    void deleteDocument(doc.pathField);
                  }}
                  className="w-full rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDeleting ? "Deleting..." : "Delete document"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
