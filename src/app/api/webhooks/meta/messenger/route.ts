import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

import { Prisma } from "@/generated/prisma/client";
import {
  extractMessengerTargetDate,
  fetchMessengerProfile,
  inferMessengerLeadStage,
} from "@/lib/messenger-leads";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type MessengerWebhookPayload = {
  object?: string;
  entry?: MessengerEntry[];
};

type MessengerEntry = {
  id?: string;
  messaging?: MessengerEvent[];
  time?: number;
};

type MessengerEvent = {
  message?: {
    attachments?: unknown[];
    mid?: string;
    text?: string;
  };
  postback?: {
    payload?: string;
    title?: string;
  };
  recipient?: {
    id?: string;
  };
  sender?: {
    id?: string;
  };
  timestamp?: number;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 });
  }

  return NextResponse.json(
    { error: "Invalid Messenger webhook verification token." },
    { status: 403 },
  );
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!isValidMetaSignature(rawBody, request.headers)) {
    return NextResponse.json(
      { error: "Invalid Messenger webhook signature." },
      { status: 401 },
    );
  }

  let payload: MessengerWebhookPayload;

  try {
    payload = JSON.parse(rawBody) as MessengerWebhookPayload;
  } catch {
    return NextResponse.json(
      { error: "Invalid Messenger webhook JSON." },
      { status: 400 },
    );
  }

  if (payload.object !== "page") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const processed = await Promise.all(
    (payload.entry ?? []).flatMap((entry) =>
      (entry.messaging ?? []).map((event) =>
        persistMessengerEvent(entry, event, payload),
      ),
    ),
  );

  return NextResponse.json({
    ok: true,
    processed: processed.filter(Boolean).length,
  });
}

function isValidMetaSignature(rawBody: string, headers: Headers) {
  const appSecret = process.env.META_APP_SECRET;

  if (!appSecret) {
    return process.env.NODE_ENV !== "production";
  }

  const signature = headers.get("x-hub-signature-256");

  if (!signature?.startsWith("sha256=")) {
    return false;
  }

  const expected = createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex");
  const actual = signature.slice("sha256=".length);

  return safeEqualHex(actual, expected);
}

function safeEqualHex(actual: string, expected: string) {
  try {
    const actualBuffer = Buffer.from(actual, "hex");
    const expectedBuffer = Buffer.from(expected, "hex");

    if (actualBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(actualBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

async function persistMessengerEvent(
  entry: MessengerEntry,
  event: MessengerEvent,
  payload: MessengerWebhookPayload,
) {
  const senderId = event.sender?.id;
  const recipientId = event.recipient?.id;
  const pageId = entry.id ?? process.env.META_PAGE_ID;
  const text = event.message?.text ?? event.postback?.title ?? null;
  const postbackPayload = event.postback?.payload ?? null;
  const attachments = event.message?.attachments ?? null;

  if (!senderId || !pageId || (!text && !postbackPayload && !attachments)) {
    return null;
  }

  const integration = await getOrCreateMessengerIntegration(pageId);

  if (!integration) {
    return null;
  }

  const sentAt = event.timestamp ? new Date(event.timestamp) : new Date();
  const messageSummary = text ?? postbackPayload ?? "Messenger attachment";
  const leadPsid = senderId === integration.pageId ? recipientId : senderId;
  const direction = senderId === integration.pageId ? "OUTBOUND" : "INBOUND";
  const attachmentJson = attachments
    ? (attachments as Prisma.InputJsonValue)
    : undefined;
  const rawJson = payload as Prisma.InputJsonValue;

  if (!leadPsid || leadPsid === integration.pageId) {
    return null;
  }

  const profile = integration.pageAccessToken
    ? await fetchMessengerProfile({
        graphVersion: process.env.META_GRAPH_API_VERSION ?? "v25.0",
        pageAccessToken: integration.pageAccessToken,
        psid: leadPsid,
      })
    : null;
  const existingLead = await prisma.resortLead.findUnique({
    where: {
      resortProfileId_psid: {
        resortProfileId: integration.resortProfileId,
        psid: leadPsid,
      },
    },
    select: {
      profilePictureUrl: true,
      stage: true,
      targetDate: true,
    },
  });
  const inferredStage = inferMessengerLeadStage(messageSummary);
  const inferredTargetDate = extractMessengerTargetDate(messageSummary, sentAt);
  const shouldAutoStage = !existingLead || existingLead.stage === "INTAKE";

  const lead = await prisma.resortLead.upsert({
    where: {
      resortProfileId_psid: {
        resortProfileId: integration.resortProfileId,
        psid: leadPsid,
      },
    },
    create: {
      guestName: profile?.name ?? "Messenger guest",
      inquiry: messageSummary,
      lastMessage: messageSummary,
      lastMessageAt: sentAt,
      messengerIntegrationId: integration.id,
      profilePictureUrl: profile?.profilePictureUrl,
      psid: leadPsid,
      source: "Messenger",
      stage: inferredStage,
      targetDate: inferredTargetDate,
      resortProfileId: integration.resortProfileId,
    },
    update: {
      guestName: profile?.name ?? undefined,
      inquiry: messageSummary,
      lastMessage: messageSummary,
      lastMessageAt: sentAt,
      messengerIntegrationId: integration.id,
      profilePictureUrl:
        profile?.profilePictureUrl ??
        existingLead?.profilePictureUrl ??
        undefined,
      stage: shouldAutoStage ? inferredStage : undefined,
      targetDate: existingLead?.targetDate ?? inferredTargetDate ?? undefined,
    },
  });

  await prisma.resortLeadMessage.upsert({
    where: {
      metaMessageId: event.message?.mid ?? syntheticMessageId(senderId, sentAt),
    },
    create: {
      attachments: attachmentJson,
      direction,
      lead: {
        connect: {
          id: lead.id,
        },
      },
      metaMessageId: event.message?.mid ?? syntheticMessageId(senderId, sentAt),
      postbackPayload,
      raw: rawJson,
      recipientId: recipientId ?? integration.pageId,
      senderId,
      sentAt,
      text,
    },
    update: {
      attachments: attachmentJson,
      direction,
      postbackPayload,
      raw: rawJson,
      text,
    },
  });

  return lead.id;
}

async function getOrCreateMessengerIntegration(pageId: string) {
  const existing = await prisma.resortMessengerIntegration.findUnique({
    where: {
      pageId,
    },
  });

  if (existing) {
    return existing;
  }

  if (pageId !== process.env.META_PAGE_ID) {
    return null;
  }

  const resortProfile = await prisma.resortProfile.findFirst({
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!resortProfile) {
    return null;
  }

  return prisma.resortMessengerIntegration.create({
    data: {
      pageAccessToken: process.env.META_PAGE_ACCESS_TOKEN,
      pageId,
      subscribedFields: ["messages", "messaging_postbacks", "messaging_referrals"],
      resortProfileId: resortProfile.id,
      verifyToken: process.env.META_VERIFY_TOKEN,
    },
  });
}

function syntheticMessageId(senderId: string, sentAt: Date) {
  return `synthetic:${senderId}:${sentAt.getTime()}`;
}
