import { NextResponse } from "next/server";

import { type PayMongoCheckoutSession, verifyPayMongoSignature } from "@/lib/paymongo";
import { settlePayMongoCheckout } from "@/lib/paymongo-payments";

type PayMongoWebhook = {
  data?: {
    type?: string;
    data?: PayMongoCheckoutSession;
  };
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("paymongo-signature") ?? "";

  try {
    if (!(await verifyPayMongoSignature(rawBody, signature))) {
      return NextResponse.json({ received: false }, { status: 401 });
    }
    const event = JSON.parse(rawBody) as PayMongoWebhook;
    if (event.data?.type === "checkout_session.payment.paid" && event.data.data) {
      await settlePayMongoCheckout(event.data.data);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("PayMongo webhook failed", error);
    return NextResponse.json(
      { received: false, error: error instanceof Error ? error.message : "Webhook failed." },
      { status: 400 },
    );
  }
}
