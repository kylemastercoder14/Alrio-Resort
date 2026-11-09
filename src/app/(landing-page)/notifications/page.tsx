import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Notifications | Alrio Private Resort",
};

export default async function NotificationsPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user.id) redirect("/auth/sign-in");

  return (
    <main
      aria-labelledby="notifications-title"
      className="min-h-svh bg-white pt-(--landing-header-height,5rem) text-zinc-950"
    >
      <div className="mx-auto grid min-h-[calc(100svh-var(--landing-header-height,5rem))] max-w-4xl grid-rows-[auto_1fr] px-5 pb-12 pt-8 sm:px-8 sm:pt-12">
        <h1
          id="notifications-title"
          className="text-3xl font-semibold tracking-tight sm:text-4xl"
        >
          Notifications
        </h1>
        <section
          aria-labelledby="notifications-empty-title"
          className="mx-auto max-w-xl self-center py-12 text-center"
        >
          <h2 id="notifications-empty-title" className="text-xl font-medium">
            No notifications yet
          </h2>
          <p className="mt-2 text-base text-zinc-600">
            Updates about your Alrio Private Resort stay will appear here.
          </p>
        </section>
      </div>
    </main>
  );
}
