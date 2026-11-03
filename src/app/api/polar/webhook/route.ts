import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import {
  WebhookVerificationError,
  validateEvent,
} from "@polar-sh/sdk/webhooks";

import { prisma } from "@/lib/prisma";

type SubscriptionEvent = {
  type: string;
  data?: {
    id?: string;
    status?: string;
    currentPeriodEnd?: Date | string | null;
    productId?: string | null;
    customer?: { externalId?: string | null } | null;
  };
};

const statusMap: Record<string, "ACTIVE" | "PAST_DUE" | "CANCELED" | "REVOKED"> = {
  active: "ACTIVE",
  past_due: "PAST_DUE",
  canceled: "CANCELED",
  revoked: "REVOKED",
};

export async function POST(request: NextRequest) {
  const secret = process.env.POLAR_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json({ error: "Polar webhook is not configured." }, { status: 503 });
  }

  const body = await request.text();
  const headers = {
    "webhook-id": request.headers.get("webhook-id") ?? "",
    "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
    "webhook-signature": request.headers.get("webhook-signature") ?? "",
  };

  let event: SubscriptionEvent;
  try {
    event = validateEvent(body, headers, secret) as unknown as SubscriptionEvent;
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return NextResponse.json({ received: false }, { status: 403 });
    }

    return NextResponse.json({ received: false }, { status: 400 });
  }

  if (!event.type.startsWith("subscription.") || !event.data) {
    return NextResponse.json({ received: true });
  }

  const externalCustomerId = event.data.customer?.externalId;
  const status = statusMap[event.data.status ?? ""];

  const tenant = externalCustomerId
    ? await prisma.tenantProfile.findUnique({
        where: { appUserId: externalCustomerId },
        select: { id: true },
      })
    : null;

  const webhookId = headers["webhook-id"];
  if (!webhookId) {
    return NextResponse.json({ received: false, error: "Missing webhook id." }, { status: 400 });
  }

  try {
    await prisma.polarWebhookEvent.create({
      data: {
        id: webhookId,
        type: event.type,
        tenantProfileId: tenant?.id ?? null,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ received: false, duplicate: true }, { status: 409 });
    }
    throw error;
  }

  if (!externalCustomerId || !status || !tenant) {
    return NextResponse.json({ received: true });
  }

  await prisma.tenantProfile.updateMany({
    where: { appUserId: externalCustomerId },
    data: {
      polarCustomerId: event.data.customer?.externalId ?? undefined,
      polarProductId: event.data.productId ?? undefined,
      polarSubscriptionId: event.data.id ?? undefined,
      subscriptionStatus: status,
      currentPeriodEnd: event.data.currentPeriodEnd
        ? new Date(event.data.currentPeriodEnd)
        : undefined,
    },
  });

  return NextResponse.json({ received: true });
}
