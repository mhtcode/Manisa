-- Manisa is now a single-studio application. Refuse to merge independent
-- tenants silently; an installation with more than one business must first be
-- consolidated explicitly so no records can cross business boundaries.
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "Business") > 1 THEN
    RAISE EXCEPTION 'Single-studio migration requires at most one Business row';
  END IF;
END $$;

-- Preserve the one existing studio and its access/preferences before the
-- generated structural migration removes the multi-tenant tables.
CREATE TEMP TABLE "_single_studio_config" AS
SELECT
  b."id" AS "legacyBusinessId",
  b."name",
  b."storageQuotaBytes",
  b."storageUsedBytes",
  b."storageReservedBytes",
  COALESCE(bs."currency", 'CAD') AS "currency",
  COALESCE(bs."timezone", 'America/Toronto') AS "timezone",
  bs."address", bs."instagramUrl", bs."publicPhone", bs."publicEmail",
  bs."bookingUrl", bs."studioTagline", bs."studioBiography",
  COALESCE(bs."financialRetentionDays", 2190) AS "financialRetentionDays",
  COALESCE(bs."invoicePrefix", 'INV') AS "invoicePrefix",
  COALESCE(bs."nextInvoiceNumber", 1) AS "nextInvoiceNumber",
  COALESCE(bs."createdAt", b."createdAt") AS "createdAt",
  GREATEST(COALESCE(bs."updatedAt", b."updatedAt"), b."updatedAt") AS "updatedAt",
  b."primaryOwnerId"
FROM "Business" b
LEFT JOIN "BusinessSettings" bs ON bs."businessId" = b."id"
ORDER BY b."createdAt"
LIMIT 1;

CREATE TEMP TABLE "_single_user_access" AS
SELECT
  u."id" AS "userId",
  CASE
    WHEN u."id" = sc."primaryOwnerId" THEN 'OWNER'
    WHEN bm."role"::text = 'OWNER' THEN 'ADMIN'
    WHEN bm."role" IS NOT NULL THEN bm."role"::text
    WHEN pa."role"::text = 'ROOT_OWNER' THEN 'ADMIN'
    WHEN pa."role"::text = 'PLATFORM_ADMIN' THEN 'ADMIN'
    ELSE 'STAFF'
  END AS "accessRole",
  COALESCE(bm."permissionOverrides", pa."permissionOverrides", '{}'::jsonb) AS "permissionOverrides"
FROM "User" u
LEFT JOIN "_single_studio_config" sc ON TRUE
LEFT JOIN "BusinessMembership" bm
  ON bm."userId" = u."id" AND bm."businessId" = sc."legacyBusinessId"
LEFT JOIN "PlatformAccess" pa ON pa."userId" = u."id";

CREATE TEMP TABLE "_single_preferences" AS
SELECT bm."userId", mp."mobileNavOrder", mp."collectionViews", mp."collapsedSections"
FROM "BusinessMembership" bm
JOIN "_single_studio_config" sc ON sc."legacyBusinessId" = bm."businessId"
JOIN "MembershipPreference" mp ON mp."membershipId" = bm."id";

CREATE TEMP TABLE "_single_invitation_roles" AS
SELECT
  i."id" AS "invitationId",
  CASE
    WHEN i."businessRole"::text = 'OWNER' THEN 'ADMIN'
    WHEN i."businessRole" IS NOT NULL THEN i."businessRole"::text
    ELSE 'ADMIN'
  END AS "accessRole"
FROM "Invitation" i;

-- CreateEnum
CREATE TYPE "AccountRole" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'STAFF');

-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_businessId_fkey";

-- DropForeignKey
ALTER TABLE "AppointmentActualService" DROP CONSTRAINT "AppointmentActualService_businessId_fkey";

-- DropForeignKey
ALTER TABLE "AppointmentPayment" DROP CONSTRAINT "AppointmentPayment_businessId_fkey";

-- DropForeignKey
ALTER TABLE "AppointmentPhoto" DROP CONSTRAINT "AppointmentPhoto_businessId_fkey";

