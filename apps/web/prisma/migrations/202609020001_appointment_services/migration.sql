CREATE TABLE "AppointmentService" (
  "id" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "serviceNameSnapshot" TEXT NOT NULL,
  "durationMinutes" INTEGER NOT NULL,
  "price" DECIMAL(12,2) NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppointmentService_pkey" PRIMARY KEY ("id")
);

INSERT INTO "AppointmentService" (
  "id", "appointmentId", "serviceId", "serviceNameSnapshot", "durationMinutes", "price", "position"
)
SELECT
  'migrated_' || md5("id"), "id", "serviceId", "serviceNameSnapshot", "expectedDurationMinutes", "expectedPrice", 0
FROM "Appointment";

CREATE UNIQUE INDEX "AppointmentService_appointmentId_serviceId_key" ON "AppointmentService"("appointmentId", "serviceId");
CREATE INDEX "AppointmentService_appointmentId_position_idx" ON "AppointmentService"("appointmentId", "position");
CREATE INDEX "AppointmentService_serviceId_idx" ON "AppointmentService"("serviceId");
ALTER TABLE "AppointmentService" ADD CONSTRAINT "AppointmentService_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppointmentService" ADD CONSTRAINT "AppointmentService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
