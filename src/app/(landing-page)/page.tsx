import Image from "next/image";
import {
  ChevronRight,
  Palmtree,
  Star,
  ArrowUpRight,
} from "lucide-react";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LandingSearchBar } from "../_components/landing-search-bar";
import { LandingTestimonials } from "../_components/landing-testimonials";
import { LandingContact } from "../_components/landing-contact";
import { IconArrowRight } from "@tabler/icons-react";

export const dynamic = "force-dynamic";

const amenityHighlights = [
  {
    title: "Your own space to unwind",
    description:
      "Make room for the moments that matter at Alrio Private Resort. Take time to slow down, reconnect, and enjoy your surroundings together. Explore our stays to find the amenities and inclusions that suit your getaway.",
    position: "object-center",
  },
  {
    title: "Bring everyone together",
    description:
      "Turn a family reunion, birthday, or catch-up with friends into a memorable escape. Plan your gathering at Alrio and find a stay type that fits your group, with time to share meals, stories, and special moments.",
    position: "object-left",
  },
  {
    title: "Stay a little longer",
    description:
      "Let your getaway unfold at your own pace. Browse our overnight stays, review the room amenities and inclusions, and choose a comfortable base for your next Alrio escape.",
    position: "object-right",
  },
];

const resortExperiences = [
  {
    category: "Slow down",
    title: "A little poolside pause",
    description:
      "Trade the everyday rush for a refreshing dip and unhurried time by the water.",
    image: "/amenities.jpg",
    position: "50% 75%",
  },
  {
    category: "Come together",
    title: "Time with your favorite people",
    description:
      "Gather the family, catch up with friends, and make space for the conversations that matter.",
    image: "/hero.jpg",
    position: "30% 50%",
  },
  {
    category: "Make it memorable",
    title: "An occasion of your own",
    description:
      "From birthdays to reunions, start planning a private resort escape around your special moment.",
    image: "/amenities.jpg",
    position: "85% 30%",
  },
];

const galleryImages = [
  {
    layout: "lg:col-start-10 lg:col-span-7 lg:row-start-1 lg:row-span-3",
    position: "50% 45%",
  },
  {
    layout: "lg:col-start-17 lg:col-span-4 lg:row-start-1 lg:row-span-5",
    position: "20% 50%",
  },
  {
    layout: "lg:col-start-21 lg:col-span-4 lg:row-start-1 lg:row-span-5",
    position: "85% 50%",
  },
  {
    layout: "lg:col-start-1 lg:col-span-4 lg:row-start-4 lg:row-span-4",
    position: "10% 50%",
  },
  {
    layout: "lg:col-start-5 lg:col-span-8 lg:row-start-4 lg:row-span-4",
    position: "50% 60%",
  },
  {
    layout: "lg:col-start-13 lg:col-span-4 lg:row-start-4 lg:row-span-5",
    position: "70% 50%",
  },
  {
    layout: "lg:col-start-17 lg:col-span-4 lg:row-start-6 lg:row-span-7",
    position: "40% 50%",
  },
  {
    layout: "lg:col-start-21 lg:col-span-4 lg:row-start-6 lg:row-span-3",
    position: "50% 75%",
  },
  {
    layout: "lg:col-start-1 lg:col-span-7 lg:row-start-8 lg:row-span-5",
    position: "50% 90%",
  },
  {
    layout: "lg:col-start-8 lg:col-span-5 lg:row-start-8 lg:row-span-5",
    position: "90% 50%",
  },
  {
    layout: "lg:col-start-13 lg:col-span-4 lg:row-start-9 lg:row-span-4",
    position: "50% 20%",
  },
  {
    layout: "lg:col-start-21 lg:col-span-2 lg:row-start-9 lg:row-span-3",
    position: "30% 50%",
  },
  {
    layout: "lg:col-start-23 lg:col-span-2 lg:row-start-9 lg:row-span-3",
    position: "60% 50%",
  },
];

