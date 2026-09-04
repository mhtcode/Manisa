import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const prisma = new PrismaClient();
const root = path.resolve(process.env.UPLOADS_DIR || "/app/uploads");
const bucket = process.env.S3_PRIVATE_BUCKET || "manisa-private";
const s3 = new S3Client({ endpoint: process.env.S3_ENDPOINT, region: process.env.S3_REGION || "us-east-1", forcePathStyle: true, credentials: { accessKeyId: process.env.S3_ACCESS_KEY, secretAccessKey: process.env.S3_SECRET_KEY } });
function safe(relative) { const resolved = path.resolve(root, ...relative.split("/")); if (!resolved.startsWith(`${root}${path.sep}`)) throw new Error("Unsafe legacy path"); return resolved; }
async function upload(asset, relative, kind) { const body = await readFile(safe(relative)); const sha256 = createHash("sha256").update(body).digest("hex"); const key = `${asset.businessId}/legacy/${asset.id}/${kind.toLowerCase()}.webp`; await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: "image/webp", CacheControl: "public,max-age=31536000,immutable", Metadata: { sha256 } })); const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key })); if (head.Metadata?.sha256 !== sha256 || Number(head.ContentLength) !== body.length) throw new Error(`Verification failed for ${asset.id}`); return { key, size: body.length }; }
async function run() { const assets = await prisma.mediaAsset.findMany({ where: { objectKey: null, imagePath: { not: null } }, orderBy: { createdAt: "asc" } }); for (const asset of assets) { const large = await upload(asset, asset.imagePath, "LARGE"); const thumb = asset.thumbnailPath ? await upload(asset, asset.thumbnailPath, "THUMBNAIL") : large; await prisma.$transaction([prisma.mediaAsset.update({ where: { id: asset.id }, data: { objectKey: large.key, status: "READY", variants: { createMany: { data: [{ kind: "LARGE", objectKey: large.key, width: asset.width, height: asset.height, sizeBytes: large.size }, { kind: "THUMBNAIL", objectKey: thumb.key, width: Math.min(640, asset.width), height: Math.min(480, asset.height), sizeBytes: thumb.size }] } } } }), prisma.business.update({ where: { id: asset.businessId }, data: { storageUsedBytes: { increment: BigInt(large.size + thumb.size) } } })]); } console.log(`Migrated ${assets.length} legacy media assets; legacy files were retained.`); }
run().finally(() => prisma.$disconnect());
