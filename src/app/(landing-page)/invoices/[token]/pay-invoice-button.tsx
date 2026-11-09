"use client";

import { useState } from "react";
import { IconCreditCardPay, IconLoader2 } from "@tabler/icons-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";

export function PayInvoiceButton({ token }: { token: string }) {
  const [isPending, setIsPending] = useState(false);

  async function pay() {
    setIsPending(true);
    const toastId = toast.loading("Opening secure PayMongo checkout...");
    try {
      const response = await fetch("/api/paymongo/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceToken: token }),
      });
      const result = (await response.json()) as { checkoutUrl?: string; error?: string };
      if (!response.ok || !result.checkoutUrl) throw new Error(result.error ?? "Unable to start payment.");
      toast.success("Redirecting to PayMongo...", { id: toastId });
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start payment.", { id: toastId });
      setIsPending(false);
    }
  }

  return (
    <Button size="lg" className="w-full rounded-xl" disabled={isPending} onClick={() => void pay()}>
      {isPending ? <IconLoader2 className="animate-spin" /> : <IconCreditCardPay />}
      {isPending ? "Opening checkout..." : "Pay securely with PayMongo"}
    </Button>
  );
}