-- DropForeignKey
ALTER TABLE "AppointmentService" DROP CONSTRAINT "AppointmentService_businessId_fkey";

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_businessId_fkey";

-- DropForeignKey
ALTER TABLE "Business" DROP CONSTRAINT "Business_primaryOwnerId_fkey";

-- DropForeignKey
ALTER TABLE "BusinessMembership" DROP CONSTRAINT "BusinessMembership_businessId_fkey";

-- DropForeignKey
ALTER TABLE "BusinessMembership" DROP CONSTRAINT "BusinessMembership_userId_fkey";

-- DropForeignKey
ALTER TABLE "BusinessSettings" DROP CONSTRAINT "BusinessSettings_businessId_fkey";

-- DropForeignKey
ALTER TABLE "Customer" DROP CONSTRAINT "Customer_businessId_fkey";

-- DropForeignKey
ALTER TABLE "CustomerInvoice" DROP CONSTRAINT "CustomerInvoice_businessId_fkey";

-- DropForeignKey
ALTER TABLE "ExportJob" DROP CONSTRAINT "ExportJob_businessId_fkey";

-- DropForeignKey
ALTER TABLE "FinancialAccount" DROP CONSTRAINT "FinancialAccount_businessId_fkey";

-- DropForeignKey
ALTER TABLE "FinancialAttachment" DROP CONSTRAINT "FinancialAttachment_businessId_fkey";

-- DropForeignKey
ALTER TABLE "FinancialCategory" DROP CONSTRAINT "FinancialCategory_businessId_fkey";

-- DropForeignKey
ALTER TABLE "FinancialTransaction" DROP CONSTRAINT "FinancialTransaction_businessId_fkey";

-- DropForeignKey
ALTER TABLE "GoogleCalendarConnection" DROP CONSTRAINT "GoogleCalendarConnection_businessId_fkey";

-- DropForeignKey
ALTER TABLE "GoogleCalendarEvent" DROP CONSTRAINT "GoogleCalendarEvent_businessId_fkey";

-- DropForeignKey
ALTER TABLE "GoogleCalendarSyncJob" DROP CONSTRAINT "GoogleCalendarSyncJob_businessId_fkey";

-- DropForeignKey
ALTER TABLE "InstagramConnection" DROP CONSTRAINT "InstagramConnection_businessId_fkey";

-- DropForeignKey
ALTER TABLE "InstagramPost" DROP CONSTRAINT "InstagramPost_businessId_fkey";

-- DropForeignKey
ALTER TABLE "Invitation" DROP CONSTRAINT "Invitation_businessId_fkey";

-- DropForeignKey
ALTER TABLE "MembershipPreference" DROP CONSTRAINT "MembershipPreference_membershipId_fkey";

-- DropForeignKey
ALTER TABLE "NotificationReceipt" DROP CONSTRAINT "NotificationReceipt_businessId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentMethod" DROP CONSTRAINT "PaymentMethod_businessId_fkey";

-- DropForeignKey
ALTER TABLE "PlatformAccess" DROP CONSTRAINT "PlatformAccess_userId_fkey";

-- DropForeignKey
ALTER TABLE "RecurringBillTemplate" DROP CONSTRAINT "RecurringBillTemplate_businessId_fkey";

-- DropForeignKey
ALTER TABLE "Service" DROP CONSTRAINT "Service_businessId_fkey";

-- DropForeignKey
ALTER TABLE "StudioCategory" DROP CONSTRAINT "StudioCategory_businessId_fkey";

-- DropForeignKey
ALTER TABLE "SupplierBill" DROP CONSTRAINT "SupplierBill_businessId_fkey";

-- DropForeignKey
ALTER TABLE "Vendor" DROP CONSTRAINT "Vendor_businessId_fkey";

-- DropIndex
DROP INDEX "Appointment_businessId_customerId_startAt_idx";

-- DropIndex
DROP INDEX "Appointment_businessId_deletedAt_idx";

-- DropIndex
DROP INDEX "Appointment_businessId_importSourceId_key";

