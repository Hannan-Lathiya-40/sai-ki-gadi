/** Canonical vehicle categories used across Sai Ki Gadi (matches mobile CAR_TYPE_OPTIONS.id). */
export const VEHICLE_CATEGORIES = [
  "Sedan",
  "SUV",
  "Hatchback",
  "Traveller Tempo",
  "Bus",
  "Mini Bus",
  "Innova Crysta",
  "Innova",
  "EECO",
  "Premium Car",
  "Only Parcel",
] as const;

export type VehicleCategory = (typeof VEHICLE_CATEGORIES)[number];

export function isVehicleCategory(value: string): value is VehicleCategory {
  return (VEHICLE_CATEGORIES as readonly string[]).includes(value);
}
