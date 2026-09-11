import { createCipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

function encryptSecret(value, secret) {
  const key = createHash("sha256").update(secret, "utf8").digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

const BASELINE_NAME = "202609080001_initial_single_studio";
const projectDirectory = fileURLToPath(new URL("../", import.meta.url));
const baselinePath = fileURLToPath(
  new URL(`../prisma/migrations/${BASELINE_NAME}/migration.sql`, import.meta.url),
);
const baselineChecksum = createHash("sha256")
  .update(readFileSync(baselinePath))
  .digest("hex");
const prisma = new PrismaClient();

function runPrisma(args, { quiet = false } = {}) {
  const result = spawnSync(process.platform === "win32" ? "npx.cmd" : "npx", ["prisma", ...args], {
    cwd: projectDirectory,
    env: process.env,
    encoding: "utf8",
    stdio: quiet ? "pipe" : "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  return result;
}

async function applicationTableCount() {
  const [result] = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS "count"
    FROM pg_catalog.pg_tables
    WHERE schemaname = current_schema()
      AND tablename <> '_prisma_migrations'
  `;

  return result?.count ?? 0;
}

async function assertExistingSchemaIsCurrent() {
  const result = runPrisma(
    [
      "migrate",
      "diff",
      "--from-schema-datasource",
      "prisma/schema.prisma",
      "--to-schema-datamodel",
      "prisma/schema.prisma",
      "--exit-code",
    ],
    { quiet: true },
  );

  if (result.status === 0) {
    return;
  }

  if (result.status === 2) {
    throw new Error(
      "The database is not on the final single-studio schema. Deploy commit 090ce36 first, then deploy this squashed baseline.",
    );
  }

  const diagnostic = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  throw new Error(`Prisma could not verify the existing database schema.${diagnostic ? `\n${diagnostic}` : ""}`);
}

async function ensureReviewSchema() {
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "StudioReview" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "reviewerName" TEXT NOT NULL,
      "rating" INTEGER NOT NULL,
      "opinion" TEXT NOT NULL,
      "language" "Locale" NOT NULL DEFAULT 'en',
      "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
      "approvedById" TEXT,
      "approvedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL
    )
  `);
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "StudioReview_status_createdAt_idx" ON "StudioReview"("status", "createdAt")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "StudioReview_approvedAt_idx" ON "StudioReview"("approvedAt")');
  await prisma.$executeRawUnsafe('ALTER TABLE "StudioReview" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3)');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "StudioReview_deletedAt_createdAt_idx" ON "StudioReview"("deletedAt", "createdAt")');
  const constraints = await prisma.$queryRaw`
    SELECT conname FROM pg_catalog.pg_constraint
    WHERE conrelid = '"StudioReview"'::regclass
      AND conname IN ('StudioReview_rating_check', 'StudioReview_approvedById_fkey')
  `;
  const names = new Set(constraints.map((constraint) => constraint.conname));
  if (!names.has("StudioReview_rating_check")) await prisma.$executeRawUnsafe('ALTER TABLE "StudioReview" ADD CONSTRAINT "StudioReview_rating_check" CHECK ("rating" BETWEEN 1 AND 5)');
  if (!names.has("StudioReview_approvedById_fkey")) await prisma.$executeRawUnsafe('ALTER TABLE "StudioReview" ADD CONSTRAINT "StudioReview_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE');
}

async function ensureMultiCalendarSchema() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "GoogleCalendarCredential" (
      "id" TEXT PRIMARY KEY NOT NULL DEFAULT 'google-calendar',
      "clientId" TEXT NOT NULL,
      "encryptedClientSecret" TEXT NOT NULL,
      "redirectUri" TEXT NOT NULL,
      "configuredById" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL
    )
  `);
  const [connectionCount] = await prisma.$queryRaw`SELECT COUNT(*)::int AS "count" FROM "GoogleCalendarConnection"`;
  const [credentialCount] = await prisma.$queryRaw`SELECT COUNT(*)::int AS "count" FROM "GoogleCalendarCredential"`;
  if (connectionCount.count > 0 && credentialCount.count === 0) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;
    const encryptionKey = process.env.INTEGRATION_ENCRYPTION_KEY;
    if (!clientId || !clientSecret || !redirectUri || !encryptionKey) throw new Error("Existing Google Calendar connections require their current OAuth environment values during this upgrade.");
    const [connector] = await prisma.$queryRaw`SELECT "connectedById" FROM "GoogleCalendarConnection" ORDER BY "createdAt" LIMIT 1`;
    await prisma.$executeRaw`
      INSERT INTO "GoogleCalendarCredential" ("id", "clientId", "encryptedClientSecret", "redirectUri", "configuredById", "updatedAt")
      VALUES ('google-calendar', ${clientId}, ${encryptSecret(clientSecret, encryptionKey)}, ${redirectUri}, ${connector.connectedById}, CURRENT_TIMESTAMP)
    `;
  }
  await prisma.$executeRawUnsafe('ALTER TABLE "GoogleCalendarConnection" ADD COLUMN IF NOT EXISTS "credentialId" TEXT');
  await prisma.$executeRawUnsafe('ALTER TABLE "GoogleCalendarConnection" ADD COLUMN IF NOT EXISTS "calendarName" TEXT NOT NULL DEFAULT \'Primary calendar\'');
  await prisma.$executeRawUnsafe('ALTER TABLE "GoogleCalendarConnection" ADD COLUMN IF NOT EXISTS "primary" BOOLEAN NOT NULL DEFAULT false');
  await prisma.$executeRawUnsafe('ALTER TABLE "GoogleCalendarConnection" ADD COLUMN IF NOT EXISTS "lastCheckedAt" TIMESTAMP(3)');
  await prisma.$executeRawUnsafe('UPDATE "GoogleCalendarConnection" SET "credentialId" = \'google-calendar\', "primary" = true WHERE "credentialId" IS NULL');
  await prisma.$executeRawUnsafe('ALTER TABLE "GoogleCalendarConnection" ALTER COLUMN "credentialId" SET DEFAULT \'google-calendar\'');
  await prisma.$executeRawUnsafe('ALTER TABLE "GoogleCalendarConnection" ALTER COLUMN "credentialId" SET NOT NULL');
  await prisma.$executeRawUnsafe('DROP INDEX IF EXISTS "GoogleCalendarConnection_singletonKey_key"');
  await prisma.$executeRawUnsafe('ALTER TABLE "GoogleCalendarConnection" DROP COLUMN IF EXISTS "singletonKey"');
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "GoogleCalendarConnection_googleAccountEmail_calendarId_key" ON "GoogleCalendarConnection"("googleAccountEmail", "calendarId")');
  await prisma.$executeRawUnsafe('DROP INDEX IF EXISTS "GoogleCalendarEvent_appointmentId_key"');
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "GoogleCalendarEvent_connectionId_appointmentId_key" ON "GoogleCalendarEvent"("connectionId", "appointmentId")');
  await prisma.$executeRawUnsafe('DROP INDEX IF EXISTS "GoogleCalendarSyncJob_appointmentId_key"');
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "GoogleCalendarSyncJob_connectionId_appointmentId_key" ON "GoogleCalendarSyncJob"("connectionId", "appointmentId")');
  const constraints = await prisma.$queryRaw`
    SELECT conname FROM pg_catalog.pg_constraint
    WHERE conname IN ('GoogleCalendarCredential_configuredById_fkey', 'GoogleCalendarConnection_credentialId_fkey')
  `;
  const names = new Set(constraints.map((constraint) => constraint.conname));
  if (!names.has("GoogleCalendarCredential_configuredById_fkey")) await prisma.$executeRawUnsafe('ALTER TABLE "GoogleCalendarCredential" ADD CONSTRAINT "GoogleCalendarCredential_configuredById_fkey" FOREIGN KEY ("configuredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE');
  if (!names.has("GoogleCalendarConnection_credentialId_fkey")) await prisma.$executeRawUnsafe('ALTER TABLE "GoogleCalendarConnection" ADD CONSTRAINT "GoogleCalendarConnection_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "GoogleCalendarCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE');
}

async function ensureInstagramCredentialSchema() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "InstagramCredential" (
      "id" TEXT PRIMARY KEY NOT NULL DEFAULT 'instagram',
      "appId" TEXT NOT NULL,
      "encryptedAppSecret" TEXT NOT NULL,
      "redirectUri" TEXT NOT NULL,
      "configuredById" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL
    )
  `);
  const [connectionCount] = await prisma.$queryRaw`SELECT COUNT(*)::int AS "count" FROM "InstagramConnection"`;
  const [credentialCount] = await prisma.$queryRaw`SELECT COUNT(*)::int AS "count" FROM "InstagramCredential"`;
  if (connectionCount.count > 0 && credentialCount.count === 0) {
    const appId = process.env.INSTAGRAM_APP_ID;
    const appSecret = process.env.INSTAGRAM_APP_SECRET;
    const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;
    const encryptionKey = process.env.INTEGRATION_ENCRYPTION_KEY;
    if (!appId || !appSecret || !redirectUri || !encryptionKey) throw new Error("Existing Instagram connections require their current OAuth environment values during this upgrade.");
    const [configurer] = await prisma.$queryRaw`
      SELECT COALESCE(
        (SELECT "connectedById" FROM "InstagramConnection" WHERE "connectedById" IS NOT NULL ORDER BY "createdAt" LIMIT 1),
        (SELECT "id" FROM "User" WHERE "deletedAt" IS NULL ORDER BY CASE WHEN "role" = 'OWNER' THEN 0 ELSE 1 END, "createdAt" LIMIT 1)
      ) AS "configuredById"
    `;
    if (!configurer?.configuredById) throw new Error("An active user is required to migrate Instagram credentials.");
    await prisma.$executeRaw`
      INSERT INTO "InstagramCredential" ("id", "appId", "encryptedAppSecret", "redirectUri", "configuredById", "updatedAt")
      VALUES ('instagram', ${appId}, ${encryptSecret(appSecret, encryptionKey)}, ${redirectUri}, ${configurer.configuredById}, CURRENT_TIMESTAMP)
    `;
  }
  await prisma.$executeRawUnsafe('ALTER TABLE "InstagramConnection" ADD COLUMN IF NOT EXISTS "credentialId" TEXT');
  await prisma.$executeRawUnsafe('UPDATE "InstagramConnection" SET "credentialId" = \'instagram\' WHERE "credentialId" IS NULL');
  await prisma.$executeRawUnsafe('ALTER TABLE "InstagramConnection" ALTER COLUMN "credentialId" SET DEFAULT \'instagram\'');
  await prisma.$executeRawUnsafe('ALTER TABLE "InstagramConnection" ALTER COLUMN "credentialId" SET NOT NULL');
  const constraints = await prisma.$queryRaw`
    SELECT conname FROM pg_catalog.pg_constraint
    WHERE conname IN ('InstagramCredential_configuredById_fkey', 'InstagramConnection_credentialId_fkey')
  `;
  const names = new Set(constraints.map((constraint) => constraint.conname));
  if (!names.has("InstagramCredential_configuredById_fkey")) await prisma.$executeRawUnsafe('ALTER TABLE "InstagramCredential" ADD CONSTRAINT "InstagramCredential_configuredById_fkey" FOREIGN KEY ("configuredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE');
  if (!names.has("InstagramConnection_credentialId_fkey")) await prisma.$executeRawUnsafe('ALTER TABLE "InstagramConnection" ADD CONSTRAINT "InstagramConnection_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "InstagramCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE');
}

async function ensureGalleryCompositionSchema() {
  await prisma.$executeRawUnsafe('ALTER TABLE "AppointmentPhoto" ADD COLUMN IF NOT EXISTS "comparisonTag" TEXT NOT NULL DEFAULT \'UNTAGGED\'');
}

async function ensurePublicBookingSchema() {
  await prisma.$executeRawUnsafe(`ALTER TYPE "AppointmentStatus" ADD VALUE IF NOT EXISTS 'REQUESTED'`);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "AppointmentSource" AS ENUM ('ADMIN', 'PUBLIC_BOOKING', 'IMPORT');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "NotificationPreference" AS ENUM ('NONE', 'EMAIL', 'SMS', 'WHATSAPP');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$
  `);
  await prisma.$executeRawUnsafe('ALTER TABLE "StudioSettings" ADD COLUMN IF NOT EXISTS "publicBookingEnabled" BOOLEAN NOT NULL DEFAULT false');
  await prisma.$executeRawUnsafe(`ALTER TABLE "StudioSettings" ADD COLUMN IF NOT EXISTS "publicBookingMessage" TEXT DEFAULT 'Call or message us on WhatsApp to book your appointment.'`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "StudioSettings" ADD COLUMN IF NOT EXISTS "publicBookingDays" TEXT NOT NULL DEFAULT '1,2,3,4,5,6'`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "StudioSettings" ADD COLUMN IF NOT EXISTS "publicBookingOpenTime" TEXT NOT NULL DEFAULT '09:00'`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "StudioSettings" ADD COLUMN IF NOT EXISTS "publicBookingCloseTime" TEXT NOT NULL DEFAULT '18:00'`);
  await prisma.$executeRawUnsafe('ALTER TABLE "StudioSettings" ADD COLUMN IF NOT EXISTS "publicBookingSlotMins" INTEGER NOT NULL DEFAULT 30');
  await prisma.$executeRawUnsafe('ALTER TABLE "StudioSettings" ADD COLUMN IF NOT EXISTS "publicBookingLeadHours" INTEGER NOT NULL DEFAULT 12');
  await prisma.$executeRawUnsafe(`ALTER TABLE "StudioSettings" ADD COLUMN IF NOT EXISTS "publicBookingWindows" JSONB NOT NULL DEFAULT '{}'::jsonb`);
  await prisma.$executeRawUnsafe('ALTER TABLE "StudioSettings" ADD COLUMN IF NOT EXISTS "whatsappNumber" TEXT');
  await prisma.$executeRawUnsafe('ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "source" "AppointmentSource" NOT NULL DEFAULT \'ADMIN\'');
  await prisma.$executeRawUnsafe('ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "notificationPreference" "NotificationPreference" NOT NULL DEFAULT \'NONE\'');
  await prisma.$executeRawUnsafe('ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "notificationConsentAt" TIMESTAMPTZ(3)');
  await prisma.$executeRawUnsafe('ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "notificationEmailSnapshot" TEXT');
  await prisma.$executeRawUnsafe('ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "notificationPhoneSnapshot" TEXT');
  await prisma.$executeRawUnsafe('UPDATE "Appointment" SET "source" = \'IMPORT\' WHERE "importSourceId" IS NOT NULL AND "source" = \'ADMIN\'');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "Appointment_source_startAt_idx" ON "Appointment"("source", "startAt")');
}