const guestAvatars = [
  "https://scontent.fmnl19-1.fna.fbcdn.net/v/t39.30808-6/655220959_1656650605369464_465456071306800777_n.jpg?stp=dst-jpg_tt6&cstp=mx1014x1024&ctp=s1014x1024&_nc_cat=111&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=6ee11a&_nc_eui2=AeH5-04vWRtE-WDAYpD1Sf3skN1_gbIfZZuQ3X-Bsh9lmzE-qDDy2SMj4SKH8OGWkp5wCP4hs6-FHDf3QPUHhmry&_nc_ohc=qRlP-Eb5DEYQ7kNvwHTLOB7&_nc_oc=Ado20jVWEHNX4M-0aWoShZKmwoZDUstU_T3eHQDYZ2AV44Gt2bprktzdKoQBR0eeEkA&_nc_zt=23&_nc_ht=scontent.fmnl19-1.fna&_nc_gid=VJMGHvrha7NwxgPSvafziA&_nc_ss=7b2a8&oh=00_AQTRLwo-pUmg5FXfNXf4a5k5iQoOYmVGYOgIwaPQMjmR8g&oe=6AEFBACC",
  "https://scontent.fmnl19-1.fna.fbcdn.net/v/t39.30808-6/823000662_2732254643858560_9088794106335457033_n.jpg?stp=dst-jpg_tt6&cstp=mx2048x2033&ctp=s2048x2033&_nc_cat=107&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=6ee11a&_nc_eui2=AeESPdFMhpADKO89GD3eNcgJJmEIBdR_8CUmYQgF1H_wJWzpBCxHT7bnT03UEXh1Byat6De5Cz5x3dNV_heB7yGi&_nc_ohc=JUY8MTCbAQQQ7kNvwHqOMMm&_nc_oc=AdrmMyDel6dAwv4ezxOAQjkpAciVQXV-yxuW0Kyd2bNSvd2zPw60kf8rk0g2Xf5vAhY&_nc_zt=23&_nc_ht=scontent.fmnl19-1.fna&_nc_gid=2uX72d6UaW88aGuZkM0ccg&_nc_ss=7b2a8&oh=00_AQTxvVTd4wWrmt6E_yy_HuYvtivzkTl_8BFr_bopfN8XwA&oe=6AEFC834",
  "https://scontent.fmnl19-1.fna.fbcdn.net/v/t39.30808-1/578799569_25726291550298885_5085578053942394917_n.jpg?stp=dst-jpg_tt6&cstp=mx2048x2048&ctp=s100x100&_nc_cat=105&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=e99d92&_nc_eui2=AeHr_i3zKKXUHZH3xo1Az5nKd2gJH_jBFPl3aAkf-MEU-aKi1j1pyPrlTupJHCFD6_ujKANpgaw5O8UdNoDh1ILE&_nc_ohc=PEk25EU8XQ4Q7kNvwF4w90H&_nc_oc=Ado6YQ1vQ2FPyoJ1DNOv-EKNKVPMluNJIO4EeWzXF4h_ZBywZupzqUJqRH-HcThLSLE&_nc_zt=24&_nc_ht=scontent.fmnl19-1.fna&_nc_gid=sVOjHgsFoR4GQMQHYMt-vg&_nc_ss=7b2a8&oh=00_AQQcBorX5Do9O-CcOK6uRfw2Uq2UY4IszJq0gWv7LbQHbA&oe=6AEFB4F5",
  "https://scontent.fmnl19-1.fna.fbcdn.net/v/t39.30808-1/508338594_24122896967304872_7573146054961698567_n.jpg?stp=dst-jpg_tt6&cstp=mx1365x1366&ctp=s100x100&_nc_cat=101&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=1d2534&_nc_eui2=AeE12KseaO5ERte3IhMaip1-DsIBhgQMREcOwgGGBAxERxP1j_u-eaztYNA5OvLT2cx2jjEspeu1_Zbaq7G30ptb&_nc_ohc=grOhrjYoZekQ7kNvwF1guz1&_nc_oc=AdrxLL5QAyosMY3oErEpzsBlWSm7_AhXCgWPKGSZxpjPQji6XYqUa1o_TnYJ9idkPgM&_nc_zt=24&_nc_ht=scontent.fmnl19-1.fna&_nc_gid=CeYMRal_o2ZVjkebN2zESQ&_nc_ss=7b2a8&oh=00_AQSCp-6qOJg_wNCoPKwa8X5ZXTqnbAl5l3Cn76CnUs_wag&oe=6AEFA4BF",
  "https://scontent.fmnl19-1.fna.fbcdn.net/v/t39.30808-1/428615233_413269271375877_2120879938107473655_n.jpg?stp=c0.0.720.720a_dst-jpg_tt6&cstp=mx720x720&ctp=s100x100&_nc_cat=107&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=e99d92&_nc_eui2=AeFbb1yadkIyK6uTvN7vA5HapYkcoxrLfwmliRyjGst_CenuJkUlt_-bVNkkz7BDYQ_vzszNmf75cbtj2LpeNMJp&_nc_ohc=Umg0e3Yv1dAQ7kNvwGOa5QN&_nc_oc=AdpYfaFNXCuTfZU9UuzjnmskXfnhX9gdPaubZlJj0Mw7qKpx9MCFdJqnRs4Qvi6Nd6Q&_nc_zt=24&_nc_ht=scontent.fmnl19-1.fna&_nc_gid=S3SdBixk2oMRwNScJeD9WA&_nc_ss=7b2a8&oh=00_AQROe-4p_tndoPBz8W4rn7BsCsxXJZgkuw6Fm4Xhd3PMfA&oe=6AEFC445",
  "https://scontent.fmnl19-1.fna.fbcdn.net/v/t1.6435-1/101097107_10158485151013530_350415133161291776_n.jpg?stp=dst-jpg_tt6&cstp=mx1986x2015&ctp=s100x100&_nc_cat=104&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=e99d92&_nc_eui2=AeG_3wrQZZ2Fi4zT7ccKL3095zqFia7Pq3_nOoWJrs-rf9vdOgW7gQPcyU5a0W8ywjijMgvwQkhdBF72upv9HmdB&_nc_ohc=XV94tXCzHzoQ7kNvwH_MC_D&_nc_oc=AdpKnQCDXQFzCEBmssBSpXipWtTMNfWppBMz-7nRVWSZhBC_L3YSFkuE3-2AbmBsGMQ&_nc_zt=24&_nc_ht=scontent.fmnl19-1.fna&_nc_gid=D09ZGy2whx7VmEdFhQZpHQ&_nc_ss=7b2a8&oh=00_AQS4mirOH5Qp___TYJ1XS0gdfoUNqi7yxV-Lobs5lDqssA&oe=6B1157E8",
  "https://scontent.fmnl19-1.fna.fbcdn.net/v/t39.30808-1/617011159_25793148750321501_1865891945241323025_n.jpg?stp=dst-jpg_tt6&cstp=mx960x960&ctp=s100x100&_nc_cat=110&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=e99d92&_nc_eui2=AeEgm08Kf0fR2Tzliez-kX1qUKOpphAw_bZQo6mmEDD9troIlhD42ls5Jyh_ViGBYjjM3NUf8tTzgvp5ud6Iwcgq&_nc_ohc=WPZePZJ97B4Q7kNvwFbRe6V&_nc_oc=AdqgjpqfDleLnS9DJajUcgUHCou7fig6ac13NmZ49LErnRPXCl8wOdpnKRFSYZ3Yaqc&_nc_zt=24&_nc_ht=scontent.fmnl19-1.fna&_nc_gid=MilrWD1kgahXwadai0Uxgw&_nc_ss=7b2a8&oh=00_AQSOXk4l_m81LSzAdIsOa8w3BSQEZ7NHoDgEiKTqTZeT8Q&oe=6AEFBF1A",
];

