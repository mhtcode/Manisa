-- Replace the fixed service enum with administrator-managed studio categories.
CREATE TABLE "StudioCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT NOT NULL DEFAULT 'sparkles',
    "accentColor" VARCHAR(7) NOT NULL DEFAULT '#4F8CFF',
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudioCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudioCategory_slug_key" ON "StudioCategory"("slug");
CREATE INDEX "StudioCategory_active_position_idx" ON "StudioCategory"("active", "position");

INSERT INTO "StudioCategory" ("id", "slug", "name", "description", "icon", "accentColor", "position", "active", "updatedAt") VALUES
  ('studio_category_nail', 'nail', 'Nail studio', 'Manicure, extensions, gel systems, strengthening, and nail art', 'nail', '#A78BFA', 0, true, CURRENT_TIMESTAMP),
  ('studio_category_hair', 'hair', 'Hair studio', 'Cuts, styling, custom color, balayage, and restorative treatments', 'scissors', '#38BDF8', 1, true, CURRENT_TIMESTAMP),
  ('studio_category_other', 'other', 'Other services', 'Additional services outside the main studio catalog', 'sparkles', '#64748B', 2, true, CURRENT_TIMESTAMP);

ALTER TABLE "Service" ADD COLUMN "categoryId" TEXT;
UPDATE "Service"
SET "categoryId" = CASE "category"::text
  WHEN 'NAIL' THEN 'studio_category_nail'
  WHEN 'HAIR' THEN 'studio_category_hair'
  ELSE 'studio_category_other'
END;
ALTER TABLE "Service" ALTER COLUMN "categoryId" SET NOT NULL;
ALTER TABLE "Service" ADD CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "StudioCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
DROP INDEX IF EXISTS "Service_category_active_idx";
CREATE INDEX "Service_categoryId_active_idx" ON "Service"("categoryId", "active");
ALTER TABLE "Service" DROP COLUMN "category";
DROP TYPE "ServiceCategory";

-- Persist administrator-specific collection and collapsible-section preferences.
ALTER TABLE "Settings" ADD COLUMN "collectionViews" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Settings" ADD COLUMN "collapsedSections" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Settings" ALTER COLUMN "mobileNavOrder" SET DEFAULT 'report,calendar,gallery,settings';
UPDATE "Settings"
SET "mobileNavOrder" = 'report,calendar,gallery,settings'
WHERE "mobileNavOrder" = 'dashboard,appointments,calendar,more';

-- Public gallery publication state and report-friendly indexes.
ALTER TABLE "AppointmentPhoto" ADD COLUMN "featuredAt" TIMESTAMP(3);
CREATE INDEX "AppointmentPhoto_featuredAt_idx" ON "AppointmentPhoto"("featuredAt");
CREATE INDEX "Customer_createdAt_idx" ON "Customer"("createdAt");
CREATE INDEX "Appointment_status_completedAt_idx" ON "Appointment"("status", "completedAt");

-- Encrypted Instagram credentials and a durable last-successful media cache.
CREATE TABLE "InstagramConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
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

CREATE UNIQUE INDEX "InstagramConnection_userId_key" ON "InstagramConnection"("userId");
CREATE UNIQUE INDEX "InstagramPost_remoteMediaId_key" ON "InstagramPost"("remoteMediaId");
CREATE UNIQUE INDEX "InstagramPost_cachedImagePath_key" ON "InstagramPost"("cachedImagePath");
CREATE INDEX "InstagramPost_active_publishedAt_idx" ON "InstagramPost"("active", "publishedAt");
CREATE INDEX "InstagramPost_connectionId_publishedAt_idx" ON "InstagramPost"("connectionId", "publishedAt");

ALTER TABLE "InstagramConnection" ADD CONSTRAINT "InstagramConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InstagramPost" ADD CONSTRAINT "InstagramPost_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "InstagramConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
