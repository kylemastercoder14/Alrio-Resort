import { NextResponse } from "next/server";

import { getCurrentAppUser } from "@/lib/current-app-user";
import { createPayMongoCheckout, parseMoney, pesosToCentavos } from "@/lib/paymongo";
import { prisma } from "@/lib/prisma";
import { getRuntimeSetting } from "@/lib/runtime-settings";

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as {
      amount?: number;
      invoiceId?: string;
      invoiceToken?: string;
      reservationId?: string;
    };
    const publicInvoice = input.invoiceToken
      ? await prisma.resortInvoice.findUnique({ where: { publicToken: input.invoiceToken } })
      : null;

    if (input.invoiceToken && !publicInvoice) {
      return NextResponse.json({ error: "Invoice was not found." }, { status: 404 });
    }
    if (publicInvoice && ["PAID", "VOID"].includes(publicInvoice.status)) {
      return NextResponse.json({ error: "This invoice is not payable." }, { status: 400 });
    }

    const reservationId = publicInvoice?.reservationId ?? input.reservationId;
    const invoiceId = publicInvoice?.id ?? input.invoiceId;
    if (!reservationId) {
      return NextResponse.json(
        { error: "Online payment is available for reservation invoices. Please contact Alrio for this invoice." },
        { status: 400 },
      );
    }

    const reservation = await prisma.resortReservation.findUnique({
      where: { id: reservationId },
      include: {
        invoices: { orderBy: { createdAt: "asc" } },
        paymentLogs: { where: { status: "RECORDED" } },
        resortProfile: { select: { id: true, resortName: true } },
      },
    });
    if (!reservation) return NextResponse.json({ error: "Reservation was not found." }, { status: 404 });

    if (!publicInvoice) {
      const { session, appUser } = await getCurrentAppUser();
      if (!session?.user?.id || !appUser) {
        return NextResponse.json({ error: "Sign in before starting a payment." }, { status: 401 });
      }
      const staffResortId = appUser.resortProfile?.id ?? appUser.staffProfile?.resortProfileId;
      const isStaff = staffResortId === reservation.resortProfileId;
      const isGuest =
        reservation.guestAccountId === appUser.authUserId ||
        (!!reservation.guestEmail && reservation.guestEmail === session.user.email);
      if (!isStaff && !isGuest) {
        return NextResponse.json({ error: "You cannot pay this reservation." }, { status: 403 });
      }
    } else if (publicInvoice.resortProfileId !== reservation.resortProfileId) {
      return NextResponse.json({ error: "Invoice does not belong to this reservation." }, { status: 400 });
    }

    const targetInvoice = invoiceId
      ? reservation.invoices.find((invoice) => invoice.id === invoiceId)
      : null;
    if (invoiceId && !targetInvoice) {
      return NextResponse.json({ error: "Invoice does not belong to this reservation." }, { status: 400 });
    }

    const invoiceBalance = targetInvoice
      ? parseMoney(targetInvoice.balanceDue)
      : reservation.invoices.reduce((sum, invoice) => sum + parseMoney(invoice.balanceDue), 0);
    const loggedPayments = reservation.paymentLogs.reduce((sum, payment) => sum + parseMoney(payment.amount), 0);
    const reservationBalance = Math.max(parseMoney(reservation.totalAmount) - loggedPayments, 0);
    const outstanding = invoiceBalance > 0 ? invoiceBalance : reservationBalance;
    const requestedAmount = Number(input.amount ?? outstanding);
    const amount = publicInvoice ? outstanding : requestedAmount;

    if (!Number.isFinite(amount) || amount <= 0 || amount - outstanding > 0.009) {
      return NextResponse.json(
        { error: "Payment must be greater than zero and cannot exceed the outstanding balance." },
        { status: 400 },
      );
    }

    const amountString = amount.toFixed(2);
    const existingCheckout = await prisma.resortPaymentCheckout.findFirst({
      where: { amount: amountString, invoiceId: targetInvoice?.id ?? null, reservationId: reservation.id, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });
    if (existingCheckout) {
      return NextResponse.json({ checkoutUrl: existingCheckout.checkoutUrl, referenceNumber: existingCheckout.referenceNumber, reused: true });
    }

    const referenceNumber = `ALRIO-${reservation.id.slice(-8).toUpperCase()}-${Date.now()}`;
    const appUrl = (await getRuntimeSetting(reservation.resortProfileId, "APP_URL")) ?? "http://localhost:3000";
    const successUrl = new URL("/payments/success", appUrl);
    const cancelUrl = new URL(publicInvoice ? `/invoices/${publicInvoice.publicToken}` : "/payments/canceled", appUrl);
    successUrl.searchParams.set("reference", referenceNumber);
    if (publicInvoice) successUrl.searchParams.set("invoice", publicInvoice.publicToken);

    const checkout = await createPayMongoCheckout({
      amountCentavos: pesosToCentavos(amount),
      cancelUrl: cancelUrl.toString(),
      customerEmail: targetInvoice?.guestEmail ?? reservation.guestEmail,
      customerName: targetInvoice?.guestName ?? reservation.guestName,
      description: `${reservation.resortProfile.resortName ?? "Alrio Private Resort"} invoice ${targetInvoice?.code ?? "payment"}`,
      metadata: {
        invoiceId: targetInvoice?.id ?? "",
        reservationId: reservation.id,
        resortProfileId: reservation.resortProfileId,
      },
      referenceNumber,
      successUrl: successUrl.toString(),
    });
    const checkoutUrl = checkout.attributes.checkout_url;
    if (!checkoutUrl) throw new Error("PayMongo did not return a checkout URL.");

    await prisma.resortPaymentCheckout.create({
      data: {
        amount: amountString,
        checkoutUrl,
        invoiceId: targetInvoice?.id,
        paymongoSessionId: checkout.id,
        referenceNumber,
        reservationId: reservation.id,
        resortProfileId: reservation.resortProfileId,
      },
    });
    return NextResponse.json({ checkoutUrl, referenceNumber });
  } catch (error) {
    console.error("Unable to create PayMongo checkout", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to start PayMongo checkout." },
      { status: 500 },
    );
  }
}
