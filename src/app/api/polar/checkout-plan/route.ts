import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPolarProductId, type BillingFrequency, type PaidPlanKey } from "@/lib/subscription/polar";

const paidPlans = new Set<PaidPlanKey>(["starter", "growth", "enterprise"]);
const billingFrequencies = new Set<BillingFrequency>(["monthly", "yearly"]);

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function isCheckoutEmail(value: string | null | undefined) {
  if (!value || /\.(test|invalid|localhost)$/i.test(value.split("@")[1] ?? "")) {
    return false;
  }
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}

function toTenantPlan(plan: PaidPlanKey) {
  if (plan === "starter") return "STARTER" as const;
  if (plan === "growth") return "GROWTH" as const;
  return "ENTERPRISE" as const;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const plan = url.searchParams.get("plan");
  const billing = url.searchParams.get("billing") ?? "monthly";

  if (!paidPlans.has(plan as PaidPlanKey) || !billingFrequencies.has(billing as BillingFrequency)) {
    return NextResponse.redirect(new URL("/pricing", appUrl));
  }

  const planKey = plan as PaidPlanKey;
  const billingFrequency = billing as BillingFrequency;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    const signUpUrl = new URL("/auth/sign-up", appUrl);
    signUpUrl.searchParams.set("userType", "tenant");
    signUpUrl.searchParams.set("plan", planKey);
    signUpUrl.searchParams.set("billing", billingFrequency);
    signUpUrl.searchParams.set("checkout", "polar");
    return NextResponse.redirect(signUpUrl);
  }

  const appUser = await prisma.appUser.findUnique({
    where: {
      authUserId: session.user.id,
    },
    select: {
      role: true,
      tenantProfile: {
        select: {
          id: true,
        },
      },
    },
  });

  if (appUser?.role !== "TENANT" || !appUser.tenantProfile) {
    return NextResponse.redirect(new URL("/pricing", appUrl));
  }

  const productId = getPolarProductId(planKey, billingFrequency);

  if (!productId) {
    const fallback = new URL("/auth/sign-up", appUrl);
    fallback.searchParams.set("userType", "tenant");
    fallback.searchParams.set("plan", planKey);
    fallback.searchParams.set("billing", billingFrequency);
    fallback.searchParams.set("checkout", "missing-polar-product");
    return NextResponse.redirect(fallback);
  }

  await prisma.tenantProfile.update({
    where: {
      appUserId: session.user.id,
    },
    data: {
      subscriptionPlan: toTenantPlan(planKey),
      subscriptionStatus: "PENDING",
      billingCycle: billingFrequency === "yearly" ? "YEARLY" : "MONTHLY",
    },
  });

  const checkoutUrl = new URL("/api/polar/checkout", appUrl);
  checkoutUrl.searchParams.set("products", productId);
  checkoutUrl.searchParams.set(
    "metadata",
    JSON.stringify({
      plan: planKey,
      billing: billingFrequency,
    }),
  );

  checkoutUrl.searchParams.set("customerExternalId", session.user.id);

  if (isCheckoutEmail(session?.user?.email)) {
    checkoutUrl.searchParams.set("customerEmail", session.user.email);
  }

  if (session?.user?.name) {
    checkoutUrl.searchParams.set("customerName", session.user.name);
  }

  return NextResponse.redirect(checkoutUrl);
}
