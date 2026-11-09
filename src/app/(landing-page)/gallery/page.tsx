import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Gallery | Alrio Private Resort" };

export default function GalleryPage() {
  return (
    <main className="min-h-screen bg-[#f2f8f7] px-4 pb-20 pt-32 sm:px-6 lg:px-20">
      <div className="mx-auto max-w-7xl">
        <Link href="/#gallery" className="text-sm text-zinc-600 underline-offset-4 hover:underline">
          ← Back to home
        </Link>
        <h1 className="mt-6 font-serif text-4xl text-zinc-900 sm:text-5xl">Gallery</h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-500">
          A closer look at Alrio Private Resort. Picture your next escape and the moments you&apos;ll share here.
        </p>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 12 }, (_, index) => (
            <div key={index} className="relative aspect-4/3 overflow-hidden rounded-xl bg-zinc-200">
              <Image
                src="/amenities.jpg"
                alt={`Alrio Private Resort gallery preview ${index + 1}`}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
