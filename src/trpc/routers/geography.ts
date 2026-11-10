import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getRuntimeSettingForDefaultResort } from "@/lib/runtime-settings";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";

const code = z.string().regex(/^\d{9}$/);
const areaSchema = z.object({
  code, name: z.string(),
  provinceCode: z.union([z.string(), z.literal(false)]).optional(),
  regionCode: code.optional(),
});
const metroManila = "130000000";
const provinceSelection = z.union([code, z.literal("metro-manila"), z.literal("independent")]);
const lists = new Map<string, { expires: number; value: z.infer<typeof areaSchema>[] }>();

async function list(path: string) {
  const cached = lists.get(path);
  if (cached && cached.expires > Date.now()) return cached.value;
  try {
    const response = await fetch(`https://psgc.gitlab.io/api/${path}/`, {
      next: { revalidate: 86400 }, signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error("PSGC unavailable");
    const value = z.array(areaSchema).parse(await response.json()).sort((a, b) => a.name.localeCompare(b.name));
    lists.set(path, { expires: Date.now() + 86400000, value });
    return value;
  } catch {
    throw new TRPCError({ code: "BAD_GATEWAY", message: "Unable to load locations. Please try again." });
  }
}

const procedure = baseProcedure.use(({ ctx, next }) => {
  if (!ctx.session?.user?.id) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in required." });
  return next();
});

const pins = new Map<string, { latitude: number; longitude: number }>();
let queue: Promise<unknown> = Promise.resolve();
let lastLookup = 0;
async function locate(cityCode: string, query: string) {
  const cached = pins.get(cityCode);
  if (cached) return cached;
  // Cache city-level results and serialize lookups for the public Nominatim service.
  const pending = queue.catch(() => undefined).then(async () => {
    const existing = pins.get(cityCode);
    if (existing) return existing;
    const delay = Math.max(0, 1100 - (Date.now() - lastLookup));
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    lastLookup = Date.now();
    try {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.search = new URLSearchParams({ q: query, format: "jsonv2", countrycodes: "ph", limit: "1" }).toString();
      const appUrl =
        (await getRuntimeSettingForDefaultResort("APP_URL")) ??
        "http://localhost:3000";
      const response = await fetch(url, {
        headers: {
          "User-Agent": `AlrioPrivateResort/1.0 (${appUrl})`,
          "Accept-Language": "en",
        },
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) throw new Error("Geocoder unavailable");
      const [result] = z.array(z.object({ lat: z.coerce.number().min(-90).max(90), lon: z.coerce.number().min(-180).max(180) })).parse(await response.json());
      if (!result) throw new Error("City not found");
      const point = { latitude: result.lat, longitude: result.lon };
      pins.set(cityCode, point);
      return point;
    } catch {
      throw new TRPCError({ code: "BAD_GATEWAY", message: "Unable to locate this city on the map. Please retry the map lookup." });
    }
  });
  queue = pending;
  return pending;
}

export const geographyRouter = createTRPCRouter({
  provinces: procedure.query(() => list("provinces")),
  cities: procedure.input(z.object({ provinceCode: provinceSelection })).query(async ({ input }) => {
    if (input.provinceCode === "metro-manila") return list(`regions/${metroManila}/cities-municipalities`);
    if (input.provinceCode === "independent") {
      const cities = await list("cities-municipalities");
      return cities.filter((city) => !city.provinceCode && city.regionCode !== metroManila);
    }
    return list(`provinces/${input.provinceCode}/cities-municipalities`);
  }),
  cityPin: procedure.input(z.object({ cityCode: code })).query(async ({ input }) => {
    const [cities, provinces, regions] = await Promise.all([
      list("cities-municipalities"), list("provinces"), list("regions"),
    ]);
    const city = cities.find((item) => item.code === input.cityCode);
    const region = regions.find((item) => item.code === city?.regionCode);
    if (!city || !region) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a city from the list." });
    const province = provinces.find((item) => item.code === city.provinceCode);
    const query = [city.name, province?.name ?? (region.code === metroManila ? "Metro Manila" : ""), "Philippines"].filter(Boolean).join(", ");
    const point = await locate(city.code, query);
    return { regionCode: region.code, regionName: region.name, ...point };
  }),
});