-- DropIndex
DROP INDEX "Appointment_businessId_status_startAt_idx";

-- DropIndex
DROP INDEX "AppointmentPayment_businessId_paidAt_idx";

-- DropIndex
DROP INDEX "AppointmentPhoto_businessId_appointmentId_createdAt_idx";

-- DropIndex
DROP INDEX "AppointmentPhoto_businessId_deletedAt_idx";

-- DropIndex
DROP INDEX "AppointmentPhoto_createdAt_idx";

-- DropIndex
DROP INDEX "AuditLog_businessId_createdAt_idx";

-- DropIndex
DROP INDEX "Customer_businessId_deletedAt_idx";

-- DropIndex
DROP INDEX "Customer_businessId_firstName_lastName_idx";

-- DropIndex
DROP INDEX "CustomerInvoice_businessId_deletedAt_purgeAt_idx";

-- DropIndex
DROP INDEX "CustomerInvoice_businessId_invoiceNumber_key";

-- DropIndex
DROP INDEX "CustomerInvoice_businessId_issueDate_idx";

-- DropIndex
DROP INDEX "ExportJob_businessId_status_createdAt_idx";

-- DropIndex
DROP INDEX "FinancialAccount_businessId_active_position_idx";

-- DropIndex
DROP INDEX "FinancialAccount_businessId_deletedAt_purgeAt_idx";

-- DropIndex
DROP INDEX "FinancialAccount_businessId_name_key";

-- DropIndex
DROP INDEX "FinancialAttachment_businessId_billId_idx";

-- DropIndex
DROP INDEX "FinancialAttachment_businessId_deletedAt_idx";

-- DropIndex
DROP INDEX "FinancialAttachment_businessId_transactionId_idx";

-- DropIndex
DROP INDEX "FinancialCategory_businessId_deletedAt_purgeAt_idx";

-- DropIndex
DROP INDEX "FinancialCategory_businessId_type_active_position_idx";

-- DropIndex
DROP INDEX "FinancialCategory_businessId_type_name_key";

-- DropIndex
DROP INDEX "FinancialTransaction_businessId_accountId_occurredAt_idx";

-- DropIndex
DROP INDEX "FinancialTransaction_businessId_categoryId_occurredAt_idx";

-- DropIndex
DROP INDEX "FinancialTransaction_businessId_deletedAt_purgeAt_idx";

-- DropIndex
DROP INDEX "FinancialTransaction_businessId_occurredAt_idx";

-- DropIndex
DROP INDEX "FinancialTransaction_businessId_type_occurredAt_idx";

-- DropIndex
DROP INDEX "FinancialTransaction_businessId_vendorId_idx";

-- DropIndex
DROP INDEX "GoogleCalendarConnection_businessId_key";

-- DropIndex
DROP INDEX "GoogleCalendarEvent_businessId_appointmentId_key";

-- DropIndex
DROP INDEX "GoogleCalendarEvent_businessId_lastSyncedAt_idx";

-- DropIndex
DROP INDEX "GoogleCalendarSyncJob_businessId_appointmentId_key";

-- DropIndex
DROP INDEX "InstagramConnection_businessId_key";

-- DropIndex
DROP INDEX "InstagramPost_businessId_remoteMediaId_key";

-- DropIndex
DROP INDEX "NotificationReceipt_userId_businessId_key_key";

-- DropIndex
DROP INDEX "PaymentMethod_businessId_defaultAccountId_idx";

-- DropIndex
DROP INDEX "PaymentMethod_businessId_name_key";

-- DropIndex
DROP INDEX "RecurringBillTemplate_businessId_active_nextIssueDate_idx";

-- DropIndex
DROP INDEX "Service_businessId_categoryId_active_idx";

-- DropIndex
DROP INDEX "StudioCategory_businessId_active_position_idx";

-- DropIndex
DROP INDEX "StudioCategory_businessId_slug_key";

-- DropIndex
DROP INDEX "SupplierBill_businessId_deletedAt_purgeAt_idx";

-- DropIndex
DROP INDEX "SupplierBill_businessId_dueDate_idx";

