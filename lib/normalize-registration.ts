/**
 * Shared vehicle registration normalization (Admin).
 * Must stay identical to mobile `lib/normalize-registration.ts`.
 */
export function normalizeVehicleRegistration(raw: string): string {
  return raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}
