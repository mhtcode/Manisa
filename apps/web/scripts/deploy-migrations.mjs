import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

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

async function ensureDatabaseOnlyIntegrityRules() {
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

  await assertExistingSchemaIsCurrent();
  await ensureDatabaseOnlyIntegrityRules();
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
