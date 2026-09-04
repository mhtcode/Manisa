ALTER TABLE "Appointment" ADD COLUMN "paymentReconciliationRequired" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "PaymentMethod" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "icon" TEXT NOT NULL DEFAULT 'wallet',
  "position" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AppointmentPayment" (
  "id" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "paymentMethodId" TEXT,
  "methodNameSnapshot" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "paidAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "note" TEXT,
  "recordedById" TEXT,
  "voidedAt" TIMESTAMP(3),
  "voidReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppointmentPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentMethod_name_key" ON "PaymentMethod"("name");
CREATE INDEX "PaymentMethod_active_position_idx" ON "PaymentMethod"("active", "position");
CREATE INDEX "PaymentMethod_deletedAt_idx" ON "PaymentMethod"("deletedAt");
CREATE INDEX "AppointmentPayment_appointmentId_voidedAt_idx" ON "AppointmentPayment"("appointmentId", "voidedAt");
CREATE INDEX "AppointmentPayment_paymentMethodId_paidAt_idx" ON "AppointmentPayment"("paymentMethodId", "paidAt");
CREATE INDEX "AppointmentPayment_paidAt_idx" ON "AppointmentPayment"("paidAt");
CREATE INDEX "AppointmentPayment_voidedAt_idx" ON "AppointmentPayment"("voidedAt");
ALTER TABLE "AppointmentPayment" ADD CONSTRAINT "AppointmentPayment_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppointmentPayment" ADD CONSTRAINT "AppointmentPayment_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AppointmentPayment" ADD CONSTRAINT "AppointmentPayment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "PaymentMethod" ("id", "name", "icon", "position", "active") VALUES
  ('payment_method_cash', 'Cash', 'banknote', 0, true),
  ('payment_method_debit', 'Debit card', 'credit-card', 1, true),
  ('payment_method_credit', 'Credit card', 'credit-card', 2, true),
  ('payment_method_etransfer', 'Interac e-Transfer', 'landmark', 3, true),
  ('payment_method_other', 'Other', 'wallet', 4, true),
  ('payment_method_legacy', 'Legacy / unspecified', 'history', 99, false);

INSERT INTO "AppointmentPayment" ("id", "appointmentId", "paymentMethodId", "methodNameSnapshot", "amount", "paidAt", "createdAt", "updatedAt")
SELECT 'legacy_' || "id", "id", 'payment_method_legacy', 'Legacy / unspecified', "finalPrice", COALESCE("completedAt", "updatedAt"), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Appointment"
WHERE "status" = 'COMPLETED' AND "paymentStatus" = 'PAID' AND "finalPrice" IS NOT NULL AND "finalPrice" > 0;

UPDATE "Appointment" SET "paymentReconciliationRequired" = true WHERE "status" = 'COMPLETED' AND "paymentStatus" = 'PARTIALLY_PAID';
