import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const PAYMONGO_API_URL = "https://api.paymongo.com/v2";

export type PayMongoCheckoutSession = {
  id: string;
  type: "checkout_session";
  attributes: {
    checkout_url?: string;
    reference_number?: string;
    metadata?: Record<string, string>;
    status?: string;
    payments?: Array<{
      id: string;
      attributes?: {
        amount?: number;
        currency?: string;
        status?: string;
        source?: { type?: string };
      };
    }>;
  };
};

type PayMongoResponse<T> = { data: T; errors?: Array<{ detail?: string }> };

function getSecretKey() {
  const key = process.env.PAYMONGO_SECRET_KEY;
  if (!key) throw new Error("PAYMONGO_SECRET_KEY is not configured.");
  return key;
}

async function request<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${PAYMONGO_API_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Basic ${Buffer.from(`${getSecretKey()}:`).toString("base64")}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const payload = (await response.json()) as PayMongoResponse<T>;

  if (!response.ok) {
    throw new Error(
      payload.errors?.map((error) => error.detail).filter(Boolean).join(" ") ||
        `PayMongo request failed with status ${response.status}.`,
    );
  }

  return payload.data;
}

export async function createPayMongoCheckout(input: {
  amountCentavos: number;
  cancelUrl: string;
  customerEmail?: string | null;
  customerName: string;
  description: string;
  metadata: Record<string, string>;
  referenceNumber: string;
  successUrl: string;
}) {
  return request<PayMongoCheckoutSession>("/checkout_sessions", {
    method: "POST",
    body: JSON.stringify({
      data: {
        attributes: {
          billing: input.customerEmail
            ? { email: input.customerEmail, name: input.customerName }
            : { name: input.customerName },
          cancel_url: input.cancelUrl,
          description: input.description,
          line_items: [
            {
              amount: input.amountCentavos,
              currency: "PHP",
              name: input.description,
              quantity: 1,
            },
          ],
          metadata: input.metadata,
          payment_method_types: ["card", "gcash", "qrph"],
          reference_number: input.referenceNumber,
          send_email_receipt: true,
          success_url: input.successUrl,
        },
      },
    }),
  });
}

export function verifyPayMongoSignature(rawBody: string, signatureHeader: string) {
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error("PAYMONGO_WEBHOOK_SECRET is not configured.");

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, ...value] = part.trim().split("=");
      return [key, value.join("=")];
    }),
  );
  const timestamp = parts.t;
  const expectedKey = getSecretKey().startsWith("sk_live_") ? "li" : "te";
  const received = parts[expectedKey];
  if (!timestamp || !received) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;

  const calculated = createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  const a = Buffer.from(calculated);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function pesosToCentavos(amount: number) {
  return Math.round(amount * 100);
}

export function parseMoney(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "0").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function moneyString(value: number) {
  return Math.max(value, 0).toFixed(2);
}