export default async function Home() {

  return (
    <main className="min-h-screen">
      <section className="relative z-30 border-b border-zinc-200 bg-zinc-950 text-white">
        <Image
          src="/hero.jpg"
          alt="Alrio private resort"
          fill
          priority
          className="object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-linear-to-b from-black/65 via-black/45 to-black/70" />

        <div className="relative flex min-h-screen w-full flex-col px-4 pb-10 pt-24 sm:px-6 md:pb-12 md:pt-28 lg:px-20">
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full mx-auto max-w-4xl">
              <Link
                href="#explore"
                className="mx-auto mb-6 flex w-fit items-center gap-3 rounded-full border border-white/25 bg-black/25 py-2 pl-3 pr-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-amber-300/70 hover:bg-white/10"
              >
                <span className="grid size-6 place-items-center rounded-full bg-amber-300/15 text-amber-300">
                  <Palmtree className="size-4" aria-hidden="true" />
                </span>
                <span className="border-l border-white/20 pl-3">
                  Discover your next private resort escape
                </span>
                <ChevronRight
                  className="size-4 text-white/70"
                  aria-hidden="true"
                />
              </Link>
              <h1 className="text-4xl font-light text-center sm:text-5xl lg:text-6xl">
                ALRIO PRIVATE RESORT
              </h1>
              <p className="text-center text-zinc-300 mt-4">
                Welcome to the Alrio Private Resort, your ultimate destination
                for relaxation and rejuvenation. Nestled in a serene location,
                our resort offers a perfect blend of luxury and comfort,
                ensuring an unforgettable experience for every guest.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
                <Link
                  href="#explore"
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "rounded-full px-5",
                  )}
                >
                  Explore Now
                </Link>
                <Link
                  href="#testimonials"
                  className={cn(
                    buttonVariants({ variant: "secondary" }),
                    "rounded-full px-5",
                  )}
                >
                  Check what others say
                </Link>
              </div>

              <div className="flex mt-10 flex-col items-center gap-3 sm:flex-row justify-center sm:gap-4">
                <div
                  className="flex -space-x-4"
                  aria-label="Happy Alrio guests"
                >
                  {guestAvatars.map((src, index) => (
                    <div
                      key={src}
                      className="relative size-10 overflow-hidden rounded-full border-2 border-zinc-300 bg-zinc-700 shadow-sm"
                    >
                      <Image
                        src={src}
                        alt={`Alrio guest ${index + 1}`}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
                <div
                  className="flex items-center gap-0.5 text-amber-400"
                  aria-label="Five-star guest satisfaction"
                >
                  {Array.from({ length: 5 }, (_, index) => (
                    <Star key={index} className="size-3.5 fill-current" />
                  ))}
                </div>
              </div>
              <p className="mt-4 text-center text-sm font-medium text-white">
                Loved by families, friends, and celebration groups
              </p>
            </div>
          </div>
          <Link
            href="#amenities"
            className="absolute bottom-7 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap text-xs text-white"
          >
            <Image
              src="/icons/mouse-scroll.svg"
              alt=""
              width={20}
              height={20}
              className="size-5"
            />
            Scroll down for more...
          </Link>
        </div>
      </section>

      <section
        id="reserve"
        className="relative z-1100 scroll-mt-24 px-4 py-10 lg:px-20"
      >
        <div className="relative isolate w-full rounded-2xl bg-slate-950 px-10 py-15">
          <Image
            src="/hero.jpg"
            alt=""
            fill
            sizes="(min-width: 1536px) 1440px, 100vw"
            className="-z-20 rounded-2xl object-cover opacity-65"
          />
          <div className="absolute inset-0 -z-10 rounded-2xl bg-black/45" />
          <div className="text-center">
            <h2 className="text-3xl font-normal leading-tight tracking-tight text-white lg:text-4xl">
              Unforgettable private resort moments await.
            </h2>
            <p className="mt-3 text-base text-white/80">
              Choose your dates and guests to check availability at Alrio
              Private Resort.
            </p>
          </div>
          <LandingSearchBar />
        </div>
      </section>

      <section
        id="amenities"
        aria-labelledby="amenities-heading"
        className="scroll-mt-24 px-4 py-16 lg:px-20 lg:py-24"
      >
        <div className="mb-10 flex flex-col gap-5 md:mb-14 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-zinc-500">
              The Alrio experience
            </p>
            <h2
              id="amenities-heading"
              className="mt-4 text-3xl font-medium tracking-tighter lg:text-5xl"
            >
              A little escape. A lot to enjoy.
            </h2>
          </div>
        </div>
        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div className="relative aspect-4/3 overflow-hidden rounded-2xl bg-zinc-200 lg:aspect-auto lg:min-h-135">
            <Image
              src="/amenities.jpg"
              alt="Outdoor spaces at Alrio Private Resort"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 text-white sm:bottom-8 sm:left-8">
              <p className="text-xs uppercase text-white/70">
                Alrio Private Resort
              </p>
              <p className="mt-2 text-2xl font-medium">
                Make yourself at ease.
              </p>
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <p className="mb-3 text-xs font-medium uppercase text-zinc-500">
              Amenities & experiences
            </p>
            <div className="divide-y divide-zinc-200 border-y border-zinc-200">
              {amenityHighlights.map((amenity, index) => (
                <article
                  key={amenity.title}
                  className="grid grid-cols-[1.5rem_1fr] gap-4 py-6 sm:gap-5 sm:py-7"
                >
                  <span className="pt-1 text-xs tabular-nums text-zinc-400">
                    0{index + 1}
                  </span>
                  <div>
                    <h3 className="text-xl font-medium tracking-tight text-zinc-900">
                      {amenity.title}
                    </h3>
                    <p className="mt-2 text-sm text-zinc-500">
                      {amenity.description}
                    </p>
                  </div>
                </article>
              ))}
            </div>
            <Link
              href="#explore"
              className="group mt-6 inline-flex w-fit items-center gap-3 rounded-sm py-2 text-sm font-medium text-zinc-900 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              Explore our stays
              <ChevronRight
                className="size-4 transition-transform motion-safe:group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>
      </section>

      <section
        id="gallery"
        aria-labelledby="gallery-heading"
        className="scroll-mt-24 px-4 py-16 lg:px-20 lg:py-24"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-24 lg:grid-rows-12 lg:aspect-[1.92]">
          <div className="col-span-2 pb-5 sm:col-span-3 lg:col-span-9 lg:row-span-3 lg:flex lg:flex-col lg:justify-start lg:pb-0 lg:pr-2">
            <h2
              id="gallery-heading"
              className="text-3xl tracking-tight text-zinc-900"
            >
              Gallery
            </h2>
            <p className="mt-3 max-w-md border-t border-zinc-300/70 pt-3 text-sm text-zinc-500">
              Picture your next escape. Take a closer look at Alrio Private
              Resort and imagine the moments you&apos;ll share here.
            </p>
          </div>
          {galleryImages.map((photo, index) => (
            <div
              key={photo.layout}
              className={cn(
                "group relative min-h-0 aspect-square overflow-hidden rounded-md bg-zinc-200 sm:aspect-4/3 lg:aspect-auto",
                photo.layout,
              )}
            >
              <Image
                src="/amenities.jpg"
                alt={`Alrio Private Resort gallery preview ${index + 1}`}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                style={{ objectPosition: photo.position }}
                className="object-cover transition-transform duration-700 motion-safe:group-hover:scale-105"
              />
            </div>
          ))}
          <div className="col-span-2 flex min-w-0 items-center justify-end sm:col-span-3 lg:col-start-21 lg:col-span-4 lg:row-start-12">
            <Link
              href="/gallery"
              className={cn(
                buttonVariants({ variant: "default" }),
                "h-full w-full shrink-0 gap-2 rounded-full text-lg px-3",
              )}
            >
              View All
              <IconArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section
        id="experiences"
        aria-labelledby="experiences-heading"
        className="scroll-mt-24 px-4 py-16 lg:px-20 lg:py-24"
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-16">
          <div>
            <p className="text-xs uppercase text-zinc-500">
              Activities & experiences
            </p>
            <h2
              id="experiences-heading"
              className="mt-5 text-4xl font-medium tracking-tighter lg:text-5xl"
            >
              Less hurry. More moments together.
            </h2>
          </div>
        </div>

        <div className="mt-10 grid gap-10 md:mt-14 md:grid-cols-3 md:gap-6 lg:gap-8">
          {resortExperiences.map((experience, index) => (
            <Link
              key={experience.title}
              href="#reserve"
              aria-label={`Plan your stay: ${experience.title}`}
              className={cn(
                "group block min-w-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#d7c5a3] focus-visible:ring-offset-8 focus-visible:ring-offset-[#192e2b]",
                index === 1 && "md:mt-12",
              )}
            >
              <div className="relative aspect-4/4.5 overflow-hidden rounded-xl bg-white/5">
                <Image
                  src={experience.image}
                  alt="Alrio Private Resort and its poolside surroundings"
                  fill
                  style={{ objectPosition: experience.position }}
                  className="object-cover transition-transform duration-700 motion-safe:group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-black/10" />
                <span className="absolute left-5 top-5 text-xs tabular-nums tracking-tight text-white/80">
                  0{index + 1}
                </span>
                <span className="absolute bottom-5 right-5 grid size-10 place-items-center rounded-full border border-white/40 bg-black/10 text-white backdrop-blur-sm transition-colors group-hover:bg-white group-hover:text-[#192e2b]">
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </span>
              </div>
              <div className="pt-5">
                <p className="text-[10px] font-medium uppercase text-zinc-500">
                  {experience.category}
                </p>
                <h3 className="mt-2 text-2xl tracking-tighter lg:text-3xl">
                  {experience.title}
                </h3>
                <p className="mt-3 line-clamp-1 text-sm">
                  {experience.description}
                </p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-5 border-t pt-7 sm:flex-row sm:items-center sm:justify-between lg:mt-16">
          <p className="text-sm text-zinc-500">
            Your dates. Your people. Your kind of getaway.
          </p>
          <Link
            href="#reserve"
            className={cn(
              buttonVariants({ variant: "default", size: "lg" }),
              "rounded-full! px-5",
            )}
          >
            Plan your Alrio escape
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <LandingTestimonials />
      <LandingContact />
    </main>
  );
}
