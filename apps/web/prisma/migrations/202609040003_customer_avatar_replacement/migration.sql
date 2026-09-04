DROP INDEX IF EXISTS "AppointmentPhoto_customerId_key";
CREATE UNIQUE INDEX "AppointmentPhoto_active_customer_avatar_key"
ON "AppointmentPhoto"("customerId")
WHERE "customerId" IS NOT NULL AND "deletedAt" IS NULL AND "status" = 'READY';
