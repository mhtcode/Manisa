import "server-only";
import { CopyObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getServerEnv } from "@/lib/env";

function config(publicEndpoint = false) {
  const env = getServerEnv();
  if (!env.S3_ENDPOINT || !env.S3_ACCESS_KEY || !env.S3_SECRET_KEY) throw new Error("Object storage is not configured");
  return { endpoint: publicEndpoint ? env.S3_PUBLIC_ENDPOINT || env.S3_ENDPOINT : env.S3_ENDPOINT, region: env.S3_REGION, forcePathStyle: true, credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY } };
}

export function storageClient(publicEndpoint = false) { return new S3Client(config(publicEndpoint)); }
export function privateBucket() { return getServerEnv().S3_PRIVATE_BUCKET; }
export function publicBucket() { return getServerEnv().S3_PUBLIC_BUCKET; }
export async function createUploadUrl(key: string, contentType: string) { return getSignedUrl(storageClient(true), new PutObjectCommand({ Bucket: privateBucket(), Key: key, ContentType: contentType }), { expiresIn: 10 * 60 }); }
export async function createReadUrl(key: string, isPublic = false) { return getSignedUrl(storageClient(true), new GetObjectCommand({ Bucket: isPublic ? publicBucket() : privateBucket(), Key: key }), { expiresIn: 5 * 60 }); }
export async function inspectObject(key: string) { return storageClient().send(new HeadObjectCommand({ Bucket: privateBucket(), Key: key })); }
export async function removeObject(key: string, isPublic = false) { await storageClient().send(new DeleteObjectCommand({ Bucket: isPublic ? publicBucket() : privateBucket(), Key: key })); }
export async function publishObject(sourceKey: string, publicKey: string) { await storageClient().send(new CopyObjectCommand({ Bucket: publicBucket(), Key: publicKey, CopySource: `${privateBucket()}/${sourceKey}`, CacheControl: "public,max-age=31536000,immutable", ContentType: "image/webp", MetadataDirective: "REPLACE" })); }