async function ensureDatabaseOnlyIntegrityRules() {
  await prisma.$executeRawUnsafe(`UPDATE "StudioSettings" SET "address" = '77 Finch Avenue East, Toronto, ON' WHERE "address" IS NULL OR "address" = '65 Finch Avenue East, Toronto, ON'`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "StudioSettings" ALTER COLUMN "address" SET DEFAULT '77 Finch Avenue East, Toronto, ON'`);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "User_single_active_owner_key"
    ON "User" ((1))
    WHERE "role" = 'OWNER' AND "active" = TRUE AND "deletedAt" IS NULL
  `);

  const [attachmentConstraint] = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_constraint
      WHERE conname = 'FinancialAttachment_owner_check'
        AND conrelid = '"FinancialAttachment"'::regclass
    ) AS "exists"
  `;

  if (!attachmentConstraint?.exists) {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "FinancialAttachment"
      ADD CONSTRAINT "FinancialAttachment_owner_check" CHECK (
        (("transactionId" IS NOT NULL)::int + ("billId" IS NOT NULL)::int) = 1
      )
    `);
  }
}

async function normalizeMigrationLedger() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" VARCHAR(36) PRIMARY KEY NOT NULL,
      "checksum" VARCHAR(64) NOT NULL,
      "finished_at" TIMESTAMPTZ,
      "migration_name" VARCHAR(255) NOT NULL,
      "logs" TEXT,
      "rolled_back_at" TIMESTAMPTZ,
      "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    )
  `);

  const unfinished = await prisma.$queryRaw`
    SELECT "migration_name"
    FROM "_prisma_migrations"
    WHERE "finished_at" IS NULL AND "rolled_back_at" IS NULL
  `;

  if (unfinished.length > 0) {
    throw new Error(
      `Refusing to squash a migration ledger with unfinished migrations: ${unfinished
        .map((migration) => migration.migration_name)
        .join(", ")}`,
    );
  }

  const applied = await prisma.$queryRaw`
    SELECT "migration_name", "checksum", "finished_at", "rolled_back_at"
    FROM "_prisma_migrations"
    ORDER BY "started_at"
  `;
  const isAlreadyNormalized =
    applied.length === 1 &&
    applied[0].migration_name === BASELINE_NAME &&
    applied[0].checksum === baselineChecksum &&
    applied[0].finished_at !== null &&
    applied[0].rolled_back_at === null;

  if (isAlreadyNormalized) {
    return;
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.$executeRawUnsafe('LOCK TABLE "_prisma_migrations" IN EXCLUSIVE MODE');
    await transaction.$executeRawUnsafe('DELETE FROM "_prisma_migrations"');
    await transaction.$executeRaw`
      INSERT INTO "_prisma_migrations" (
        "id", "checksum", "finished_at", "migration_name", "logs",
        "rolled_back_at", "started_at", "applied_steps_count"
      ) VALUES (
        ${randomUUID()}, ${baselineChecksum}, CURRENT_TIMESTAMP, ${BASELINE_NAME}, NULL,
        NULL, CURRENT_TIMESTAMP, 1
      )
    `;
  });

  console.log(`Reconciled ${applied.length} applied migrations into ${BASELINE_NAME}.`);
}

async function main() {
  const tableCount = await applicationTableCount();

  if (tableCount === 0) {
    const deployment = runPrisma(["migrate", "deploy"]);
    if (deployment.status !== 0) {
      process.exitCode = deployment.status ?? 1;
    }
    return;
  }

  await ensureReviewSchema();
  await ensureMultiCalendarSchema();
  await ensureInstagramCredentialSchema();
  await ensureGalleryCompositionSchema();
  await ensurePublicBookingSchema();
  await ensureDatabaseOnlyIntegrityRules();
  await assertExistingSchemaIsCurrent();
  await normalizeMigrationLedger();

  const deployment = runPrisma(["migrate", "deploy"]);
  if (deployment.status !== 0) {
    process.exitCode = deployment.status ?? 1;
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
