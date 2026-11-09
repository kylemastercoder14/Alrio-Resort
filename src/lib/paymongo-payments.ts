import "server-only";

import { prisma } from "@/lib/prisma";
import { moneyString, parseMoney, type PayMongoCheckoutSession } from "@/lib/paymongo";

export async function settlePayMongoCheckout(session: PayMongoCheckoutSession) {
  const checkout = await prisma.resortPaymentCheckout.findUnique({
    where: { paymongoSessionId: session.id },
    include: {
      reservation: {
        include: {
          invoices: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });
  if (!checkout) throw new Error(`Unknown PayMongo checkout session ${session.id}.`);
  if (checkout.status === "PAID") return checkout;

  const paidPayment = session.attributes.payments?.find(
    (payment) => payment.attributes?.status === "paid",
  );
  if (!paidPayment) throw new Error("PayMongo checkout does not contain a paid payment.");

  const paidAmount = (paidPayment.attributes?.amount ?? 0) / 100;
  const expectedAmount = parseMoney(checkout.amount);
  if (Math.abs(paidAmount - expectedAmount) > 0.009) {
    throw new Error("PayMongo payment amount does not match the checkout amount.");
  }

  const method = `PayMongo ${paidPayment.attributes?.source?.type ?? "online"}`;
  const code = `PAYMONGO-${paidPayment.id}`.slice(0, 120);

  return prisma.$transaction(async (tx) => {
    const current = await tx.resortPaymentCheckout.findUnique({
      where: { id: checkout.id },
    });
    if (current?.status === "PAID") return current;

    let remaining = paidAmount;
    let firstInvoiceId: string | null = checkout.invoiceId;
    const invoices = checkout.invoiceId
      ? checkout.reservation.invoices.filter((invoice) => invoice.id === checkout.invoiceId)
      : checkout.reservation.invoices;

    for (const invoice of invoices) {
      const balance = parseMoney(invoice.balanceDue);
      if (remaining <= 0 || balance <= 0) continue;
      const allocated = Math.min(remaining, balance);
      const nextBalance = Math.max(balance - allocated, 0);
      firstInvoiceId ??= invoice.id;
      await tx.resortInvoice.update({
        where: { id: invoice.id },
        data: {
          balanceDue: moneyString(nextBalance),
          depositPaid: moneyString(parseMoney(invoice.depositPaid) + allocated),
          paidAt: nextBalance <= 0.009 ? new Date() : invoice.paidAt,
          paymentMethod: method,
          status: nextBalance <= 0.009 ? "PAID" : invoice.status,
        },
      });
      remaining -= allocated;
    }

    await tx.resortPaymentLog.upsert({
      where: {
        resortProfileId_code: {
          resortProfileId: checkout.resortProfileId,
          code,
        },
      },
      create: {
        amount: moneyString(paidAmount),
        code,
        invoiceId: firstInvoiceId,
        paymentMethod: method,
        proofNote: `PayMongo checkout ${session.id}`,
        reservationId: checkout.reservationId,
        resortProfileId: checkout.resortProfileId,
        status: "RECORDED",
      },
      update: {},
    });

    await tx.resortFinanceEntry.upsert({
      where: {
        resortProfileId_code: {
          resortProfileId: checkout.resortProfileId,
          code,
        },
      },
      create: {
        amount: moneyString(paidAmount),
        category: "Reservation payment",
        code,
        description: `PayMongo payment for ${checkout.reservation.guestName}`,
        entryDate: new Date(),
        resortProfileId: checkout.resortProfileId,
        source: "INVOICE_PAYMENT",
        status: "CLEARED",
        type: "REVENUE",
      },
      update: {},
    });

    await tx.resortReservation.update({
      where: { id: checkout.reservationId },
      data: {
        paymentMethod: method,
        status: checkout.reservation.status === "PENDING" ? "CONFIRMED" : undefined,
      },
    });

    return tx.resortPaymentCheckout.update({
      where: { id: checkout.id },
      data: {
        paidAt: new Date(),
        paymentId: paidPayment.id,
        paymentMethod: method,
        status: "PAID",
      },
    });
  });
}
