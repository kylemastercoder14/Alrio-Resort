-- Give each invoice a non-sequential public identifier for guest-facing links.
ALTER TABLE "resort_invoice" ADD COLUMN "publicToken" TEXT;

UPDATE "resort_invoice"
SET "publicToken" = md5(random()::text || clock_timestamp()::text || "id");

ALTER TABLE "resort_invoice" ALTER COLUMN "publicToken" SET NOT NULL;

CREATE UNIQUE INDEX "resort_invoice_publicToken_key"
ON "resort_invoice"("publicToken");
