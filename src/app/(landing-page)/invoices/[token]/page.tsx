import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconCircleCheck } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { PayInvoiceButton } from "./pay-invoice-button";

export default async function PublicInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invoice = await prisma.resortInvoice.findUnique({
    where: { publicToken: token },
    include: {
      lineItems: { orderBy: { sortOrder: "asc" } },
      resortProfile: { select: { resortName: true } },
    },
  });
  if (!invoice) notFound();

  const resortName = invoice.resortProfile.resortName || "Alrio Private Resort";
  const payable = !!invoice.reservationId && !["PAID", "VOID"].includes(invoice.status) && money(invoice.balanceDue) > 0;

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="mb-8 inline-flex items-center gap-3">
          <Image src="/favicon.png" alt="" width={44} height={44} className="size-11 object-contain" />
          <span className="font-semibold text-zinc-950">{resortName}</span>
        </Link>
        <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          <header className="flex flex-col gap-5 border-b border-zinc-200 p-6 sm:flex-row sm:items-start sm:justify-between sm:p-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#AE7B0C]">Guest invoice</p>
              <h1 className="mt-2 text-3xl font-semibold text-zinc-950">{invoice.code}</h1>
              <p className="mt-2 text-zinc-500">Prepared for {invoice.guestName}</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-sm text-zinc-500">Balance due</p>
              <p className="mt-1 text-3xl font-semibold text-zinc-950">{peso(invoice.balanceDue)}</p>
              <p className="mt-1 text-sm text-zinc-500">Due {date(invoice.dueDate)}</p>
            </div>
          </header>

          <div className="p-6 sm:p-8">
            <div className="overflow-hidden rounded-2xl border border-zinc-200">
              <div className="grid grid-cols-[1fr_auto] gap-4 bg-zinc-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-zinc-500">
                <span>Description</span><span>Amount</span>
              </div>
              {invoice.lineItems.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_auto] gap-4 border-t border-zinc-200 px-4 py-4">
                  <div><p className="font-medium text-zinc-900">{item.description}</p><p className="mt-1 text-sm text-zinc-500">{item.quantity} × {peso(item.rate)}</p></div>
                  <p className="font-semibold text-zinc-900">{peso(item.amount)}</p>
                </div>
              ))}
            </div>

            <div className="ml-auto mt-6 max-w-sm space-y-3 text-sm">
              <Row label="Subtotal" value={peso(invoice.subtotal)} />
              {money(invoice.discount) > 0 ? <Row label="Discount" value={`−${peso(invoice.discount)}`} /> : null}
              {money(invoice.tax) > 0 ? <Row label="Tax" value={peso(invoice.tax)} /> : null}
              <Row label="Total" value={peso(invoice.totalAmount)} />
              <Row label="Paid" value={peso(invoice.depositPaid)} />
              <div className="border-t border-zinc-200 pt-3"><Row label="Balance due" value={peso(invoice.balanceDue)} strong /></div>
            </div>

            <div className="mt-8 rounded-2xl bg-zinc-50 p-5">
              {invoice.status === "PAID" ? (
                <div className="flex items-center gap-3 text-emerald-700"><IconCircleCheck className="size-6" /><p className="font-semibold">This invoice is fully paid.</p></div>
              ) : invoice.status === "VOID" ? (
                <p className="font-semibold text-zinc-600">This invoice has been voided.</p>
              ) : payable ? (
                <div><PayInvoiceButton token={token} /><p className="mt-3 text-center text-xs text-zinc-500">Card, GCash, and QR Ph · Payment handled securely by PayMongo</p></div>
              ) : (
                <p className="text-sm text-zinc-600">Online checkout is unavailable for this invoice. Please contact Alrio Private Resort to arrange payment.</p>
              )}
            </div>
          </div>
        </section>
        <div className="mt-6 text-center"><Button asChild variant="ghost"><Link href="/">Return to Alrio Private Resort</Link></Button></div>
      </div>
    </main>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className="flex items-center justify-between gap-4"><span className="text-zinc-500">{label}</span><span className={strong ? "text-lg font-bold text-zinc-950" : "font-semibold text-zinc-900"}>{value}</span></div>;
}
function money(value: string) { const amount = Number(value.replace(/[^\d.-]/g, "")); return Number.isFinite(amount) ? amount : 0; }
function peso(value: string) { return `₱${money(value).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function date(value: Date) { return value.toLocaleDateString("en-PH", { day: "numeric", month: "long", year: "numeric" }); }