-- DropIndex
DROP INDEX "SupplierBill_businessId_issueDate_idx";

-- DropIndex
DROP INDEX "SupplierBill_businessId_vendorId_idx";

-- DropIndex
DROP INDEX "Vendor_businessId_active_name_idx";

-- DropIndex
DROP INDEX "Vendor_businessId_deletedAt_purgeAt_idx";

-- DropIndex
DROP INDEX "Vendor_businessId_name_key";

-- AlterTable
ALTER TABLE "Appointment" DROP COLUMN "businessId";

-- AlterTable
ALTER TABLE "AppointmentActualService" DROP COLUMN "businessId";

-- AlterTable
ALTER TABLE "AppointmentPayment" DROP COLUMN "businessId",
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "AppointmentPhoto" DROP COLUMN "businessId";

-- AlterTable
ALTER TABLE "AppointmentService" DROP COLUMN "businessId";

-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "businessId",
DROP COLUMN "elevated";

-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "businessId";

-- AlterTable
ALTER TABLE "CustomerInvoice" DROP COLUMN "businessId";

-- AlterTable
ALTER TABLE "ExportJob" DROP COLUMN "businessId";

-- AlterTable
ALTER TABLE "FinancialAccount" DROP COLUMN "businessId";

-- AlterTable
ALTER TABLE "FinancialAttachment" DROP COLUMN "businessId";

-- AlterTable
ALTER TABLE "FinancialCategory" DROP COLUMN "businessId";

-- AlterTable
ALTER TABLE "FinancialTransaction" DROP COLUMN "businessId";

-- AlterTable
ALTER TABLE "GoogleCalendarConnection" DROP COLUMN "businessId",
ADD COLUMN     "singletonKey" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "GoogleCalendarEvent" DROP COLUMN "businessId";

-- AlterTable
ALTER TABLE "GoogleCalendarSyncJob" DROP COLUMN "businessId";

-- AlterTable
ALTER TABLE "InstagramConnection" DROP COLUMN "businessId",
ADD COLUMN     "singletonKey" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "InstagramPost" DROP COLUMN "businessId";

-- AlterTable
ALTER TABLE "Invitation" DROP COLUMN "businessId",
DROP COLUMN "businessRole",
DROP COLUMN "kind",
DROP COLUMN "platformRole",
ADD COLUMN     "role" "AccountRole" NOT NULL DEFAULT 'STAFF';

-- AlterTable
ALTER TABLE "NotificationReceipt" DROP COLUMN "businessId";

-- AlterTable
ALTER TABLE "PaymentMethod" DROP COLUMN "businessId",
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "RecurringBillTemplate" DROP COLUMN "businessId";

-- AlterTable
ALTER TABLE "Service" DROP COLUMN "businessId";

-- AlterTable
ALTER TABLE "Settings" DROP COLUMN "businessName",
DROP COLUMN "currency",
DROP COLUMN "timezone";

-- AlterTable
ALTER TABLE "StudioCategory" DROP COLUMN "businessId";

-- AlterTable
ALTER TABLE "SupplierBill" DROP COLUMN "businessId";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "permissionOverrides" JSONB NOT NULL DEFAULT '{}',
DROP COLUMN "role",
ADD COLUMN     "role" "AccountRole" NOT NULL DEFAULT 'STAFF';

-- AlterTable
ALTER TABLE "Vendor" DROP COLUMN "businessId";

-- DropTable
DROP TABLE "Business";

-- DropTable
DROP TABLE "BusinessMembership";

-- DropTable
DROP TABLE "BusinessSettings";

-- DropTable
DROP TABLE "MembershipPreference";

-- DropTable
DROP TABLE "PlatformAccess";

-- DropEnum
DROP TYPE "BusinessRole";

-- DropEnum
DROP TYPE "BusinessTemplate";

-- DropEnum
DROP TYPE "InvitationKind";

-- DropEnum
DROP TYPE "PlatformRole";

-- DropEnum
DROP TYPE "Role";

