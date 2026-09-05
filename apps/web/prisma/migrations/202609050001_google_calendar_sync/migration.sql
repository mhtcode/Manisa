CREATE TYPE "GoogleCalendarConnectionStatus" AS ENUM ('CONNECTED', 'PAUSED');
CREATE TYPE "GoogleCalendarSyncOperation" AS ENUM ('UPSERT', 'DELETE');
CREATE TYPE "GoogleCalendarSyncStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

ALTER TABLE "Appointment" RENAME COLUMN "calendarEventId" TO "importSourceId";
ALTER INDEX "Appointment_businessId_calendarEventId_key" RENAME TO "Appointment_businessId_importSourceId_key";

CREATE TABLE "GoogleCalendarConnection" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "connectedById" TEXT NOT NULL,
  "googleAccountEmail" TEXT NOT NULL,
  "calendarId" TEXT NOT NULL DEFAULT 'primary',
  "encryptedRefreshToken" TEXT NOT NULL,
  "grantedScopes" TEXT NOT NULL,
  "status" "GoogleCalendarConnectionStatus" NOT NULL DEFAULT 'CONNECTED',
  "lastSuccessfulSyncAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GoogleCalendarConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GoogleCalendarEvent" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "googleEventId" TEXT NOT NULL,
  "etag" TEXT,
  "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GoogleCalendarEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GoogleCalendarSyncJob" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "operation" "GoogleCalendarSyncOperation" NOT NULL,
  "googleEventId" TEXT,
  "status" "GoogleCalendarSyncStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GoogleCalendarSyncJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GoogleCalendarConnection_businessId_key" ON "GoogleCalendarConnection"("businessId");
CREATE INDEX "GoogleCalendarConnection_status_updatedAt_idx" ON "GoogleCalendarConnection"("status", "updatedAt");
CREATE UNIQUE INDEX "GoogleCalendarEvent_businessId_appointmentId_key" ON "GoogleCalendarEvent"("businessId", "appointmentId");
CREATE UNIQUE INDEX "GoogleCalendarEvent_connectionId_googleEventId_key" ON "GoogleCalendarEvent"("connectionId", "googleEventId");
CREATE INDEX "GoogleCalendarEvent_businessId_lastSyncedAt_idx" ON "GoogleCalendarEvent"("businessId", "lastSyncedAt");
CREATE UNIQUE INDEX "GoogleCalendarSyncJob_businessId_appointmentId_key" ON "GoogleCalendarSyncJob"("businessId", "appointmentId");
CREATE INDEX "GoogleCalendarSyncJob_status_availableAt_idx" ON "GoogleCalendarSyncJob"("status", "availableAt");
CREATE INDEX "GoogleCalendarSyncJob_connectionId_status_idx" ON "GoogleCalendarSyncJob"("connectionId", "status");

ALTER TABLE "GoogleCalendarConnection" ADD CONSTRAINT "GoogleCalendarConnection_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoogleCalendarConnection" ADD CONSTRAINT "GoogleCalendarConnection_connectedById_fkey" FOREIGN KEY ("connectedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GoogleCalendarEvent" ADD CONSTRAINT "GoogleCalendarEvent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoogleCalendarEvent" ADD CONSTRAINT "GoogleCalendarEvent_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "GoogleCalendarConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoogleCalendarSyncJob" ADD CONSTRAINT "GoogleCalendarSyncJob_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoogleCalendarSyncJob" ADD CONSTRAINT "GoogleCalendarSyncJob_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "GoogleCalendarConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
