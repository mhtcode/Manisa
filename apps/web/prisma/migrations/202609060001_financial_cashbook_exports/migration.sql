CREATE TYPE "FinancialAccountType" AS ENUM ('CASH', 'BANK', 'CARD', 'E_WALLET', 'OTHER');
CREATE TYPE "FinancialCategoryType" AS ENUM ('INCOME', 'EXPENSE');
CREATE TYPE "FinancialTransactionType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER', 'OPENING_ADJUSTMENT', 'APPOINTMENT_PAYMENT', 'BILL_PAYMENT');
CREATE TYPE "RecurrenceFrequency" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');
CREATE TYPE "ExportJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'READY', 'FAILED', 'EXPIRED');

ALTER TABLE "BusinessSettings"
  ADD COLUMN "publicPhone" TEXT,
  ADD COLUMN "publicEmail" TEXT,
  ADD COLUMN "bookingUrl" TEXT,
  ADD COLUMN "studioTagline" TEXT,
  ADD COLUMN "studioBiography" TEXT,
  ADD COLUMN "financialRetentionDays" INTEGER NOT NULL DEFAULT 2190,
  ADD COLUMN "invoicePrefix" TEXT NOT NULL DEFAULT 'INV',
  ADD COLUMN "nextInvoiceNumber" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "FinancialAccount" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "FinancialAccountType" NOT NULL,
  "openingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "openedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "position" INTEGER NOT NULL DEFAULT 0,
  "deletedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "purgeAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinancialAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinancialCategory" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "FinancialCategoryType" NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "position" INTEGER NOT NULL DEFAULT 0,
  "deletedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "purgeAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinancialCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Vendor" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "notes" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "deletedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "purgeAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinancialTransaction" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "type" "FinancialTransactionType" NOT NULL,
  "accountId" TEXT NOT NULL,
  "destinationAccountId" TEXT,
  "categoryId" TEXT,
  "vendorId" TEXT,
  "billId" TEXT,
  "accountNameSnapshot" TEXT NOT NULL,
  "destinationNameSnapshot" TEXT,
  "categoryNameSnapshot" TEXT,
  "vendorNameSnapshot" TEXT,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "occurredAt" TIMESTAMPTZ(3) NOT NULL,
  "description" TEXT NOT NULL,
  "reference" TEXT,
  "createdById" TEXT,
  "updatedById" TEXT,
  "deletedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "purgeAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinancialTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupplierBill" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "vendorId" TEXT,
  "vendorNameSnapshot" TEXT NOT NULL,
  "billNumber" TEXT,
  "issueDate" TIMESTAMPTZ(3) NOT NULL,
  "dueDate" TIMESTAMPTZ(3),
  "currency" VARCHAR(3) NOT NULL,
  "total" DECIMAL(12,2) NOT NULL,
  "notes" TEXT,
  "draft" BOOLEAN NOT NULL DEFAULT false,
  "recurringTemplateId" TEXT,
  "deletedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "purgeAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupplierBill_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillLine" (
  "id" TEXT NOT NULL,
  "billId" TEXT NOT NULL,
  "categoryId" TEXT,
  "categoryNameSnapshot" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "BillLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecurringBillTemplate" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "vendorId" TEXT,
  "vendorNameSnapshot" TEXT NOT NULL,
  "categoryId" TEXT,
  "categoryNameSnapshot" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "frequency" "RecurrenceFrequency" NOT NULL,
  "nextIssueDate" TIMESTAMPTZ(3) NOT NULL,
  "dueAfterDays" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RecurringBillTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerInvoice" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "invoiceNumber" INTEGER NOT NULL,
  "invoicePrefix" TEXT NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "businessSnapshot" JSONB NOT NULL,
  "customerSnapshot" JSONB NOT NULL,
  "serviceSnapshot" JSONB NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "issueDate" TIMESTAMPTZ(3) NOT NULL,
  "dueDate" TIMESTAMPTZ(3),
  "notes" TEXT,
  "voidedAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "purgeAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerInvoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinancialAttachment" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "transactionId" TEXT,
  "billId" TEXT,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "objectKey" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinancialAttachment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FinancialAttachment_owner_check" CHECK (("transactionId" IS NOT NULL)::int + ("billId" IS NOT NULL)::int = 1)
);

