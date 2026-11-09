import { redirect } from "next/navigation";

type LegacyRoomPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LegacyRoomPage({
  searchParams,
}: LegacyRoomPageProps) {
  const params = await searchParams;
  const nextParams = new URLSearchParams();

  for (const key of ["checkIn", "checkOut", "guests", "where"] as const) {
    const value = firstValue(params[key]);
    if (value) nextParams.set(key, value);
  }

  const query = nextParams.toString();
  redirect(query ? `/search?${query}` : "/search");
}
