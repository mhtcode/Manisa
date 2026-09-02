CREATE TABLE "AppointmentPhoto" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "thumbnailPath" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentPhoto_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppointmentPhoto_imagePath_key" ON "AppointmentPhoto"("imagePath");
CREATE UNIQUE INDEX "AppointmentPhoto_thumbnailPath_key" ON "AppointmentPhoto"("thumbnailPath");
CREATE INDEX "AppointmentPhoto_appointmentId_createdAt_idx" ON "AppointmentPhoto"("appointmentId", "createdAt");
CREATE INDEX "AppointmentPhoto_createdAt_idx" ON "AppointmentPhoto"("createdAt");

ALTER TABLE "AppointmentPhoto" ADD CONSTRAINT "AppointmentPhoto_appointmentId_fkey"
FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
