import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  safelyRecordStaffActivityForAuthUser,
  STAFF_ACTIVITY_ACTIONS,
} from "@/lib/staff-activity";

const f = createUploadthing();

export const ourFileRouter = {
  avatarUploader: f({ image: { maxFileCount: 1, maxFileSize: "4MB" } }, { awaitServerData: true })
    .middleware(async ({ req }) => {
      const session = await auth.api.getSession({ headers: req.headers });
      if (!session?.user?.id) {
        throw new UploadThingError({
          code: "FORBIDDEN",
          message: "Sign in to upload a profile photo.",
        });
      }
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      await prisma.user.update({
        where: { id: metadata.userId },
        data: { image: file.ufsUrl },
      });
      await safelyRecordStaffActivityForAuthUser(metadata.userId, {
        action: STAFF_ACTIVITY_ACTIONS.avatarUpdated,
        title: "Profile photo updated",
        detail: "Changed their staff profile photo.",
        actorAuthUserId: metadata.userId,
      });
      return { url: file.ufsUrl };
    }),
  roomImageUploader: f({
    image: {
      maxFileCount: 8,
      maxFileSize: "4MB",
    },
  })
    .middleware(async () => ({ uploadedBy: "resort" }))
    .onUploadComplete(async ({ file }) => ({
      name: file.name,
      url: file.ufsUrl,
    })),
  landingBrandingUploader: f({ image: { maxFileCount: 1, maxFileSize: "8MB" } })
    .middleware(async ({ req }) => {
      const session = await auth.api.getSession({ headers: req.headers });
      if (!session?.user?.id) throw new UploadThingError({ code: "FORBIDDEN", message: "Sign in to upload branding images." });
      const appUser = await prisma.appUser.findUnique({
        where: { authUserId: session.user.id },
        include: { resortProfile: { select: { id: true } }, staffProfile: { include: { accessRole: { select: { permissions: true } } } } },
      });
      const permissions = appUser?.staffProfile?.accessRole.permissions ?? [];
      if (!appUser?.resortProfile && !permissions.includes("*") && !permissions.includes("settings.branding.manage")) {
        throw new UploadThingError({ code: "FORBIDDEN", message: "You do not have permission to update landing-page branding." });
      }
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ file }) => ({ name: file.name, url: file.ufsUrl })),
  receiptUploader: f({
    image: {
      maxFileCount: 1,
      maxFileSize: "4MB",
    },
    pdf: {
      maxFileCount: 1,
      maxFileSize: "8MB",
    },
  })
    .middleware(async () => ({ uploadedBy: "resort" }))
    .onUploadComplete(async ({ file }) => ({
      name: file.name,
      url: file.ufsUrl,
    })),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
