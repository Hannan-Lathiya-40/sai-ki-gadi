"use client";

import { useCallback, useEffect, useState } from "react";

type AboutUsLanguageCode = "en" | "hi" | "gu" | "mr" | "kn";

type AboutUsContentRow = {
  id: string;
  language_code: AboutUsLanguageCode;
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

const LANGUAGE_OPTIONS: {
  code: AboutUsLanguageCode;
  label: string;
}[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "gu", label: "Gujarati" },
  { code: "mr", label: "Marathi" },
  { code: "kn", label: "Kannada" },
];

const EMPTY_FORM = {
  title: "",
  description: "",
  mission: "",
  vision: "",
  offerings: "",
  closing: "",
  is_active: true,
};

export function AboutUsAdminPanel() {
  const [languageCode, setLanguageCode] = useState<AboutUsLanguageCode>("en");
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const loadContent = useCallback(async (code: AboutUsLanguageCode) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `/api/admin/about-us?language_code=${encodeURIComponent(code)}`,
      );
      const payload = (await response.json()) as {
        item?: AboutUsContentRow | null;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load About Us content.");
      }

      const item = payload.item;
      if (!item) {
        setForm(EMPTY_FORM);
        setUpdatedAt(null);
        return;
      }

      setForm({
        title: item.title ?? "",
        description: item.description ?? "",
        mission: item.mission ?? "",
        vision: item.vision ?? "",
        offerings: item.offerings ?? "",
        closing: item.closing ?? "",
        is_active: item.is_active ?? true,
      });
      setUpdatedAt(item.updated_at ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load About Us content.");
      setForm(EMPTY_FORM);
      setUpdatedAt(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadContent(languageCode);
  }, [languageCode, loadContent]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/admin/about-us", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language_code: languageCode,
          ...form,
        }),
      });

      const payload = (await response.json()) as AboutUsContentRow & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save About Us content.");
      }

      setUpdatedAt(payload.updated_at ?? null);
      setSuccess("About Us content saved successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save About Us content.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">About Us Content</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Manage the About Us page shown in the mobile app. Content is stored
            per language and fetched dynamically by the app.
          </p>
        </div>

        <div className="min-w-[180px]">
          <label className="mb-1 block text-sm font-semibold text-slate-700">
            Language
          </label>
          <select
            value={languageCode}
            onChange={(e) =>
              setLanguageCode(e.target.value as AboutUsLanguageCode)
            }
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500"
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">Loading content…</p>
      ) : (
        <div className="mt-6 grid gap-5">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, title: e.target.value }))
              }
              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-indigo-500"
              placeholder="About Us"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={4}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500"
              placeholder="Main About Us description"
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Mission
              </label>
              <textarea
                value={form.mission}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, mission: e.target.value }))
                }
                rows={4}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Vision
              </label>
              <textarea
                value={form.vision}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, vision: e.target.value }))
                }
                rows={4}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Offerings
            </label>
            <p className="mb-2 text-xs text-slate-500">
              Enter one bullet point per line. These appear as a list in the
              mobile app.
            </p>
            <textarea
              value={form.offerings}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, offerings: e.target.value }))
              }
              rows={5}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Closing note
            </label>
            <textarea
              value={form.closing}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, closing: e.target.value }))
              }
              rows={3}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500"
            />
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, is_active: e.target.checked }))
              }
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Published (visible in mobile app)
          </label>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={loading || saving}
          className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save About Us"}
        </button>

        {updatedAt ? (
          <span className="text-xs text-slate-500">
            Last updated: {new Date(updatedAt).toLocaleString()}
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}
    </div>
  );
}
