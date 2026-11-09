"use client";

import { useQuery } from "@tanstack/react-query";

import { MoreActions as ReusableMoreActions } from "@/components/reusable/more-actions";
import { useTRPC } from "@/trpc/client";

export function MoreActions() {
  const trpc = useTRPC();
  const rooms = useQuery({
    ...trpc.resort.rooms.list.queryOptions(),
    retry: false,
  });
  const exportRows = (rooms.data ?? []).map((room) => ({
    amenities: room.amenities.join(", "),
    baseRate: room.baseRate,
    bedConfiguration: room.bedConfiguration,
    building: room.building,
    extraPersonCharge: room.extraPersonCharge,
    floor: room.floor,
    id: room.code,
    maxOccupancy: `${room.maxAdults} adults, ${room.childrenOccupancy} children`,
    peakRate: room.peakRate,
    room: room.name,
    roomSize: room.roomSize,
    smokingPolicy: room.smokingPolicy,
    status: room.status,
    type: room.type,
    viewType: room.viewType,
  }));

  return (
    <ReusableMoreActions
      columns={[
        { header: "Room", key: "room" },
        { header: "Room ID", key: "id" },
        { header: "Type", key: "type" },
        { header: "Building", key: "building" },
        { header: "Floor", key: "floor" },
        { header: "Base Rate", key: "baseRate" },
        { header: "Peak Rate", key: "peakRate" },
        { header: "Max Occupancy", key: "maxOccupancy" },
        { header: "Beds", key: "bedConfiguration" },
        { header: "Size", key: "roomSize" },
        { header: "View", key: "viewType" },
        { header: "Smoking", key: "smokingPolicy" },
        { header: "Amenities", key: "amenities" },
        { header: "Status", key: "status" },
      ]}
      data={exportRows}
      filename="rooms"
      title="Rooms"
    />
  );
}