CREATE TABLE "ExportJob" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "requestedById" TEXT NOT NULL,
  "fromDate" TIMESTAMPTZ(3) NOT NULL,
  "toDate" TIMESTAMPTZ(3) NOT NULL,
  "status" "ExportJobStatus" NOT NULL DEFAULT 'QUEUED',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "objectKey" TEXT,
  "checksum" TEXT,
  "sizeBytes" INTEGER,
  "fileCount" INTEGER,
  "errorMessage" TEXT,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExportJob_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PaymentMethod" ADD COLUMN "defaultAccountId" TEXT;
ALTER TABLE "AppointmentPayment" ADD COLUMN "transactionId" TEXT;

CREATE UNIQUE INDEX "FinancialAccount_businessId_name_key" ON "FinancialAccount"("businessId", "name");
CREATE INDEX "FinancialAccount_businessId_active_position_idx" ON "FinancialAccount"("businessId", "active", "position");
CREATE INDEX "FinancialAccount_businessId_deletedAt_purgeAt_idx" ON "FinancialAccount"("businessId", "deletedAt", "purgeAt");
CREATE UNIQUE INDEX "FinancialCategory_businessId_type_name_key" ON "FinancialCategory"("businessId", "type", "name");
CREATE INDEX "FinancialCategory_businessId_type_active_position_idx" ON "FinancialCategory"("businessId", "type", "active", "position");
CREATE INDEX "FinancialCategory_businessId_deletedAt_purgeAt_idx" ON "FinancialCategory"("businessId", "deletedAt", "purgeAt");
CREATE UNIQUE INDEX "Vendor_businessId_name_key" ON "Vendor"("businessId", "name");
CREATE INDEX "Vendor_businessId_active_name_idx" ON "Vendor"("businessId", "active", "name");
CREATE INDEX "Vendor_businessId_deletedAt_purgeAt_idx" ON "Vendor"("businessId", "deletedAt", "purgeAt");
CREATE INDEX "FinancialTransaction_businessId_occurredAt_idx" ON "FinancialTransaction"("businessId", "occurredAt");
CREATE INDEX "FinancialTransaction_businessId_type_occurredAt_idx" ON "FinancialTransaction"("businessId", "type", "occurredAt");
CREATE INDEX "FinancialTransaction_businessId_accountId_occurredAt_idx" ON "FinancialTransaction"("businessId", "accountId", "occurredAt");
CREATE INDEX "FinancialTransaction_businessId_categoryId_occurredAt_idx" ON "FinancialTransaction"("businessId", "categoryId", "occurredAt");
CREATE INDEX "FinancialTransaction_businessId_vendorId_idx" ON "FinancialTransaction"("businessId", "vendorId");
CREATE INDEX "FinancialTransaction_businessId_deletedAt_purgeAt_idx" ON "FinancialTransaction"("businessId", "deletedAt", "purgeAt");
CREATE INDEX "SupplierBill_businessId_issueDate_idx" ON "SupplierBill"("businessId", "issueDate");
CREATE INDEX "SupplierBill_businessId_dueDate_idx" ON "SupplierBill"("businessId", "dueDate");
CREATE INDEX "SupplierBill_businessId_vendorId_idx" ON "SupplierBill"("businessId", "vendorId");
CREATE INDEX "SupplierBill_businessId_deletedAt_purgeAt_idx" ON "SupplierBill"("businessId", "deletedAt", "purgeAt");
CREATE INDEX "RecurringBillTemplate_businessId_active_nextIssueDate_idx" ON "RecurringBillTemplate"("businessId", "active", "nextIssueDate");
CREATE UNIQUE INDEX "CustomerInvoice_businessId_invoiceNumber_key" ON "CustomerInvoice"("businessId", "invoiceNumber");
CREATE UNIQUE INDEX "CustomerInvoice_appointmentId_revision_key" ON "CustomerInvoice"("appointmentId", "revision");
CREATE INDEX "CustomerInvoice_businessId_issueDate_idx" ON "CustomerInvoice"("businessId", "issueDate");
CREATE INDEX "CustomerInvoice_businessId_deletedAt_purgeAt_idx" ON "CustomerInvoice"("businessId", "deletedAt", "purgeAt");
CREATE UNIQUE INDEX "FinancialAttachment_objectKey_key" ON "FinancialAttachment"("objectKey");
CREATE INDEX "FinancialAttachment_businessId_transactionId_idx" ON "FinancialAttachment"("businessId", "transactionId");
CREATE INDEX "FinancialAttachment_businessId_billId_idx" ON "FinancialAttachment"("businessId", "billId");
CREATE INDEX "FinancialAttachment_businessId_deletedAt_idx" ON "FinancialAttachment"("businessId", "deletedAt");
CREATE INDEX "ExportJob_businessId_status_createdAt_idx" ON "ExportJob"("businessId", "status", "createdAt");
CREATE INDEX "ExportJob_status_createdAt_idx" ON "ExportJob"("status", "createdAt");
CREATE INDEX "ExportJob_expiresAt_idx" ON "ExportJob"("expiresAt");
CREATE UNIQUE INDEX "AppointmentPayment_transactionId_key" ON "AppointmentPayment"("transactionId");
CREATE INDEX "PaymentMethod_businessId_defaultAccountId_idx" ON "PaymentMethod"("businessId", "defaultAccountId");

ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialCategory" ADD CONSTRAINT "FinancialCategory_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_destinationAccountId_fkey" FOREIGN KEY ("destinationAccountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinancialCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupplierBill" ADD CONSTRAINT "SupplierBill_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplierBill" ADD CONSTRAINT "SupplierBill_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BillLine" ADD CONSTRAINT "BillLine_billId_fkey" FOREIGN KEY ("billId") REFERENCES "SupplierBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillLine" ADD CONSTRAINT "BillLine_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinancialCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RecurringBillTemplate" ADD CONSTRAINT "RecurringBillTemplate_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecurringBillTemplate" ADD CONSTRAINT "RecurringBillTemplate_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RecurringBillTemplate" ADD CONSTRAINT "RecurringBillTemplate_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinancialCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupplierBill" ADD CONSTRAINT "SupplierBill_recurringTemplateId_fkey" FOREIGN KEY ("recurringTemplateId") REFERENCES "RecurringBillTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_billId_fkey" FOREIGN KEY ("billId") REFERENCES "SupplierBill"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomerInvoice" ADD CONSTRAINT "CustomerInvoice_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerInvoice" ADD CONSTRAINT "CustomerInvoice_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialAttachment" ADD CONSTRAINT "FinancialAttachment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialAttachment" ADD CONSTRAINT "FinancialAttachment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "FinancialTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialAttachment" ADD CONSTRAINT "FinancialAttachment_billId_fkey" FOREIGN KEY ("billId") REFERENCES "SupplierBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExportJob" ADD CONSTRAINT "ExportJob_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExportJob" ADD CONSTRAINT "ExportJob_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_defaultAccountId_fkey" FOREIGN KEY ("defaultAccountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AppointmentPayment" ADD CONSTRAINT "AppointmentPayment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "FinancialTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "FinancialAccount" ("id", "businessId", "name", "type", "position", "updatedAt")
SELECT 'fa_' || substr(md5("id" || ':cash'), 1, 24), "id", 'Cash on hand', 'CASH'::"FinancialAccountType", 0, CURRENT_TIMESTAMP FROM "Business"
UNION ALL SELECT 'fa_' || substr(md5("id" || ':bank'), 1, 24), "id", 'Bank', 'BANK'::"FinancialAccountType", 1, CURRENT_TIMESTAMP FROM "Business"
UNION ALL SELECT 'fa_' || substr(md5("id" || ':undeposited'), 1, 24), "id", 'Undeposited funds', 'OTHER'::"FinancialAccountType", 2, CURRENT_TIMESTAMP FROM "Business";

