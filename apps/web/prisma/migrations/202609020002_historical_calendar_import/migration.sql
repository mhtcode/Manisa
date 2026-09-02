ALTER TYPE "AppointmentStatus" ADD VALUE 'HISTORICAL';

CREATE UNIQUE INDEX "Appointment_calendarEventId_key" ON "Appointment"("calendarEventId");
