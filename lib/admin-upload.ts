/** Safe parse for /api/admin/upload (JSON or unexpected non-JSON / network failure). */

export const MAX_WINNER_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_WINNER_VIDEO_BYTES = 50 * 1024 * 1024;

export function validateMediaFileSize(
  file: File,
  mediaKind: "image" | "video",
): string | null {
  const max =
    mediaKind === "video" ? MAX_WINNER_VIDEO_BYTES : MAX_WINNER_IMAGE_BYTES;
  if (file.size > max) {
    const limitMb = Math.round(max / (1024 * 1024));
    return `File is too large. Maximum size is ${limitMb} MB.`;
  }
  return null;
}

export async function readUploadResponse(response: Response): Promise<{
  ok: boolean;
  url?: string;
  error: string;
}> {
  const contentType = response.headers.get("content-type") ?? "";
  const raw = await response.text();

  if (contentType.includes("application/json") || raw.trim().startsWith("{")) {
    try {
      const data = JSON.parse(raw) as { url?: string; error?: string };
      if (!response.ok) {
        return {
          ok: false,
          error: data.error || `Upload failed (${response.status})`,
        };
      }
      if (!data.url) {
        return { ok: false, error: "Upload succeeded but no URL was returned." };
      }
      return { ok: true, url: data.url, error: "" };
    } catch {
      return {
        ok: false,
        error: `Upload failed (${response.status}): invalid JSON response.`,
      };
    }
  }

  if (response.status === 413) {
    return {
      ok: false,
      error:
        "Upload rejected: file is too large for the reverse proxy (HTTP 413).",
    };
  }

  const snippet = raw.replace(/\s+/g, " ").slice(0, 120);
  return {
    ok: false,
    error: `Upload failed (${response.status}). Non-JSON response${
      snippet ? `: ${snippet}` : ""
    }.`,
  };
}

export function formatUploadNetworkError(error: unknown): string {
  if (error instanceof TypeError && /failed to fetch/i.test(error.message)) {
    return (
      "Failed to reach the Admin server (Failed to fetch). " +
      "Confirm `npm run dev` is running on this machine and open the Admin Panel from the same host/port shown in the terminal (e.g. http://localhost:3000)."
    );
  }
  if (error instanceof Error && error.message) return error.message;
  return "Upload failed";
}
