import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const STAFF_ACTIVITY_ACTIONS = {
  accountCreated: "ACCOUNT_CREATED",
  avatarUpdated: "AVATAR_UPDATED",
  passwordChanged: "PASSWORD_CHANGED",
  profileUpdated: "PROFILE_UPDATED",
  roleUpdated: "ROLE_UPDATED",
  signedIn: "SIGNED_IN",
  signedOut: "SIGNED_OUT",
  statusUpdated: "STATUS_UPDATED",
  workspaceAction: "WORKSPACE_ACTION",
} as const;

type StaffActivityInput = {
  action: (typeof STAFF_ACTIVITY_ACTIONS)[keyof typeof STAFF_ACTIVITY_ACTIONS];
  title: string;
  detail: string;
  actorAuthUserId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function recordStaffActivityForAuthUser(
  authUserId: string,
  input: StaffActivityInput,
) {
  const staff = await prisma.resortStaffProfile.findUnique({
    where: { appUserId: authUserId },
    select: { id: true, resortProfileId: true },
  });

  if (!staff) return null;

  return recordStaffActivityForProfile({
    ...input,
    resortProfileId: staff.resortProfileId,
    staffProfileId: staff.id,
  });
}

export async function recordStaffActivityForProfile(
  input: StaffActivityInput & {
    resortProfileId: string;
    staffProfileId: string;
  },
) {
  return prisma.resortStaffActivityLog.create({
    data: {
      resortProfileId: input.resortProfileId,
      staffProfileId: input.staffProfileId,
      actorAuthUserId: input.actorAuthUserId ?? null,
      action: input.action,
      title: input.title,
      detail: input.detail,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      metadata: input.metadata,
    },
  });
}

export async function safelyRecordStaffActivityForAuthUser(
  authUserId: string,
  input: StaffActivityInput,
) {
  try {
    await recordStaffActivityForAuthUser(authUserId, input);
  } catch (error) {
    console.error("Unable to record staff activity", error);
  }
}
