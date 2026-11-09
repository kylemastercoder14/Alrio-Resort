"use client";

import Image from "next/image";
import { ArrowLeft, ArrowRight, Star } from "lucide-react";
import { useState } from "react";

// Replace these preview entries with approved guest reviews before publishing.
const testimonials = [
  {
    name: "A family escape",
    occasion: "Family getaway",
    quote:
      "A little time away, a refreshing swim, and everyone together. Exactly the kind of weekend we wanted to share as a family.",
    image: "/amenities.jpg",
  },
  {
    name: "A moment worth celebrating",
    occasion: "Birthday gathering",
    quote:
      "Having our favorite people in one place made the occasion feel special. We left with plenty of photos and even more memories.",
    image: "/hero.jpg",
  },
  {
    name: "Time to reconnect",
    occasion: "A getaway with friends",
    quote:
      "An easygoing escape filled with long conversations, laughter, and time by the pool. A lovely way to catch up and slow down together.",
    image: "/amenities.jpg",
  },
  {
    name: "A refreshing day together",
    occasion: "Day tour",
    quote:
      "A day by the pool was just what we needed. Between shared meals, swimming, and plenty of laughter, it felt like a welcome break from our usual routine.",
    image: "/hero.jpg",
  },
  {
    name: "Memories across generations",
    occasion: "Family reunion",
    quote:
      "Bringing everyone together gave us time to swap stories, take photos, and enjoy each other's company. A simple gathering that became a memory we will treasure.",
    image: "/amenities.jpg",
  },
];

export function LandingTestimonials() {
  const [active, setActive] = useState(0);
  const review = testimonials[active];
  const move = (direction: number) =>
    setActive(
      (current) =>
        (current + direction + testimonials.length) % testimonials.length,
    );

  return (
    <section
      id="testimonials"
      aria-labelledby="testimonials-heading"
      className="scroll-mt-24 px-4 py-16 lg:px-20 lg:py-10"
    >
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b pb-5 lg:mb-10">
        <h2
          id="testimonials-heading"
          className="text-3xl font-medium tracking-tighter text-[#424c48] sm:text-4xl"
        >
          Our Guests and their words
        </h2>
      </div>

      <div className="grid gap-8 lg:grid-cols-[34fr_59fr] lg:gap-[7%]">
        <div className="relative hidden aspect-[0.745] overflow-hidden rounded-2xl bg-zinc-200 lg:block">
          <Image
            src="/hero.jpg"
            alt="Alrio Private Resort at night"
            fill
            className="object-cover"
          />
        </div>

        <div
          role="region"
          aria-roledescription="carousel"
          aria-label="Guest testimonials"
          className="relative min-w-0"
        >
          <div className="relative isolate sm:aspect-[1.28] lg:h-full lg:aspect-auto">
            <div className="absolute left-[17%] top-[10%] hidden h-[74%] w-[55%] overflow-hidden rounded-md bg-zinc-200 sm:block">
              <Image
                src="/hero.jpg"
                alt=""
                fill
                sizes="30vw"
                className="object-cover"
              />
            </div>
            <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl border border-[#d8c6a0]/70 bg-zinc-200 shadow-lg sm:absolute sm:left-0 sm:top-[6%] sm:h-[50%] sm:w-[42%] sm:aspect-auto">
              <Image
                key={review.image}
                src={review.image}
                alt="Poolside surroundings at Alrio Private Resort"
                fill
                sizes="(min-width: 640px) 35vw, 100vw"
                className="object-cover"
              />
            </div>
            <figure
              aria-live="polite"
              aria-atomic="true"
              className="relative z-10 -mt-6 ml-4 rounded-2xl border border-[#cdb98d]/80 bg-zinc-800 p-5 text-[#d9c99f] sm:absolute sm:right-0 sm:top-[46%] sm:ml-0 sm:mt-0 sm:w-[48%] lg:p-6"
            >
              <figcaption className="mb-3 text-sm font-medium">
                {review.name}
              </figcaption>
              <blockquote className="text-xs">
                “{review.quote}”
              </blockquote>
              <div className="mt-5">
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-[#eee3cc]/65">{review.occasion}</p>
                  <span
                    className="flex gap-1 text-[#e6c77d]"
                    aria-label="Sample five-star rating"
                  >
                    {Array.from({ length: 5 }, (_, index) => (
                      <Star
                        key={index}
                        className="size-3.5 fill-current"
                        aria-hidden="true"
                      />
                    ))}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-[9px] text-[#d9c99f]/60">
                Sample review · layout preview
              </p>
            </figure>
          </div>
          <div className="mt-6 flex items-center justify-center gap-2 sm:absolute sm:bottom-[5%] sm:left-[50%] sm:mt-0 sm:-translate-x-1/2">
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label="Previous testimonial"
              className="grid size-9 place-items-center rounded-full border border-zinc-300 text-zinc-700 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div className="flex items-center gap-0">
              {testimonials.map((item, index) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setActive(index)}
                  aria-label={`Show testimonial ${index + 1}`}
                  aria-current={active === index ? "true" : undefined}
                  className="grid size-6 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <span
                    className={`h-1.5 rounded-full transition-all ${active === index ? "w-5 bg-zinc-700" : "w-1.5 bg-zinc-300"}`}
                  />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => move(1)}
              aria-label="Next testimonial"
              className="grid size-9 place-items-center rounded-full border border-zinc-300 text-zinc-700 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
