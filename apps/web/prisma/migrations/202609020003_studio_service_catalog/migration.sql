CREATE TYPE "ServiceCategory" AS ENUM ('NAIL', 'HAIR', 'OTHER');

ALTER TABLE "Service"
  ADD COLUMN "category" "ServiceCategory" NOT NULL DEFAULT 'OTHER',
  ADD COLUMN "supportsColor" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "AppointmentService"
  ADD COLUMN "selectedColor" TEXT;

CREATE INDEX "Service_category_active_idx" ON "Service"("category", "active");

CREATE TABLE "AppointmentActualService" (
  "id" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "serviceNameSnapshot" TEXT NOT NULL,
  "actualDurationMinutes" INTEGER NOT NULL,
  "finalPrice" DECIMAL(12,2) NOT NULL,
  "selectedColor" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppointmentActualService_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppointmentActualService_appointmentId_serviceId_key" ON "AppointmentActualService"("appointmentId", "serviceId");
CREATE INDEX "AppointmentActualService_appointmentId_position_idx" ON "AppointmentActualService"("appointmentId", "position");
CREATE INDEX "AppointmentActualService_serviceId_idx" ON "AppointmentActualService"("serviceId");

ALTER TABLE "AppointmentActualService" ADD CONSTRAINT "AppointmentActualService_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppointmentActualService" ADD CONSTRAINT "AppointmentActualService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
