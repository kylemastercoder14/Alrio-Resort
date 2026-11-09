import Link from "next/link";
import { IconCreditCardOff } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";

export default function PaymentCanceledPage() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-20">
      <section className="w-full max-w-xl rounded-3xl border bg-white p-8 text-center shadow-sm">
        <IconCreditCardOff className="mx-auto size-14 text-zinc-500" />
        <h1 className="mt-5 text-3xl font-semibold">Payment was not completed</h1>
        <p className="mt-3 text-zinc-600">
          No payment was recorded. Your reservation balance remains unchanged.
        </p>
        <Button asChild className="mt-7"><Link href="/">Return home</Link></Button>
      </section>
    </main>
  );
}
