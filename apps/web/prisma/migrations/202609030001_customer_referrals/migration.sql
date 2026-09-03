-- Add an optional customer-to-customer referral relationship without changing
-- existing customer or appointment history.
ALTER TABLE "Customer" ADD COLUMN "referrerId" TEXT;
CREATE INDEX "Customer_referrerId_idx" ON "Customer"("referrerId");
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_referrerId_fkey"
  FOREIGN KEY ("referrerId") REFERENCES "Customer"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