INSERT INTO "FinancialCategory" ("id", "businessId", "name", "type", "position", "updatedAt")
SELECT 'fc_' || substr(md5(b."id" || ':' || seed.name), 1, 24), b."id", seed.name, seed.type::"FinancialCategoryType", seed.position, CURRENT_TIMESTAMP
FROM "Business" b CROSS JOIN (VALUES
  ('Appointment services', 'INCOME', 0), ('Other income', 'INCOME', 1),
  ('Supplies & materials', 'EXPENSE', 0), ('Rent', 'EXPENSE', 1), ('Utilities', 'EXPENSE', 2),
  ('Advertising', 'EXPENSE', 3), ('Insurance', 'EXPENSE', 4), ('Professional fees', 'EXPENSE', 5),
  ('Repairs & maintenance', 'EXPENSE', 6), ('Bank fees', 'EXPENSE', 7), ('Other expense', 'EXPENSE', 8)
) AS seed(name, type, position);

UPDATE "PaymentMethod" pm SET "defaultAccountId" = CASE
  WHEN lower(pm."name") = 'cash' THEN 'fa_' || substr(md5(pm."businessId" || ':cash'), 1, 24)
  WHEN lower(pm."name") LIKE '%legacy%' OR lower(pm."name") LIKE '%unspecified%' OR lower(pm."name") = 'other' THEN 'fa_' || substr(md5(pm."businessId" || ':undeposited'), 1, 24)
  ELSE 'fa_' || substr(md5(pm."businessId" || ':bank'), 1, 24)
