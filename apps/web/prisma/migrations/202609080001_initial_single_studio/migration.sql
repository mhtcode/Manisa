-- Manisa single-studio baseline.
--
-- This migration intentionally represents the final schema directly. It
-- replaces the pre-release history that introduced multi-tenancy and later
-- removed it again. Keep the database-only integrity rules below in sync with
-- the Prisma data model and deployment verifier.

-- CreateEnum
CREATE TYPE "AccountRole" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'STAFF');

-- CreateEnum
CREATE TYPE "MediaOwnerType" AS ENUM ('CUSTOMER_AVATAR', 'APPOINTMENT_PHOTO');

-- CreateEnum
CREATE TYPE "FinancialAccountType" AS ENUM ('CASH', 'BANK', 'CARD', 'E_WALLET', 'OTHER');

-- CreateEnum
CREATE TYPE "FinancialCategoryType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "FinancialTransactionType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER', 'OPENING_ADJUSTMENT', 'APPOINTMENT_PAYMENT', 'BILL_PAYMENT');

-- CreateEnum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "ExportJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'READY', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('STAGING', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "MediaVariantKind" AS ENUM ('AVATAR_SMALL', 'AVATAR_LARGE', 'THUMBNAIL', 'MEDIUM', 'LARGE', 'PUBLIC');

-- CreateEnum
CREATE TYPE "MediaJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "GoogleCalendarConnectionStatus" AS ENUM ('CONNECTED', 'PAUSED');

-- CreateEnum
CREATE TYPE "GoogleCalendarSyncOperation" AS ENUM ('UPSERT', 'DELETE');

-- CreateEnum
CREATE TYPE "GoogleCalendarSyncStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('en', 'fa');

