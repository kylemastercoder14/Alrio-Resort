import { prisma } from "@/lib/prisma";

export type PublicResortLocation = {
  id: string;
  title: string;
  subtitle: string;
};

/** Public, guest-safe resort location summaries for search controls. */
export async function getPublicResortLocations(): Promise<PublicResortLocation[]> {
  const resorts = await prisma.resortProfile.findMany({
    select: {
      id: true,
      resortName: true,
      barangay: true,
      municipality: true,
      province: true,
      fullAddress: true,
      _count: {
        select: {
          rooms: true,
          services: true,
          amenities: true,
        },
      },
    },
    orderBy: [{ municipality: "asc" }, { resortName: "asc" }],
    take: 24,
  });

  return resorts.map((resort) => {
    const area = [resort.barangay, resort.municipality, resort.province]
      .filter(Boolean)
      .join(", ");
    const offerCount =
      resort._count.rooms + resort._count.services + resort._count.amenities;
    const offerLabel =
      offerCount > 0
        ? `${offerCount} rooms, services, and amenities`
        : "Alrio Private Resort";

    return {
      id: resort.id,
      title: resort.resortName,
      subtitle: area
        ? `${area} - ${offerLabel}`
        : (resort.fullAddress ?? offerLabel),
    };
  });
}