END;

INSERT INTO "FinancialTransaction" (
  "id", "businessId", "type", "accountId", "categoryId", "accountNameSnapshot", "categoryNameSnapshot",
  "amount", "currency", "occurredAt", "description", "reference", "createdById", "deletedAt", "archivedAt", "purgeAt", "createdAt", "updatedAt"
)
SELECT
  'ft_' || substr(md5(ap."id"), 1, 24), ap."businessId", 'APPOINTMENT_PAYMENT'::"FinancialTransactionType",
  COALESCE(pm."defaultAccountId", 'fa_' || substr(md5(ap."businessId" || ':undeposited'), 1, 24)),
  'fc_' || substr(md5(ap."businessId" || ':Appointment services'), 1, 24),
  COALESCE(fa."name", 'Undeposited funds'), 'Appointment services', ap."amount", a."currency", ap."paidAt",
  'Appointment payment', ap."id", ap."recordedById",
  CASE WHEN ap."voidedAt" IS NOT NULL THEN ap."voidedAt" ELSE NULL END,
  CASE WHEN ap."voidedAt" IS NOT NULL THEN ap."voidedAt" ELSE NULL END,
  CASE WHEN ap."voidedAt" IS NOT NULL THEN ap."voidedAt" ELSE NULL END,
  ap."createdAt", ap."updatedAt"
FROM "AppointmentPayment" ap
JOIN "Appointment" a ON a."id" = ap."appointmentId"
LEFT JOIN "PaymentMethod" pm ON pm."id" = ap."paymentMethodId"
LEFT JOIN "FinancialAccount" fa ON fa."id" = COALESCE(pm."defaultAccountId", 'fa_' || substr(md5(ap."businessId" || ':undeposited'), 1, 24));

UPDATE "AppointmentPayment" ap SET "transactionId" = 'ft_' || substr(md5(ap."id"), 1, 24);
