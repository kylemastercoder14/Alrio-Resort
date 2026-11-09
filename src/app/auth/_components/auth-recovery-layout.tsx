import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export function AuthRecoveryLayout({ title, description, children }: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-svh bg-[#fcfbfa]">
      <div className="relative grid min-h-svh lg:grid-cols-[52%_48%]">
        <div className="flex min-w-0 flex-col justify-center px-5 py-10 sm:px-10 lg:px-12 lg:py-14 xl:px-20">
          <div className="mx-auto w-full max-w-lg">
            <Link href="/" aria-label="Alrio Private Resort home">
              <Image src="/favicon.png" alt="" width={56} height={56} className="size-11 object-contain" priority />
            </Link>
            <h1 className="mt-6 text-2xl font-medium tracking-tight text-zinc-900 sm:text-3xl">{title}</h1>
            <p className="mb-8 mt-3 text-sm leading-6 text-zinc-500">{description}</p>
            {children}
            <p className="mt-8 text-center text-sm text-zinc-500">
              <Link href="/auth/sign-in" className="font-semibold text-black hover:underline">Back to sign in</Link>
            </p>
          </div>
        </div>
        <aside aria-hidden="true" className="pointer-events-none relative hidden min-h-svh overflow-hidden lg:block">
          <Image src="/marketing/alrio-churro-gold.png" alt="" width={1351} height={1164} sizes="(min-width: 1024px) 100vw, 1px" className="absolute -left-20 top-0 h-full w-auto max-w-none" priority />
          <Image src="/marketing/alrio-stacked-showcase.png" alt="" width={1105} height={1422} sizes="(min-width: 1600px) 65vw, 85vw" className="absolute top-[-4%] left-[7%] h-[112%] w-auto max-w-none" priority />
        </aside>
      </div>
    </main>
  );
}
