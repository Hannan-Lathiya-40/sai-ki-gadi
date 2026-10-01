/** Canonical state labels used by the mobile app / requirements. */
export function normalizeIndianStateName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  const key = trimmed.toLowerCase();
  if (key === "gujarat" || key === "gujrat" || key === "ગુજરાત") {
    return "Gujarat";
  }
  return trimmed;
}
