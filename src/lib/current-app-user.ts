import "server-only";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getCurrentAppUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return {
      session,
      appUser: null,
    };
  }

  const appUser = await prisma.appUser.findUnique({
    where: {
      authUserId: session.user.id,
    },
    include: {
      resortProfile: true,
      staffProfile: {
        include: {
          resortProfile: true,
        },
      },
    },
  });

  return {
    session,
    appUser,
  };
}
