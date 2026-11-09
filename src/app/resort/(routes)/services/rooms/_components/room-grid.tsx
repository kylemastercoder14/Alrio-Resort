import Link from "next/link";
import Image from "next/image";

import { Card } from "@/components/ui/card";
import { type Room } from "./data";
import { RoomRowActions } from "./row-actions";
import { RoomStatusBadge } from "./status-badge";

export function RoomGrid({ rooms }: { rooms: Room[] }) {
  if (!rooms.length) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-8 text-center text-sm font-medium text-zinc-500">
        Create rooms to build your inventory.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {rooms.map((room) => (
        <Card className="gap-4 rounded-xl border-zinc-200 bg-white p-5" key={room.id}>
          <RoomPhotoPreview room={room} />

          <div className="flex items-start justify-between gap-3">
            <Link href={`/resort/services/rooms/${room.id}`} className="min-w-0">
              <p className="text-xs font-bold uppercase text-zinc-500">
                {room.code}
              </p>
              <h2 className="mt-1 text-xl font-bold text-zinc-950">
                Room {room.name}
              </h2>
              <p className="mt-1 text-sm text-zinc-500">{room.type}</p>
              <p className="mt-2 text-lg font-bold text-zinc-950">
                {formatPesoRate(room.baseRate)}
              </p>
            </Link>
            <RoomStatusBadge status={room.status} />
          </div>
        </Card>
      ))}
    </div>
  );
}

function RoomPhotoPreview({ room }: { room: Room }) {
  const [mainPhoto, ...thumbPhotos] = room.photos;

  if (!mainPhoto) {
    return (
      <div className="relative">
        <Link
          href={`/resort/services/rooms/${room.id}`}
          className="flex aspect-[16/10] items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50 text-sm font-medium text-zinc-500"
        >
          No room photos
        </Link>
        <RoomRowActions
          room={room}
          className="absolute right-3 top-3"
          triggerClassName="rounded-full bg-black/70 text-white hover:bg-black/80 hover:text-white"
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Link
          href={`/resort/services/rooms/${room.id}`}
          className="relative block aspect-[16/10] overflow-hidden rounded-xl bg-zinc-100"
        >
          <Image
            src={mainPhoto.url}
            alt={`${room.name} main photo`}
            fill
            sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 hover:scale-105"
          />
        </Link>
        <RoomRowActions
          room={room}
          className="absolute right-3 top-3"
          triggerClassName="rounded-full bg-black/70 text-white hover:bg-black/80 hover:text-white"
        />
      </div>

      {thumbPhotos.length ? (
        <div className="grid grid-cols-4 gap-2">
          {thumbPhotos.slice(0, 4).map((photo, index) => (
            <Link
              key={photo.key}
              href={`/resort/services/rooms/${room.id}`}
              className="relative aspect-square overflow-hidden rounded-lg bg-zinc-100"
            >
              <Image
                src={photo.url}
                alt={`${room.name} photo ${index + 2}`}
                fill
                sizes="96px"
                className="object-cover"
              />
              {index === 3 && thumbPhotos.length > 4 ? (
                <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-xs font-bold text-white">
                  +{thumbPhotos.length - 4}
                </span>
              ) : null}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function formatPesoRate(value: string) {
  const trimmed = value.trim();
  const peso = "\u20b1";
  const amount = Number(trimmed.replaceAll(peso, "").replace(/[,\s]/g, ""));

  if (!trimmed) return "--";
  if (!Number.isFinite(amount)) {
    return trimmed.startsWith(peso) ? trimmed : `${peso}${trimmed}`;
  }

  return `${peso}${amount.toLocaleString("en-PH")}`;
}
