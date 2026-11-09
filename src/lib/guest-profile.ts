import { z } from "zod";

const detail = z.string().trim().max(150).default("");

export const homeLocationSchema = z.object({
  regionCode: z.string().regex(/^\d{9}$/),
  regionName: z.string().max(150),
  provinceCode: z.string().regex(/^\d{9}$/).nullable(),
  provinceName: z.string().max(150).nullable(),
  cityCode: z.string().regex(/^\d{9}$/),
  cityName: z.string().max(150),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
});
export type HomeLocation = z.infer<typeof homeLocationSchema>;

export const guestProfileSchema = z.object({
  stayStyle: detail,
  visitOccasion: detail,
  groupType: detail,
  favoriteActivity: detail,
  preferredSchedule: detail,
  diningPreference: detail,
  celebrationStyle: detail,
  relaxationStyle: detail,
  musicPreference: detail,
  languages: detail,
  specialRequests: detail,
  location: detail,
  homeLocation: homeLocationSchema.nullable().default(null),
  about: z.string().trim().max(1000).default(""),
  interests: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  plans: z.array(z.enum(["Poolside break", "Overnight escape", "Family gathering", "Special celebration"])).max(4).default([]),
  showPlans: z.boolean().default(false),
});

export type GuestProfile = z.infer<typeof guestProfileSchema>;
