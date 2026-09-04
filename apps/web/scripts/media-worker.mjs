import { PrismaClient } from "@prisma/client";
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";

const prisma = new PrismaClient();
const s3 = new S3Client({ endpoint: process.env.S3_ENDPOINT, region: process.env.S3_REGION || "us-east-1", forcePathStyle: true, credentials: { accessKeyId: process.env.S3_ACCESS_KEY, secretAccessKey: process.env.S3_SECRET_KEY } });
const bucket = process.env.S3_PRIVATE_BUCKET || "manisa-private";
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function bodyBuffer(body) { return Buffer.from(await body.transformToByteArray()); }

async function processJob(job) {
  const asset = job.asset;
  if (!asset.objectKey) throw new Error("Missing staging object");
  const source = await bodyBuffer((await s3.send(new GetObjectCommand({ Bucket: bucket, Key: asset.objectKey }))).Body);
  const probe = await sharp(source, { failOn: "error" }).rotate().metadata();
  if (!probe.width || !probe.height) throw new Error("Invalid image content");
  const sizes = asset.ownerType === "CUSTOMER_AVATAR" ? [["AVATAR_SMALL", 128], ["AVATAR_LARGE", 512]] : [["THUMBNAIL", 320], ["MEDIUM", 768], ["LARGE", 1600]];
  const variants = [];
  for (const [kind, width] of sizes) {
    const output = await sharp(source).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
    const key = `${asset.businessId}/assets/${asset.id}/${kind.toLowerCase()}-${output.info.width}x${output.info.height}.webp`;
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: output.data, ContentType: "image/webp", CacheControl: "public,max-age=31536000,immutable" }));
    variants.push({ kind, objectKey: key, width: output.info.width, height: output.info.height, sizeBytes: output.info.size });
  }
  await prisma.$transaction(async (tx) => {
    if (asset.ownerType === "CUSTOMER_AVATAR" && asset.customerId) {
      const old = await tx.mediaAsset.findFirst({ where: { businessId: asset.businessId, customerId: asset.customerId, id: { not: asset.id }, deletedAt: null } });
      if (old) await tx.mediaAsset.update({ where: { id: old.id }, data: { deletedAt: new Date() } });
    }
    await tx.mediaVariant.createMany({ data: variants.map((variant) => ({ ...variant, assetId: asset.id })) });
    await tx.mediaAsset.update({ where: { id: asset.id }, data: { status: "READY", objectKey: variants.at(-1).objectKey, width: probe.width, height: probe.height, sizeBytes: source.length } });
    await tx.mediaProcessingJob.update({ where: { id: job.id }, data: { status: "COMPLETED" } });
    await tx.business.update({ where: { id: asset.businessId }, data: { storageReservedBytes: { decrement: BigInt(asset.sizeBytes) }, storageUsedBytes: { increment: BigInt(variants.reduce((sum, item) => sum + item.sizeBytes, 0)) } } });
  });
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: asset.objectKey }));
}

async function run() {
  for (;;) {
    const job = await prisma.mediaProcessingJob.findFirst({ where: { status: "PENDING", availableAt: { lte: new Date() } }, include: { asset: true }, orderBy: { createdAt: "asc" } });
    if (!job) { await pause(1500); continue; }
    const claimed = await prisma.mediaProcessingJob.updateMany({ where: { id: job.id, status: "PENDING" }, data: { status: "PROCESSING", lockedAt: new Date(), attempts: { increment: 1 } } });
    if (!claimed.count) continue;
    try { await processJob(job); }
    catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 500) : "Processing failed";
      const final = job.attempts >= 2;
      await prisma.$transaction([
        prisma.mediaProcessingJob.update({ where: { id: job.id }, data: { status: final ? "FAILED" : "PENDING", lastError: message, availableAt: new Date(Date.now() + 60_000) } }),
        prisma.mediaAsset.update({ where: { id: job.assetId }, data: { status: final ? "FAILED" : "PROCESSING", errorMessage: message } }),
        ...(final ? [prisma.business.update({ where: { id: job.asset.businessId }, data: { storageReservedBytes: { decrement: BigInt(job.asset.sizeBytes) } } })] : []),
      ]);
    }
  }
}

run().finally(() => prisma.$disconnect());