-- CreateTable
CREATE TABLE "StudioSettings" (
    "id" TEXT NOT NULL DEFAULT 'studio',
    "name" TEXT NOT NULL DEFAULT 'Manisa',
    "storageQuotaBytes" BIGINT NOT NULL DEFAULT 10737418240,
    "storageUsedBytes" BIGINT NOT NULL DEFAULT 0,
    "storageReservedBytes" BIGINT NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'CAD',
    "timezone" TEXT NOT NULL DEFAULT 'America/Toronto',
    "address" TEXT,
    "instagramUrl" TEXT,
    "publicPhone" TEXT,
    "publicEmail" TEXT,
    "bookingUrl" TEXT,
    "studioTagline" TEXT,
    "studioBiography" TEXT,
    "financialRetentionDays" INTEGER NOT NULL DEFAULT 2190,
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV',
    "nextInvoiceNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_importSourceId_key" ON "Appointment"("importSourceId");

-- CreateIndex
CREATE INDEX "AppointmentPhoto_customerId_idx" ON "AppointmentPhoto"("customerId");

-- CreateIndex
CREATE INDEX "AppointmentPhoto_status_createdAt_idx" ON "AppointmentPhoto"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "CustomerInvoice_issueDate_idx" ON "CustomerInvoice"("issueDate");

-- CreateIndex
CREATE INDEX "CustomerInvoice_deletedAt_purgeAt_idx" ON "CustomerInvoice"("deletedAt", "purgeAt");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerInvoice_invoiceNumber_key" ON "CustomerInvoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "FinancialAccount_active_position_idx" ON "FinancialAccount"("active", "position");

-- CreateIndex
CREATE INDEX "FinancialAccount_deletedAt_purgeAt_idx" ON "FinancialAccount"("deletedAt", "purgeAt");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialAccount_name_key" ON "FinancialAccount"("name");

-- CreateIndex
CREATE INDEX "FinancialAttachment_transactionId_idx" ON "FinancialAttachment"("transactionId");

-- CreateIndex
CREATE INDEX "FinancialAttachment_billId_idx" ON "FinancialAttachment"("billId");

-- CreateIndex
CREATE INDEX "FinancialAttachment_deletedAt_idx" ON "FinancialAttachment"("deletedAt");

-- CreateIndex
CREATE INDEX "FinancialCategory_type_active_position_idx" ON "FinancialCategory"("type", "active", "position");

-- CreateIndex
CREATE INDEX "FinancialCategory_deletedAt_purgeAt_idx" ON "FinancialCategory"("deletedAt", "purgeAt");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialCategory_type_name_key" ON "FinancialCategory"("type", "name");

-- CreateIndex
CREATE INDEX "FinancialTransaction_occurredAt_idx" ON "FinancialTransaction"("occurredAt");

-- CreateIndex
CREATE INDEX "FinancialTransaction_type_occurredAt_idx" ON "FinancialTransaction"("type", "occurredAt");

-- CreateIndex
CREATE INDEX "FinancialTransaction_accountId_occurredAt_idx" ON "FinancialTransaction"("accountId", "occurredAt");

-- CreateIndex
CREATE INDEX "FinancialTransaction_categoryId_occurredAt_idx" ON "FinancialTransaction"("categoryId", "occurredAt");

-- CreateIndex
CREATE INDEX "FinancialTransaction_vendorId_idx" ON "FinancialTransaction"("vendorId");

-- CreateIndex
CREATE INDEX "FinancialTransaction_deletedAt_purgeAt_idx" ON "FinancialTransaction"("deletedAt", "purgeAt");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleCalendarConnection_singletonKey_key" ON "GoogleCalendarConnection"("singletonKey");

-- CreateIndex
CREATE INDEX "GoogleCalendarEvent_lastSyncedAt_idx" ON "GoogleCalendarEvent"("lastSyncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleCalendarEvent_appointmentId_key" ON "GoogleCalendarEvent"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleCalendarSyncJob_appointmentId_key" ON "GoogleCalendarSyncJob"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "InstagramConnection_singletonKey_key" ON "InstagramConnection"("singletonKey");

-- CreateIndex
CREATE UNIQUE INDEX "InstagramPost_remoteMediaId_key" ON "InstagramPost"("remoteMediaId");

-- CreateIndex
CREATE INDEX "MediaVariant_assetId_idx" ON "MediaVariant"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationReceipt_userId_key_key" ON "NotificationReceipt"("userId", "key");

-- CreateIndex
CREATE INDEX "PaymentMethod_defaultAccountId_idx" ON "PaymentMethod"("defaultAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_name_key" ON "PaymentMethod"("name");

-- CreateIndex
CREATE INDEX "RecurringBillTemplate_active_nextIssueDate_idx" ON "RecurringBillTemplate"("active", "nextIssueDate");

-- CreateIndex
CREATE UNIQUE INDEX "StudioCategory_slug_key" ON "StudioCategory"("slug");

-- CreateIndex
CREATE INDEX "SupplierBill_issueDate_idx" ON "SupplierBill"("issueDate");

-- CreateIndex
CREATE INDEX "SupplierBill_dueDate_idx" ON "SupplierBill"("dueDate");

-- CreateIndex
CREATE INDEX "SupplierBill_vendorId_idx" ON "SupplierBill"("vendorId");

-- CreateIndex
CREATE INDEX "SupplierBill_deletedAt_purgeAt_idx" ON "SupplierBill"("deletedAt", "purgeAt");

-- CreateIndex
CREATE INDEX "User_role_active_idx" ON "User"("role", "active");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE INDEX "Vendor_active_name_idx" ON "Vendor"("active", "name");

-- CreateIndex
CREATE INDEX "Vendor_deletedAt_purgeAt_idx" ON "Vendor"("deletedAt", "purgeAt");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_name_key" ON "Vendor"("name");

-- Restore the preserved singleton configuration and access policy.
INSERT INTO "StudioSettings" (
  "id", "name", "storageQuotaBytes", "storageUsedBytes", "storageReservedBytes",
  "currency", "timezone", "address", "instagramUrl", "publicPhone", "publicEmail",
  "bookingUrl", "studioTagline", "studioBiography", "financialRetentionDays",
  "invoicePrefix", "nextInvoiceNumber", "createdAt", "updatedAt"
)
SELECT
  'studio', "name", "storageQuotaBytes", "storageUsedBytes", "storageReservedBytes",
  "currency", "timezone", "address", "instagramUrl", "publicPhone", "publicEmail",
  "bookingUrl", "studioTagline", "studioBiography", "financialRetentionDays",
  "invoicePrefix", "nextInvoiceNumber", "createdAt", "updatedAt"
FROM "_single_studio_config";

INSERT INTO "StudioSettings" ("id", "updatedAt")
SELECT 'studio', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "StudioSettings");

UPDATE "User" u
SET
  "role" = a."accessRole"::"AccountRole",
  "permissionOverrides" = a."permissionOverrides"
FROM "_single_user_access" a
WHERE a."userId" = u."id";

-- A fresh/legacy installation without a Business row still needs one owner.
UPDATE "User"
SET "role" = 'OWNER'
WHERE "id" = (
  SELECT "id" FROM "User"
  WHERE "active" = TRUE AND "deletedAt" IS NULL
  ORDER BY "createdAt" LIMIT 1
)
AND NOT EXISTS (SELECT 1 FROM "User" WHERE "role" = 'OWNER');

UPDATE "Settings" s
SET
  "mobileNavOrder" = p."mobileNavOrder",
  "collectionViews" = p."collectionViews",
  "collapsedSections" = p."collapsedSections"
FROM "_single_preferences" p
WHERE p."userId" = s."userId";

UPDATE "Invitation" i
SET "role" = r."accessRole"::"AccountRole"
FROM "_single_invitation_roles" r
WHERE r."invitationId" = i."id";

-- PostgreSQL partial uniqueness enforces the single active owner invariant.
CREATE UNIQUE INDEX "User_single_active_owner_key"
ON "User" ((1))
WHERE "role" = 'OWNER' AND "active" = TRUE AND "deletedAt" IS NULL;
