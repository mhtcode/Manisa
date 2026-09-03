-- Add a seven-day trash lifecycle to user-managed records.
ALTER TABLE "Customer" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "StudioCategory" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Service" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Appointment" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "AppointmentPhoto" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "Customer_deletedAt_idx" ON "Customer"("deletedAt");
CREATE INDEX "StudioCategory_deletedAt_idx" ON "StudioCategory"("deletedAt");
CREATE INDEX "Service_deletedAt_idx" ON "Service"("deletedAt");
CREATE INDEX "Appointment_deletedAt_idx" ON "Appointment"("deletedAt");
CREATE INDEX "AppointmentPhoto_deletedAt_idx" ON "AppointmentPhoto"("deletedAt");

-- Service snapshots keep appointment history intact after a service is purged.
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_serviceId_fkey";
ALTER TABLE "AppointmentService" DROP CONSTRAINT "AppointmentService_serviceId_fkey";
ALTER TABLE "AppointmentActualService" DROP CONSTRAINT "AppointmentActualService_serviceId_fkey";

ALTER TABLE "Appointment" ALTER COLUMN "serviceId" DROP NOT NULL;
ALTER TABLE "AppointmentService" ALTER COLUMN "serviceId" DROP NOT NULL;
ALTER TABLE "AppointmentActualService" ALTER COLUMN "serviceId" DROP NOT NULL;

ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AppointmentService" ADD CONSTRAINT "AppointmentService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AppointmentActualService" ADD CONSTRAINT "AppointmentActualService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
