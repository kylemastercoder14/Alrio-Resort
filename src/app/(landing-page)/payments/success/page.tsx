import Link from "next/link";
import { IconCircleCheck, IconClock } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  const { reference } = await searchParams;
  const checkout = reference
    ? await prisma.resortPaymentCheckout.findUnique({
        where: { referenceNumber: reference },
        include: { reservation: { select: { guestName: true } } },
      })
    : null;
  const paid = checkout?.status === "PAID";

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-20">
      <section className="w-full max-w-xl rounded-3xl border bg-white p-8 text-center shadow-sm">
        {paid ? (
          <IconCircleCheck className="mx-auto size-14 text-emerald-600" />
        ) : (
          <IconClock className="mx-auto size-14 text-amber-600" />
        )}
        <h1 className="mt-5 text-3xl font-semibold">
          {paid ? "Payment confirmed" : "Payment is being confirmed"}
        </h1>
        <p className="mt-3 text-zinc-600">
          {paid
            ? `Thank you${checkout?.reservation.guestName ? `, ${checkout.reservation.guestName}` : ""}. Your PayMongo payment is recorded on the reservation.`
            : "PayMongo is still notifying Alrio about the transaction. Refresh shortly; the webhook confirmation is the source of truth."}
        </p>
        {reference ? <p className="mt-4 text-sm text-zinc-500">Reference: {reference}</p> : null}
        <div className="mt-7 flex justify-center gap-3">
          {!paid ? <Button asChild variant="outline"><Link href={`/payments/success?reference=${reference ?? ""}`}>Refresh status</Link></Button> : null}
          <Button asChild><Link href="/">Return home</Link></Button>
        </div>
      </section>
    </main>
  );
}
