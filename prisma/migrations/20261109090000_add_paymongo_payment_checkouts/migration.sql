CREATE TABLE "resort_payment_checkout" (
    "id" TEXT NOT NULL,
    "resortProfileId" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "paymongoSessionId" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "checkoutUrl" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "paymentId" TEXT,
    "paymentMethod" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resort_payment_checkout_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "resort_payment_checkout_paymongoSessionId_key" ON "resort_payment_checkout"("paymongoSessionId");
CREATE UNIQUE INDEX "resort_payment_checkout_referenceNumber_key" ON "resort_payment_checkout"("referenceNumber");
CREATE UNIQUE INDEX "resort_payment_checkout_paymentId_key" ON "resort_payment_checkout"("paymentId");
CREATE INDEX "resort_payment_checkout_resortProfileId_idx" ON "resort_payment_checkout"("resortProfileId");
CREATE INDEX "resort_payment_checkout_reservationId_idx" ON "resort_payment_checkout"("reservationId");
CREATE INDEX "resort_payment_checkout_invoiceId_idx" ON "resort_payment_checkout"("invoiceId");
CREATE INDEX "resort_payment_checkout_status_idx" ON "resort_payment_checkout"("status");

ALTER TABLE "resort_payment_checkout" ADD CONSTRAINT "resort_payment_checkout_resortProfileId_fkey" FOREIGN KEY ("resortProfileId") REFERENCES "resort_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resort_payment_checkout" ADD CONSTRAINT "resort_payment_checkout_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "resort_reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resort_payment_checkout" ADD CONSTRAINT "resort_payment_checkout_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "resort_invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
