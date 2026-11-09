import Link from "next/link";
import { ArrowUpRight, MapPin, Phone } from "lucide-react";
import { getQueryClient, trpc } from "@/trpc/server";
import { LandingContactForm } from "@/app/_components/landing-contact-form";

export async function LandingContact() {
  const contact = await getQueryClient().fetchQuery(
    trpc.public.contact.queryOptions(),
  );
  const address = contact?.fullAddress?.trim();
  const phone = contact?.phoneNumber?.trim();
  const mapQuery = address
    ? encodeURIComponent(`Alrio Private Resort, ${address}`)
    : null;

  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      className="scroll-mt-24 px-4 py-16 lg:px-20 lg:py-24"
    >
      <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between lg:mb-14">
        <div>
          <p className="text-xs font-medium uppercase text-zinc-500">
            We’re here to help
          </p>
          <h2
            id="contact-heading"
            className="mt-4 font-medium text-4xl tracking-tighter text-zinc-900 sm:text-5xl"
          >
            Let’s plan your next escape.
          </h2>
        </div>
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-[.95fr_1.05fr] lg:gap-12">
        <div>
          <div className="relative h-80 overflow-hidden rounded-2xl border border-zinc-200 bg-[#e7ece7] sm:h-96">
            <iframe
              title="Alrio Private Resort location on Google Maps"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d8316.252413729897!2d120.90712766299546!3d14.302643654226072!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397d5006b8118a5%3A0x86513f020401228b!2sAlrio!5e1!3m2!1sen!2sph!4v1793788096342!5m2!1sen!2sph"
              width={600}
              height={450}
              className="absolute inset-0 size-full border-0"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
          <div className="mt-6 grid gap-6 border-t border-zinc-200 pt-6 sm:grid-cols-2">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-zinc-900">
                <MapPin className="size-4" aria-hidden="true" />
                Visit Alrio
              </p>
              <p className="mt-2 text-sm text-zinc-500">
                {address || "Alrio Private Resort"}
              </p>
              {mapQuery && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-[#263c36] hover:underline"
                >
                  Get directions{" "}
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </a>
              )}
            </div>
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-zinc-900">
                <Phone className="size-4" aria-hidden="true" />
                Let’s talk
              </p>
              {phone ? (
                <a
                  href={`tel:${phone.replace(/[^+\d]/g, "")}`}
                  className="mt-2 inline-block text-sm text-zinc-500 hover:underline"
                >
                  {phone}
                </a>
              ) : (
                <p className="mt-2 text-sm text-zinc-500">
                  Use the form for questions about your visit.
                </p>
              )}
              <Link
                href="#reserve"
                className="mt-3 flex w-fit items-center gap-2 text-xs font-medium text-[#263c36] hover:underline"
              >
                Check availability{" "}
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
        <LandingContactForm />
      </div>
    </section>
  );
}
