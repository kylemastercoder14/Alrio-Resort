import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);
const imageUrl = z.string().trim().min(1, "Choose or upload an image.").max(2_048);

export const DEFAULT_LANDING_BRANDING = {
  hero: {
    eyebrow: "Discover your next private resort escape",
    title: "ALRIO PRIVATE RESORT",
    description: "Welcome to the Alrio Private Resort, your ultimate destination for relaxation and rejuvenation. Nestled in a serene location, our resort offers a perfect blend of luxury and comfort, ensuring an unforgettable experience for every guest.",
    primaryCtaLabel: "Explore Now",
    secondaryCtaLabel: "Check what others say",
    trustLabel: "Loved by families, friends, and celebration groups",
    imageUrl: "/hero.jpg",
  },
  reserve: {
    title: "Unforgettable private resort moments await.",
    description: "Choose your dates and guests to check availability at Alrio Private Resort.",
    imageUrl: "/hero.jpg",
  },
  amenities: {
    eyebrow: "The Alrio experience",
    title: "A little escape. A lot to enjoy.",
    imageUrl: "/amenities.jpg",
    highlights: [
      { title: "Your own space to unwind", description: "Make room for the moments that matter at Alrio Private Resort. Take time to slow down, reconnect, and enjoy your surroundings together." },
      { title: "Bring everyone together", description: "Turn a family reunion, birthday, or catch-up with friends into a memorable escape." },
      { title: "Stay a little longer", description: "Let your getaway unfold at your own pace and choose a comfortable base for your next Alrio escape." },
    ],
  },
  gallery: {
    title: "Gallery",
    description: "Picture your next escape. Take a closer look at Alrio Private Resort and imagine the moments you'll share here.",
    imageUrls: ["/amenities.jpg", "/hero.jpg"],
  },
  experiences: {
    eyebrow: "Activities & experiences",
    title: "Less hurry. More moments together.",
    items: [
      { category: "Slow down", title: "A little poolside pause", description: "Trade the everyday rush for a refreshing dip and unhurried time by the water.", imageUrl: "/amenities.jpg" },
      { category: "Come together", title: "Time with your favorite people", description: "Gather the family, catch up with friends, and make space for the conversations that matter.", imageUrl: "/hero.jpg" },
      { category: "Make it memorable", title: "An occasion of your own", description: "From birthdays to reunions, start planning a private resort escape around your special moment.", imageUrl: "/amenities.jpg" },
    ],
  },
  testimonials: {
    title: "Our guests and their words",
    imageUrl: "/hero.jpg",
    reviews: [
      { name: "A family escape", occasion: "Family getaway", quote: "A little time away, a refreshing swim, and everyone together. Exactly the kind of weekend we wanted to share as a family.", rating: 5, imageUrl: "/amenities.jpg", sourceUrl: "" },
      { name: "A moment worth celebrating", occasion: "Birthday gathering", quote: "Having our favorite people in one place made the occasion feel special. We left with plenty of photos and even more memories.", rating: 5, imageUrl: "/hero.jpg", sourceUrl: "" },
      { name: "Time to reconnect", occasion: "A getaway with friends", quote: "An easygoing escape filled with long conversations, laughter, and time by the pool.", rating: 5, imageUrl: "/amenities.jpg", sourceUrl: "" },
    ],
  },
} as const;

export const landingBrandingSchema = z.object({
  hero: z.object({ eyebrow: text(140), title: text(140), description: text(1_000), primaryCtaLabel: text(80), secondaryCtaLabel: text(80), trustLabel: text(160), imageUrl }),
  reserve: z.object({ title: text(180), description: text(500), imageUrl }),
  amenities: z.object({
    eyebrow: text(140), title: text(180), imageUrl,
    highlights: z.array(z.object({ title: text(160), description: text(800) })).min(1).max(6),
  }),
  gallery: z.object({ title: text(120), description: text(800), imageUrls: z.array(imageUrl).min(1).max(16) }),
  experiences: z.object({
    eyebrow: text(140), title: text(180),
    items: z.array(z.object({ category: text(100), title: text(160), description: text(800), imageUrl })).min(1).max(6),
  }),
  testimonials: z.object({
    title: text(180), imageUrl,
    reviews: z.array(z.object({ name: text(140), occasion: text(140), quote: text(1_500), rating: z.number().int().min(1).max(5), imageUrl, sourceUrl: text(2_048) })).min(1).max(12),
  }),
});

export type LandingBranding = z.infer<typeof landingBrandingSchema>;

export function parseLandingBranding(value: unknown): LandingBranding {
  const parsed = landingBrandingSchema.safeParse(value);
  return parsed.success ? parsed.data : landingBrandingSchema.parse(DEFAULT_LANDING_BRANDING);
}
