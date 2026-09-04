CREATE TYPE "PlatformRole" AS ENUM ('ROOT_OWNER', 'PLATFORM_ADMIN');
CREATE TYPE "BusinessRole" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'STAFF');
CREATE TYPE "BusinessTemplate" AS ENUM ('BLANK', 'NAIL_HAIR');
CREATE TYPE "InvitationKind" AS ENUM ('PLATFORM', 'BUSINESS');
CREATE TYPE "MediaOwnerType" AS ENUM ('CUSTOMER_AVATAR', 'APPOINTMENT_PHOTO');
CREATE TYPE "MediaStatus" AS ENUM ('STAGING', 'PROCESSING', 'READY', 'FAILED');
CREATE TYPE "MediaVariantKind" AS ENUM ('AVATAR_SMALL', 'AVATAR_LARGE', 'THUMBNAIL', 'MEDIUM', 'LARGE', 'PUBLIC');
CREATE TYPE "MediaJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE "PlatformAccess" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL UNIQUE, "role" "PlatformRole" NOT NULL,
  "permissionOverrides" JSONB NOT NULL DEFAULT '{}', "active" BOOLEAN NOT NULL DEFAULT true,
  "deletedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "Business" (
  "id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "slug" TEXT NOT NULL UNIQUE,
  "template" "BusinessTemplate" NOT NULL DEFAULT 'BLANK', "active" BOOLEAN NOT NULL DEFAULT true,
  "primaryOwnerId" TEXT NOT NULL, "storageQuotaBytes" BIGINT NOT NULL DEFAULT 10737418240,
  "storageUsedBytes" BIGINT NOT NULL DEFAULT 0, "storageReservedBytes" BIGINT NOT NULL DEFAULT 0,
  "deletedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "BusinessSettings" (
  "id" TEXT PRIMARY KEY, "businessId" TEXT NOT NULL UNIQUE, "currency" VARCHAR(3) NOT NULL DEFAULT 'CAD',
  "timezone" TEXT NOT NULL DEFAULT 'America/Toronto', "address" TEXT, "instagramUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "BusinessMembership" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "businessId" TEXT NOT NULL, "role" "BusinessRole" NOT NULL,
  "permissionOverrides" JSONB NOT NULL DEFAULT '{}', "active" BOOLEAN NOT NULL DEFAULT true,
  "deletedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, UNIQUE("userId", "businessId")
);
CREATE TABLE "MembershipPreference" (
  "id" TEXT PRIMARY KEY, "membershipId" TEXT NOT NULL UNIQUE,
  "mobileNavOrder" TEXT NOT NULL DEFAULT 'report,calendar,gallery,settings',
  "collectionViews" JSONB NOT NULL DEFAULT '{}', "collapsedSections" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "Invitation" (
  "id" TEXT PRIMARY KEY, "tokenHash" TEXT NOT NULL UNIQUE, "email" TEXT NOT NULL, "kind" "InvitationKind" NOT NULL,
  "platformRole" "PlatformRole", "businessId" TEXT, "businessRole" "BusinessRole",
  "permissionOverrides" JSONB NOT NULL DEFAULT '{}', "invitedById" TEXT NOT NULL, "acceptedById" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL, "acceptedAt" TIMESTAMP(3), "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "AuditLog" (
  "id" TEXT PRIMARY KEY, "actorId" TEXT, "actorSnapshot" TEXT NOT NULL, "businessId" TEXT,
  "elevated" BOOLEAN NOT NULL DEFAULT false, "action" TEXT NOT NULL, "targetType" TEXT NOT NULL,
  "targetId" TEXT, "before" JSONB, "after" JSONB, "ipAddress" TEXT, "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "Customer" ADD COLUMN "businessId" TEXT;
ALTER TABLE "StudioCategory" ADD COLUMN "businessId" TEXT;
ALTER TABLE "Service" ADD COLUMN "businessId" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "businessId" TEXT;
ALTER TABLE "PaymentMethod" ADD COLUMN "businessId" TEXT;
ALTER TABLE "AppointmentPayment" ADD COLUMN "businessId" TEXT;
ALTER TABLE "AppointmentService" ADD COLUMN "businessId" TEXT;
ALTER TABLE "AppointmentActualService" ADD COLUMN "businessId" TEXT;
ALTER TABLE "NotificationReceipt" ADD COLUMN "businessId" TEXT;
ALTER TABLE "AppointmentPhoto" ADD COLUMN "businessId" TEXT;
ALTER TABLE "AppointmentPhoto" ADD COLUMN "customerId" TEXT;
ALTER TABLE "AppointmentPhoto" ADD COLUMN "objectKey" TEXT;
ALTER TABLE "AppointmentPhoto" ADD COLUMN "ownerType" "MediaOwnerType" NOT NULL DEFAULT 'APPOINTMENT_PHOTO';
ALTER TABLE "AppointmentPhoto" ADD COLUMN "status" "MediaStatus" NOT NULL DEFAULT 'READY';
ALTER TABLE "AppointmentPhoto" ADD COLUMN "errorMessage" TEXT;
ALTER TABLE "AppointmentPhoto" ALTER COLUMN "appointmentId" DROP NOT NULL;
ALTER TABLE "AppointmentPhoto" ALTER COLUMN "imagePath" DROP NOT NULL;
ALTER TABLE "AppointmentPhoto" ALTER COLUMN "thumbnailPath" DROP NOT NULL;
ALTER TABLE "InstagramConnection" ADD COLUMN "businessId" TEXT;
ALTER TABLE "InstagramConnection" ADD COLUMN "connectedById" TEXT;
ALTER TABLE "InstagramPost" ADD COLUMN "businessId" TEXT;

DO $$
DECLARE owner_id TEXT;
DECLARE legacy_business_id TEXT := 'legacy_manisa_business';
DECLARE membership_id TEXT := 'legacy_manisa_membership';
BEGIN
  SELECT "id" INTO owner_id FROM "User" ORDER BY "createdAt" ASC LIMIT 1;
  IF owner_id IS NOT NULL THEN
    INSERT INTO "Business" ("id","name","slug","template","primaryOwnerId","createdAt","updatedAt")
    VALUES (legacy_business_id, COALESCE((SELECT "businessName" FROM "Settings" WHERE "userId"=owner_id),'Manisa'), 'manisa', 'NAIL_HAIR', owner_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    INSERT INTO "PlatformAccess" ("id","userId","role","createdAt","updatedAt")
    VALUES ('legacy_root_platform_access',owner_id,'ROOT_OWNER',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO "BusinessMembership" ("id","userId","businessId","role","createdAt","updatedAt")
    VALUES (membership_id,owner_id,legacy_business_id,'OWNER',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO "BusinessSettings" ("id","businessId","currency","timezone","createdAt","updatedAt")
    SELECT 'legacy_manisa_settings',legacy_business_id,COALESCE("currency",'CAD'),COALESCE("timezone",'America/Toronto'),CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
    FROM "Settings" WHERE "userId"=owner_id;
    IF NOT FOUND THEN
      INSERT INTO "BusinessSettings" ("id","businessId","createdAt","updatedAt") VALUES ('legacy_manisa_settings',legacy_business_id,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    END IF;
    INSERT INTO "MembershipPreference" ("id","membershipId","mobileNavOrder","collectionViews","collapsedSections","createdAt","updatedAt")
    SELECT 'legacy_manisa_preference',membership_id,COALESCE("mobileNavOrder",'report,calendar,gallery,settings'),COALESCE("collectionViews",'{}'),COALESCE("collapsedSections",'{}'),CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
    FROM "Settings" WHERE "userId"=owner_id;
    IF NOT FOUND THEN
      INSERT INTO "MembershipPreference" ("id","membershipId","createdAt","updatedAt") VALUES ('legacy_manisa_preference',membership_id,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    END IF;
    UPDATE "Customer" SET "businessId"=legacy_business_id;
    UPDATE "StudioCategory" SET "businessId"=legacy_business_id;
    UPDATE "Service" SET "businessId"=legacy_business_id;
    UPDATE "Appointment" SET "businessId"=legacy_business_id;
    UPDATE "PaymentMethod" SET "businessId"=legacy_business_id;
    UPDATE "AppointmentPayment" SET "businessId"=legacy_business_id;
    UPDATE "AppointmentService" SET "businessId"=legacy_business_id;
    UPDATE "AppointmentActualService" SET "businessId"=legacy_business_id;
    UPDATE "NotificationReceipt" SET "businessId"=legacy_business_id;
    UPDATE "AppointmentPhoto" SET "businessId"=legacy_business_id;
    UPDATE "InstagramConnection" SET "businessId"=legacy_business_id, "connectedById"="userId";
    UPDATE "InstagramPost" SET "businessId"=legacy_business_id;
  END IF;
END $$;

ALTER TABLE "Customer" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "StudioCategory" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "Service" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "Appointment" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "PaymentMethod" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "AppointmentPayment" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "AppointmentService" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "AppointmentActualService" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "NotificationReceipt" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "AppointmentPhoto" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "InstagramConnection" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "InstagramPost" ALTER COLUMN "businessId" SET NOT NULL;

ALTER TABLE "InstagramConnection" DROP CONSTRAINT "InstagramConnection_userId_fkey";
DROP INDEX "InstagramConnection_userId_key";
ALTER TABLE "InstagramConnection" DROP COLUMN "userId";
DROP INDEX "StudioCategory_slug_key";
DROP INDEX "PaymentMethod_name_key";
DROP INDEX "Appointment_calendarEventId_key";
DROP INDEX "InstagramPost_remoteMediaId_key";
DROP INDEX "NotificationReceipt_userId_key_key";

CREATE TABLE "MediaVariant" (
  "id" TEXT PRIMARY KEY, "assetId" TEXT NOT NULL, "kind" "MediaVariantKind" NOT NULL,
  "objectKey" TEXT NOT NULL UNIQUE, "width" INTEGER NOT NULL, "height" INTEGER NOT NULL,
  "sizeBytes" INTEGER NOT NULL, "format" TEXT NOT NULL DEFAULT 'webp',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE("assetId","kind")
);
CREATE TABLE "MediaProcessingJob" (
  "id" TEXT PRIMARY KEY, "assetId" TEXT NOT NULL, "status" "MediaJobStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0, "lastError" TEXT, "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "StudioCategory_businessId_slug_key" ON "StudioCategory"("businessId","slug");
CREATE UNIQUE INDEX "PaymentMethod_businessId_name_key" ON "PaymentMethod"("businessId","name");
CREATE UNIQUE INDEX "Appointment_businessId_calendarEventId_key" ON "Appointment"("businessId","calendarEventId");
CREATE UNIQUE INDEX "InstagramPost_businessId_remoteMediaId_key" ON "InstagramPost"("businessId","remoteMediaId");
CREATE UNIQUE INDEX "NotificationReceipt_userId_businessId_key_key" ON "NotificationReceipt"("userId","businessId","key");
CREATE UNIQUE INDEX "InstagramConnection_businessId_key" ON "InstagramConnection"("businessId");
CREATE UNIQUE INDEX "AppointmentPhoto_customerId_key" ON "AppointmentPhoto"("customerId");
CREATE UNIQUE INDEX "AppointmentPhoto_objectKey_key" ON "AppointmentPhoto"("objectKey");
CREATE INDEX "PlatformAccess_role_active_idx" ON "PlatformAccess"("role","active");
CREATE INDEX "Business_active_deletedAt_idx" ON "Business"("active","deletedAt");
CREATE INDEX "BusinessMembership_businessId_role_active_idx" ON "BusinessMembership"("businessId","role","active");
CREATE INDEX "Invitation_email_expiresAt_idx" ON "Invitation"("email","expiresAt");
CREATE INDEX "AuditLog_businessId_createdAt_idx" ON "AuditLog"("businessId","createdAt");
CREATE INDEX "MediaProcessingJob_status_availableAt_idx" ON "MediaProcessingJob"("status","availableAt");
CREATE INDEX "Customer_businessId_firstName_lastName_idx" ON "Customer"("businessId","firstName","lastName");
CREATE INDEX "Customer_businessId_deletedAt_idx" ON "Customer"("businessId","deletedAt");
CREATE INDEX "StudioCategory_businessId_active_position_idx" ON "StudioCategory"("businessId","active","position");
CREATE INDEX "Service_businessId_categoryId_active_idx" ON "Service"("businessId","categoryId","active");
CREATE INDEX "Appointment_businessId_status_startAt_idx" ON "Appointment"("businessId","status","startAt");
CREATE INDEX "Appointment_businessId_customerId_startAt_idx" ON "Appointment"("businessId","customerId","startAt");
CREATE INDEX "Appointment_businessId_deletedAt_idx" ON "Appointment"("businessId","deletedAt");
CREATE INDEX "AppointmentPayment_businessId_paidAt_idx" ON "AppointmentPayment"("businessId","paidAt");
CREATE INDEX "AppointmentPhoto_businessId_appointmentId_createdAt_idx" ON "AppointmentPhoto"("businessId","appointmentId","createdAt");
CREATE INDEX "AppointmentPhoto_businessId_deletedAt_idx" ON "AppointmentPhoto"("businessId","deletedAt");

ALTER TABLE "PlatformAccess" ADD CONSTRAINT "PlatformAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Business" ADD CONSTRAINT "Business_primaryOwnerId_fkey" FOREIGN KEY ("primaryOwnerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BusinessSettings" ADD CONSTRAINT "BusinessSettings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessMembership" ADD CONSTRAINT "BusinessMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessMembership" ADD CONSTRAINT "BusinessMembership_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MembershipPreference" ADD CONSTRAINT "MembershipPreference_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "BusinessMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NotificationReceipt" ADD CONSTRAINT "NotificationReceipt_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudioCategory" ADD CONSTRAINT "StudioCategory_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Service" ADD CONSTRAINT "Service_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppointmentPayment" ADD CONSTRAINT "AppointmentPayment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppointmentService" ADD CONSTRAINT "AppointmentService_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppointmentActualService" ADD CONSTRAINT "AppointmentActualService_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppointmentPhoto" ADD CONSTRAINT "AppointmentPhoto_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppointmentPhoto" ADD CONSTRAINT "AppointmentPhoto_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaVariant" ADD CONSTRAINT "MediaVariant_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "AppointmentPhoto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaProcessingJob" ADD CONSTRAINT "MediaProcessingJob_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "AppointmentPhoto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InstagramConnection" ADD CONSTRAINT "InstagramConnection_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InstagramConnection" ADD CONSTRAINT "InstagramConnection_connectedById_fkey" FOREIGN KEY ("connectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InstagramPost" ADD CONSTRAINT "InstagramPost_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
