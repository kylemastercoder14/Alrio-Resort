import { APIError, betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { importPKCS8, SignJWT } from "jose";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/invite-email";
import {
  safelyRecordStaffActivityForAuthUser,
  STAFF_ACTIVITY_ACTIONS,
} from "@/lib/staff-activity";

async function generateAppleClientSecret(input: {
  clientId: string;
  teamId: string;
  keyId: string;
  privateKey: string;
}) {
  const key = await importPKCS8(input.privateKey.replace(/\\n/g, "\n"), "ES256");
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: input.keyId })
    .setIssuer(input.teamId)
    .setSubject(input.clientId)
    .setAudience("https://appleid.apple.com")
    .setIssuedAt(now)
    .setExpirationTime(now + 180 * 24 * 60 * 60)
    .sign(key);
}

const socialProviders = {
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      }
    : {}),
  ...(process.env.APPLE_CLIENT_ID &&
  process.env.APPLE_TEAM_ID &&
  process.env.APPLE_KEY_ID &&
  process.env.APPLE_PRIVATE_KEY
    ? {
        apple: async () => ({
          clientId: process.env.APPLE_CLIENT_ID as string,
          clientSecret: await generateAppleClientSecret({
            clientId: process.env.APPLE_CLIENT_ID as string,
            teamId: process.env.APPLE_TEAM_ID as string,
            keyId: process.env.APPLE_KEY_ID as string,
            privateKey: process.env.APPLE_PRIVATE_KEY as string,
          }),
          appBundleIdentifier:
            process.env.APPLE_APP_BUNDLE_IDENTIFIER || undefined,
        }),
      }
    : {}),
};

export const auth = betterAuth({
  appName: "Alrio Private Resort",
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const appUser = await prisma.appUser.findUnique({
            where: { authUserId: session.userId },
            select: { guestDisabledAt: true },
          });

          if (appUser?.guestDisabledAt) {
            throw new APIError("FORBIDDEN", {
              code: "GUEST_ACCOUNT_DISABLED",
              message:
                "This guest account is disabled. Please contact Alrio Private Resort for assistance.",
            });
          }
        },
        after: async (session) => {
          await safelyRecordStaffActivityForAuthUser(session.userId, {
            action: STAFF_ACTIVITY_ACTIONS.signedIn,
            title: "Signed in",
            detail: "Signed in to the Alrio staff workspace.",
            actorAuthUserId: session.userId,
            ipAddress: session.ipAddress,
            userAgent: session.userAgent,
            metadata: { sessionId: session.id },
          });
        },
      },
      delete: {
        before: async (session) => {
          await safelyRecordStaffActivityForAuthUser(session.userId, {
            action: STAFF_ACTIVITY_ACTIONS.signedOut,
            title: "Signed out",
            detail: "Signed out of the Alrio staff workspace.",
            actorAuthUserId: session.userId,
            ipAddress: session.ipAddress,
            userAgent: session.userAgent,
            metadata: { sessionId: session.id },
          });
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    resetPasswordTokenExpiresIn: 3600,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({ email: user.email, url });
    },
  },
  socialProviders,
  plugins: [nextCookies()],
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    "https://appleid.apple.com",
  ],
});

export type AuthSession = typeof auth.$Infer.Session;
