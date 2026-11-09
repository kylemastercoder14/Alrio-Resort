import { prisma } from "@/lib/prisma";

const PHP_FORMATTER = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

export type PublicListing = {
  id: string;
  title: string;
  resortName: string;
  location: string;
  price: number;
  priceLabel: string;
  maxGuests: number;
  image: string | null;
  amenities: string[];
  description: string | null;
};

export function parseDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getNights(checkIn: Date, checkOut: Date) {
  return Math.round((checkOut.getTime() - checkIn.getTime()) / 86_400_000);
}

export function decimal(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : 0;
}

export function formatPhp(value: number) {
  return PHP_FORMATTER.format(value);
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
}

export async function getPublicListings(input: {
  where?: string;
  checkIn?: Date | null;
  checkOut?: Date | null;
  guests?: number;
}) {
  const hasDates = Boolean(input.checkIn && input.checkOut && input.checkOut > input.checkIn);
  const searchTerms = normalizeSearchText(input.where ?? "")
    .split(/\s+/)
    .filter((term) => term.length > 1)
    .filter((term) => !["city", "resort", "the"].includes(term));

  const rooms = await prisma.resortRoom.findMany({
    where: {
      // A room that is occupied today can still be sold for a future date.
      // Reservation-overlap filtering below is the source of truth for a
      // requested stay; only operationally unavailable rooms are hidden.
      status: { notIn: ["MAINTENANCE", "OUT_OF_SERVICE"] },
      ...(input.guests
        ? { maxAdults: { gte: input.guests } }
        : {}),
      ...(hasDates
        ? {
            reservations: {
              none: {
                status: { notIn: ["CANCELED", "CHECKED_OUT"] },
                checkIn: { lt: input.checkOut! },
                checkOut: { gt: input.checkIn! },
              },
            },
          }
        : {}),
    },
    include: {
      resortProfile: { select: { resortName: true, municipality: true, province: true, shortDescription: true } },
      photos: { orderBy: { sortOrder: "asc" }, take: 1 },
      amenities: { where: { status: "ACTIVE", showOnBookingPage: true }, select: { name: true }, take: 6 },
    },
    orderBy: { updatedAt: "desc" },
    take: 60,
  });

  return rooms
    .filter((room) => {
      if (!searchTerms.length) return true;
      const searchable = normalizeSearchText([
        room.name,
        room.type,
        room.resortProfile.resortName,
        room.resortProfile.municipality,
        room.resortProfile.province,
      ].filter(Boolean).join(" "));
      return searchTerms.every((term) => searchable.includes(term));
    })
    .map((room): PublicListing => {
    const resortName = room.resortProfile.resortName;
    const location = [room.resortProfile.municipality, room.resortProfile.province].filter(Boolean).join(", ") || "Philippines";
    const price = decimal(room.baseRate);
    return {
      id: room.id,
      title: room.name,
      resortName,
      location,
      price,
      priceLabel: formatPhp(price),
      maxGuests: room.maxAdults + room.childrenOccupancy,
      image: room.photos[0]?.url ?? null,
      amenities: room.amenities.map((amenity) => amenity.name),
      description: room.guestNote ?? room.resortProfile.shortDescription,
    };
    });
}

export async function getPublicRoom(roomId: string) {
  return prisma.resortRoom.findFirst({
    where: {
      id: roomId,
      status: { notIn: ["MAINTENANCE", "OUT_OF_SERVICE"] },
    },
    include: {
      resortProfile: { include: { appUser: { select: { displayName: true } } } },
      amenities: { where: { status: "ACTIVE", showOnBookingPage: true }, orderBy: { sortOrder: "asc" } },
      photos: { orderBy: { sortOrder: "asc" } },
    },
  });
}