-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('DARK', 'LIGHT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'COMPLETED', 'HISTORICAL', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "AppointmentSource" AS ENUM ('ADMIN', 'PUBLIC_BOOKING', 'IMPORT');

-- CreateEnum
CREATE TYPE "NotificationPreference" AS ENUM ('NONE', 'EMAIL', 'SMS', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID', 'PARTIALLY_PAID');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "googleSubject" TEXT,
    "role" "AccountRole" NOT NULL DEFAULT 'STAFF',
    "permissionOverrides" JSONB NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioSettings" (
    "id" TEXT NOT NULL DEFAULT 'studio',
    "name" TEXT NOT NULL DEFAULT 'Manisa',
    "storageQuotaBytes" BIGINT NOT NULL DEFAULT 10737418240,
    "storageUsedBytes" BIGINT NOT NULL DEFAULT 0,
    "storageReservedBytes" BIGINT NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'CAD',
    "timezone" TEXT NOT NULL DEFAULT 'America/Toronto',
    "address" TEXT DEFAULT '77 Finch Avenue East, Toronto, ON',
    "instagramUrl" TEXT,
    "publicPhone" TEXT,
    "publicEmail" TEXT,
    "bookingUrl" TEXT,
    "publicBookingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "publicBookingMessage" TEXT DEFAULT 'Call or message us on WhatsApp to book your appointment.',
    "publicBookingDays" TEXT NOT NULL DEFAULT '1,2,3,4,5,6',
    "publicBookingOpenTime" TEXT NOT NULL DEFAULT '09:00',
    "publicBookingCloseTime" TEXT NOT NULL DEFAULT '18:00',
    "publicBookingSlotMins" INTEGER NOT NULL DEFAULT 30,
    "publicBookingLeadHours" INTEGER NOT NULL DEFAULT 12,
    "publicBookingWindows" JSONB NOT NULL DEFAULT '{}',
    "whatsappNumber" TEXT,
    "studioTagline" TEXT,
    "studioBiography" TEXT,
    "financialRetentionDays" INTEGER NOT NULL DEFAULT 2190,
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV',
    "nextInvoiceNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "AccountRole" NOT NULL DEFAULT 'STAFF',
    "permissionOverrides" JSONB NOT NULL DEFAULT '{}',
    "invitedById" TEXT NOT NULL,
    "acceptedById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorSnapshot" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationReceipt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL DEFAULT 'en',
    "theme" "Theme" NOT NULL DEFAULT 'DARK',
    "mobileNavOrder" TEXT NOT NULL DEFAULT 'report,calendar,gallery,settings',
    "collectionViews" JSONB NOT NULL DEFAULT '{}',
    "collapsedSections" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioReview" (
    "id" TEXT NOT NULL,
    "reviewerName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "opinion" TEXT NOT NULL,
    "language" "Locale" NOT NULL DEFAULT 'en',
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioReview_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "StudioReview_rating_check" CHECK ("rating" BETWEEN 1 AND 5)
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "displayName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "preferredLanguage" "Locale" NOT NULL DEFAULT 'en',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT NOT NULL DEFAULT 'sparkles',
    "accentColor" VARCHAR(7) NOT NULL DEFAULT '#4F8CFF',
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "defaultDurationMinutes" INTEGER NOT NULL,
    "defaultPrice" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'CAD',
    "categoryId" TEXT NOT NULL,
    "supportsColor" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "serviceId" TEXT,
    "serviceNameSnapshot" TEXT NOT NULL,
    "startAt" TIMESTAMPTZ(3) NOT NULL,
    "expectedDurationMinutes" INTEGER NOT NULL,
    "actualDurationMinutes" INTEGER,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "source" "AppointmentSource" NOT NULL DEFAULT 'ADMIN',
    "notificationPreference" "NotificationPreference" NOT NULL DEFAULT 'NONE',
    "notificationConsentAt" TIMESTAMPTZ(3),
    "notificationEmailSnapshot" TEXT,
    "notificationPhoneSnapshot" TEXT,
    "expectedPrice" DECIMAL(12,2) NOT NULL,
    "finalPrice" DECIMAL(12,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'CAD',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "paymentReconciliationRequired" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "completionNotes" TEXT,
    "importSourceId" TEXT,
    "calendarSyncError" TEXT,
    "completedAt" TIMESTAMPTZ(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleCalendarCredential" (
    "id" TEXT NOT NULL DEFAULT 'google-calendar',
    "clientId" TEXT NOT NULL,
    "encryptedClientSecret" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "configuredById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleCalendarCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleCalendarConnection" (
    "id" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL DEFAULT 'google-calendar',
    "connectedById" TEXT NOT NULL,
    "googleAccountEmail" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL DEFAULT 'primary',
    "calendarName" TEXT NOT NULL DEFAULT 'Primary calendar',
    "primary" BOOLEAN NOT NULL DEFAULT false,
    "encryptedRefreshToken" TEXT NOT NULL,
    "grantedScopes" TEXT NOT NULL,
    "status" "GoogleCalendarConnectionStatus" NOT NULL DEFAULT 'CONNECTED',
    "lastSuccessfulSyncAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleCalendarConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleCalendarEvent" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "googleEventId" TEXT NOT NULL,
    "etag" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleCalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleCalendarSyncJob" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "operation" "GoogleCalendarSyncOperation" NOT NULL,
    "googleEventId" TEXT,
    "status" "GoogleCalendarSyncStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleCalendarSyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'wallet',
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "defaultAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentPayment" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "paymentMethodId" TEXT,
    "methodNameSnapshot" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paidAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "recordedById" TEXT,
    "transactionId" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialAccount" (
    "id" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "FinancialCategory" (
    "id" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "FinancialTransaction" (
    "id" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "SupplierBill" (
    "id" TEXT NOT NULL,
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "RecurringBillTemplate" (
    "id" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "CustomerInvoice" (
    "id" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "FinancialAttachment" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT,
    "billId" TEXT,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialAttachment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FinancialAttachment_owner_check" CHECK (
        (("transactionId" IS NOT NULL)::int + ("billId" IS NOT NULL)::int) = 1
    )
);

-- CreateTable
CREATE TABLE "ExportJob" (
    "id" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "AppointmentService" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "serviceId" TEXT,
    "serviceNameSnapshot" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "selectedColor" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentActualService" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "serviceId" TEXT,
    "serviceNameSnapshot" TEXT NOT NULL,
    "actualDurationMinutes" INTEGER NOT NULL,
    "finalPrice" DECIMAL(12,2) NOT NULL,
    "selectedColor" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentActualService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentPhoto" (
    "id" TEXT NOT NULL,
    "ownerType" "MediaOwnerType" NOT NULL DEFAULT 'APPOINTMENT_PHOTO',
    "customerId" TEXT,
    "appointmentId" TEXT,
    "originalName" TEXT NOT NULL,
    "objectKey" TEXT,
    "imagePath" TEXT,
    "thumbnailPath" TEXT,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "status" "MediaStatus" NOT NULL DEFAULT 'READY',
    "errorMessage" TEXT,
    "featuredAt" TIMESTAMP(3),
    "comparisonTag" TEXT NOT NULL DEFAULT 'UNTAGGED',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaVariant" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "kind" "MediaVariantKind" NOT NULL,
    "objectKey" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'webp',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaProcessingJob" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "status" "MediaJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaProcessingJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstagramCredential" (
    "id" TEXT NOT NULL DEFAULT 'instagram',
    "appId" TEXT NOT NULL,
    "encryptedAppSecret" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "configuredById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstagramCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstagramConnection" (
    "id" TEXT NOT NULL,
    "singletonKey" INTEGER NOT NULL DEFAULT 1,
    "credentialId" TEXT NOT NULL DEFAULT 'instagram',
    "connectedById" TEXT,
    "instagramUserId" TEXT NOT NULL,
    "username" TEXT,
    "encryptedAccessToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstagramConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstagramPost" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "remoteMediaId" TEXT NOT NULL,
    "caption" TEXT,
    "mediaType" TEXT NOT NULL,
    "permalink" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "cachedImagePath" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstagramPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleSubject_key" ON "User"("googleSubject");

-- CreateIndex
CREATE INDEX "User_role_active_idx" ON "User"("role", "active");

-- The schema has one studio, so it may have exactly one active owner. Setup
-- creates the first owner and ownership transfer swaps this role atomically.
CREATE UNIQUE INDEX "User_single_active_owner_key"
ON "User" ((1))
WHERE "role" = 'OWNER' AND "active" = TRUE AND "deletedAt" IS NULL;

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");

-- CreateIndex
CREATE INDEX "Invitation_email_expiresAt_idx" ON "Invitation"("email", "expiresAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationReceipt_userId_readAt_idx" ON "NotificationReceipt"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationReceipt_userId_key_key" ON "NotificationReceipt"("userId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_userId_key" ON "Settings"("userId");

-- CreateIndex
CREATE INDEX "StudioReview_status_createdAt_idx" ON "StudioReview"("status", "createdAt");

-- CreateIndex
CREATE INDEX "StudioReview_approvedAt_idx" ON "StudioReview"("approvedAt");

-- CreateIndex
CREATE INDEX "StudioReview_deletedAt_createdAt_idx" ON "StudioReview"("deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "Customer_firstName_lastName_idx" ON "Customer"("firstName", "lastName");

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Customer_active_idx" ON "Customer"("active");

-- CreateIndex
CREATE INDEX "Customer_createdAt_idx" ON "Customer"("createdAt");

-- CreateIndex
CREATE INDEX "Customer_referrerId_idx" ON "Customer"("referrerId");

-- CreateIndex
CREATE INDEX "Customer_deletedAt_idx" ON "Customer"("deletedAt");

-- CreateIndex
CREATE INDEX "StudioCategory_active_position_idx" ON "StudioCategory"("active", "position");

-- CreateIndex
CREATE INDEX "StudioCategory_deletedAt_idx" ON "StudioCategory"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StudioCategory_slug_key" ON "StudioCategory"("slug");

-- CreateIndex
CREATE INDEX "Service_name_idx" ON "Service"("name");

-- CreateIndex
CREATE INDEX "Service_active_idx" ON "Service"("active");

-- CreateIndex
CREATE INDEX "Service_categoryId_active_idx" ON "Service"("categoryId", "active");

-- CreateIndex
CREATE INDEX "Service_deletedAt_idx" ON "Service"("deletedAt");

-- CreateIndex
CREATE INDEX "Appointment_startAt_idx" ON "Appointment"("startAt");

-- CreateIndex
CREATE INDEX "Appointment_customerId_startAt_idx" ON "Appointment"("customerId", "startAt");

-- CreateIndex
CREATE INDEX "Appointment_serviceId_startAt_idx" ON "Appointment"("serviceId", "startAt");

-- CreateIndex
CREATE INDEX "Appointment_status_startAt_idx" ON "Appointment"("status", "startAt");

-- CreateIndex
CREATE INDEX "Appointment_source_startAt_idx" ON "Appointment"("source", "startAt");

-- CreateIndex
CREATE INDEX "Appointment_status_completedAt_idx" ON "Appointment"("status", "completedAt");

-- CreateIndex
CREATE INDEX "Appointment_paymentStatus_idx" ON "Appointment"("paymentStatus");

-- CreateIndex
CREATE INDEX "Appointment_deletedAt_idx" ON "Appointment"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_importSourceId_key" ON "Appointment"("importSourceId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleCalendarConnection_googleAccountEmail_calendarId_key" ON "GoogleCalendarConnection"("googleAccountEmail", "calendarId");

-- CreateIndex
CREATE INDEX "GoogleCalendarConnection_status_updatedAt_idx" ON "GoogleCalendarConnection"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "GoogleCalendarEvent_lastSyncedAt_idx" ON "GoogleCalendarEvent"("lastSyncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleCalendarEvent_connectionId_appointmentId_key" ON "GoogleCalendarEvent"("connectionId", "appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleCalendarEvent_connectionId_googleEventId_key" ON "GoogleCalendarEvent"("connectionId", "googleEventId");

-- CreateIndex
CREATE INDEX "GoogleCalendarSyncJob_status_availableAt_idx" ON "GoogleCalendarSyncJob"("status", "availableAt");

-- CreateIndex
CREATE INDEX "GoogleCalendarSyncJob_connectionId_status_idx" ON "GoogleCalendarSyncJob"("connectionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleCalendarSyncJob_connectionId_appointmentId_key" ON "GoogleCalendarSyncJob"("connectionId", "appointmentId");

-- CreateIndex
CREATE INDEX "PaymentMethod_active_position_idx" ON "PaymentMethod"("active", "position");

-- CreateIndex
CREATE INDEX "PaymentMethod_deletedAt_idx" ON "PaymentMethod"("deletedAt");

-- CreateIndex
CREATE INDEX "PaymentMethod_defaultAccountId_idx" ON "PaymentMethod"("defaultAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_name_key" ON "PaymentMethod"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentPayment_transactionId_key" ON "AppointmentPayment"("transactionId");

-- CreateIndex
CREATE INDEX "AppointmentPayment_appointmentId_voidedAt_idx" ON "AppointmentPayment"("appointmentId", "voidedAt");

-- CreateIndex
CREATE INDEX "AppointmentPayment_paymentMethodId_paidAt_idx" ON "AppointmentPayment"("paymentMethodId", "paidAt");

-- CreateIndex
CREATE INDEX "AppointmentPayment_paidAt_idx" ON "AppointmentPayment"("paidAt");

-- CreateIndex
CREATE INDEX "AppointmentPayment_voidedAt_idx" ON "AppointmentPayment"("voidedAt");

-- CreateIndex
CREATE INDEX "FinancialAccount_active_position_idx" ON "FinancialAccount"("active", "position");

-- CreateIndex
CREATE INDEX "FinancialAccount_deletedAt_purgeAt_idx" ON "FinancialAccount"("deletedAt", "purgeAt");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialAccount_name_key" ON "FinancialAccount"("name");

-- CreateIndex
CREATE INDEX "FinancialCategory_type_active_position_idx" ON "FinancialCategory"("type", "active", "position");

-- CreateIndex
CREATE INDEX "FinancialCategory_deletedAt_purgeAt_idx" ON "FinancialCategory"("deletedAt", "purgeAt");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialCategory_type_name_key" ON "FinancialCategory"("type", "name");

-- CreateIndex
CREATE INDEX "Vendor_active_name_idx" ON "Vendor"("active", "name");

-- CreateIndex
CREATE INDEX "Vendor_deletedAt_purgeAt_idx" ON "Vendor"("deletedAt", "purgeAt");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_name_key" ON "Vendor"("name");

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
CREATE INDEX "SupplierBill_issueDate_idx" ON "SupplierBill"("issueDate");

-- CreateIndex
CREATE INDEX "SupplierBill_dueDate_idx" ON "SupplierBill"("dueDate");

-- CreateIndex
CREATE INDEX "SupplierBill_vendorId_idx" ON "SupplierBill"("vendorId");

-- CreateIndex
CREATE INDEX "SupplierBill_deletedAt_purgeAt_idx" ON "SupplierBill"("deletedAt", "purgeAt");

-- CreateIndex
CREATE INDEX "RecurringBillTemplate_active_nextIssueDate_idx" ON "RecurringBillTemplate"("active", "nextIssueDate");

-- CreateIndex
CREATE INDEX "CustomerInvoice_issueDate_idx" ON "CustomerInvoice"("issueDate");

-- CreateIndex
CREATE INDEX "CustomerInvoice_deletedAt_purgeAt_idx" ON "CustomerInvoice"("deletedAt", "purgeAt");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerInvoice_invoiceNumber_key" ON "CustomerInvoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerInvoice_appointmentId_revision_key" ON "CustomerInvoice"("appointmentId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialAttachment_objectKey_key" ON "FinancialAttachment"("objectKey");

-- CreateIndex
CREATE INDEX "FinancialAttachment_transactionId_idx" ON "FinancialAttachment"("transactionId");

-- CreateIndex
CREATE INDEX "FinancialAttachment_billId_idx" ON "FinancialAttachment"("billId");

-- CreateIndex
CREATE INDEX "FinancialAttachment_deletedAt_idx" ON "FinancialAttachment"("deletedAt");

-- CreateIndex
CREATE INDEX "ExportJob_status_createdAt_idx" ON "ExportJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ExportJob_expiresAt_idx" ON "ExportJob"("expiresAt");

-- CreateIndex
CREATE INDEX "AppointmentService_appointmentId_position_idx" ON "AppointmentService"("appointmentId", "position");

-- CreateIndex
CREATE INDEX "AppointmentService_serviceId_idx" ON "AppointmentService"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentService_appointmentId_serviceId_key" ON "AppointmentService"("appointmentId", "serviceId");

-- CreateIndex
CREATE INDEX "AppointmentActualService_appointmentId_position_idx" ON "AppointmentActualService"("appointmentId", "position");

-- CreateIndex
CREATE INDEX "AppointmentActualService_serviceId_idx" ON "AppointmentActualService"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentActualService_appointmentId_serviceId_key" ON "AppointmentActualService"("appointmentId", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentPhoto_objectKey_key" ON "AppointmentPhoto"("objectKey");

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentPhoto_imagePath_key" ON "AppointmentPhoto"("imagePath");

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentPhoto_thumbnailPath_key" ON "AppointmentPhoto"("thumbnailPath");

-- CreateIndex
CREATE INDEX "AppointmentPhoto_appointmentId_createdAt_idx" ON "AppointmentPhoto"("appointmentId", "createdAt");

-- CreateIndex
CREATE INDEX "AppointmentPhoto_customerId_idx" ON "AppointmentPhoto"("customerId");

-- CreateIndex
CREATE INDEX "AppointmentPhoto_featuredAt_idx" ON "AppointmentPhoto"("featuredAt");

-- CreateIndex
CREATE INDEX "AppointmentPhoto_status_createdAt_idx" ON "AppointmentPhoto"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AppointmentPhoto_deletedAt_idx" ON "AppointmentPhoto"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MediaVariant_objectKey_key" ON "MediaVariant"("objectKey");

-- CreateIndex
CREATE INDEX "MediaVariant_assetId_idx" ON "MediaVariant"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaVariant_assetId_kind_key" ON "MediaVariant"("assetId", "kind");

-- CreateIndex
CREATE INDEX "MediaProcessingJob_status_availableAt_idx" ON "MediaProcessingJob"("status", "availableAt");

-- CreateIndex
CREATE UNIQUE INDEX "InstagramConnection_singletonKey_key" ON "InstagramConnection"("singletonKey");

-- CreateIndex
CREATE UNIQUE INDEX "InstagramPost_cachedImagePath_key" ON "InstagramPost"("cachedImagePath");

-- CreateIndex
CREATE INDEX "InstagramPost_active_publishedAt_idx" ON "InstagramPost"("active", "publishedAt");

-- CreateIndex
CREATE INDEX "InstagramPost_connectionId_publishedAt_idx" ON "InstagramPost"("connectionId", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "InstagramPost_remoteMediaId_key" ON "InstagramPost"("remoteMediaId");

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationReceipt" ADD CONSTRAINT "NotificationReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioReview" ADD CONSTRAINT "StudioReview_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleCalendarCredential" ADD CONSTRAINT "GoogleCalendarCredential_configuredById_fkey" FOREIGN KEY ("configuredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "StudioCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleCalendarConnection" ADD CONSTRAINT "GoogleCalendarConnection_connectedById_fkey" FOREIGN KEY ("connectedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleCalendarConnection" ADD CONSTRAINT "GoogleCalendarConnection_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "GoogleCalendarCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleCalendarEvent" ADD CONSTRAINT "GoogleCalendarEvent_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "GoogleCalendarConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleCalendarSyncJob" ADD CONSTRAINT "GoogleCalendarSyncJob_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "GoogleCalendarConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_defaultAccountId_fkey" FOREIGN KEY ("defaultAccountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentPayment" ADD CONSTRAINT "AppointmentPayment_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentPayment" ADD CONSTRAINT "AppointmentPayment_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentPayment" ADD CONSTRAINT "AppointmentPayment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentPayment" ADD CONSTRAINT "AppointmentPayment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "FinancialTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_destinationAccountId_fkey" FOREIGN KEY ("destinationAccountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinancialCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_billId_fkey" FOREIGN KEY ("billId") REFERENCES "SupplierBill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierBill" ADD CONSTRAINT "SupplierBill_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierBill" ADD CONSTRAINT "SupplierBill_recurringTemplateId_fkey" FOREIGN KEY ("recurringTemplateId") REFERENCES "RecurringBillTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillLine" ADD CONSTRAINT "BillLine_billId_fkey" FOREIGN KEY ("billId") REFERENCES "SupplierBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillLine" ADD CONSTRAINT "BillLine_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinancialCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringBillTemplate" ADD CONSTRAINT "RecurringBillTemplate_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringBillTemplate" ADD CONSTRAINT "RecurringBillTemplate_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinancialCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerInvoice" ADD CONSTRAINT "CustomerInvoice_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAttachment" ADD CONSTRAINT "FinancialAttachment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "FinancialTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAttachment" ADD CONSTRAINT "FinancialAttachment_billId_fkey" FOREIGN KEY ("billId") REFERENCES "SupplierBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportJob" ADD CONSTRAINT "ExportJob_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentService" ADD CONSTRAINT "AppointmentService_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentService" ADD CONSTRAINT "AppointmentService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentActualService" ADD CONSTRAINT "AppointmentActualService_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentActualService" ADD CONSTRAINT "AppointmentActualService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentPhoto" ADD CONSTRAINT "AppointmentPhoto_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentPhoto" ADD CONSTRAINT "AppointmentPhoto_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaVariant" ADD CONSTRAINT "MediaVariant_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "AppointmentPhoto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaProcessingJob" ADD CONSTRAINT "MediaProcessingJob_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "AppointmentPhoto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramCredential" ADD CONSTRAINT "InstagramCredential_configuredById_fkey" FOREIGN KEY ("configuredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramConnection" ADD CONSTRAINT "InstagramConnection_connectedById_fkey" FOREIGN KEY ("connectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramConnection" ADD CONSTRAINT "InstagramConnection_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "InstagramCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramPost" ADD CONSTRAINT "InstagramPost_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "InstagramConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
