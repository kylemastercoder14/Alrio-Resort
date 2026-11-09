export type AmenityStatus = "Active" | "Inactive";

export type AmenityCategory =
  | "In-Room"
  | "Bathroom"
  | "Connectivity"
  | "Resort Facility"
  | "Outdoor"
  | "Accessibility";

export type AmenityScope = "Room-level" | "Property-level";

export type AmenityFeeUnit = "per stay" | "per day" | "per use";

export type Amenity = {
  appliesTo: AmenityScope;
  category: string;
  chargeable: boolean;
  createdAt: Date | string;
  description: string;
  featured: boolean;
  feeAmount: string;
  feeUnit: AmenityFeeUnit;
  icon: string;
  id: string;
  code: string;
  internalNotes: string;
  name: string;
  showOnBookingPage: boolean;
  sortOrder: number;
  status: AmenityStatus;
  updatedAt: Date | string;
};

export const AMENITY_CATEGORIES: AmenityCategory[] = [
  "In-Room",
  "Bathroom",
  "Connectivity",
  "Resort Facility",
  "Outdoor",
  "Accessibility",
];

export const AMENITY_SCOPES: AmenityScope[] = [
  "Room-level",
  "Property-level",
];

export const AMENITY_FEE_UNITS: AmenityFeeUnit[] = [
  "per stay",
  "per day",
  "per use",
];

export const AMENITY_STATUS_STYLE: Record<AmenityStatus, string> = {
  Active: "border-black bg-black text-white",
  Inactive: "border-zinc-200 bg-zinc-100 text-zinc-700",
};
