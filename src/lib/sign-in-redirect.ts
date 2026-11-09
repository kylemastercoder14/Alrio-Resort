import "server-only";

import { prisma } from "@/lib/prisma";

/** Shared by the sign-in page query and the post-authentication mutation. */
export async function getSignInRedirect(authUserId?: string): Promise<string | null> {
  if (!authUserId) return null;

  const appUser = await prisma.appUser.findUnique({
    where: { authUserId },
    select: {
      resortProfile: { select: { id: true } },
      staffProfile: { select: { status: true } },
    },
  });
  if (!appUser) return null;

  if (appUser.staffProfile?.status === "SUSPENDED") {
    return "/auth/suspended";
  }
  if (appUser.resortProfile) return "/resort/dashboard";
  if (appUser.staffProfile) {
    return appUser.staffProfile.status === "ACTIVE"
      ? "/resort/dashboard"
      : "/waiting-for-approval";
  }
  return "/";
}
