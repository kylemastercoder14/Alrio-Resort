export type RoomStatus = "Available" | "Occupied" | "Maintenance" | "Out of Service";

export type RoomPhoto = {
  id?: string;
  key: string;
  name: string;
  size?: number;
  url: string;
};

export type Room = {
  amenities: string[];
  amenityIds: string[];
  baseRate: string;
  bedConfiguration: string;
  building: string;
  childrenOccupancy: number;
  checkIn: string;
  checkOut: string;
  code: string;
  createdAt: Date | string;
  extraPersonCharge: string;
  floor: string;
  guestNote: string;
  id: string;
  maxAdults: number;
  minNights: number;
  name: string;
  notes: string;
  peakRate: string;
  photos: RoomPhoto[];
  roomSize: string;
  smokingPolicy: "Non-smoking" | "Smoking";
  status: RoomStatus;
  type: string;
  updatedAt: Date | string;
  viewType: string;
};

export type ViewMode = "table" | "grid";

export const ROOM_STATUS_STYLE: Record<RoomStatus, string> = {
  Available: "border-black bg-black text-white",
  Occupied: "border-zinc-200 bg-zinc-100 text-zinc-900",
  Maintenance: "border-zinc-200 bg-zinc-100 text-zinc-700",
  "Out of Service": "border-zinc-300 bg-white text-zinc-700",
};
