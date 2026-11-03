import { getCurrentAppUser } from "@/lib/current-app-user";

import { LandingHeaderClient } from "./landing-header-client";

export async function LandingHeader() {
  const { session } = await getCurrentAppUser();

  return <LandingHeaderClient user={session?.user ?? null} />;
}
