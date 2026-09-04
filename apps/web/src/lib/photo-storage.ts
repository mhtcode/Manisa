import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { getServerEnv } from "@/lib/env";

const MAX_PHOTOS_PER_UPLOAD = 8;
const MAX_PHOTO_BYTES = 12 * 1024 * 1024;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "heif", "avif"]);

export type PreparedAppointmentPhoto = {
  originalName: string;
  imagePath: string;
  thumbnailPath: string;
  width: number;
  height: number;
  sizeBytes: number;
};

export type StoredPhotoPaths = { imagePath: string | null; thumbnailPath: string | null };

export class PhotoUploadError extends Error {}

export function uploadsRoot() {
  return path.resolve(/* turbopackIgnore: true */ getServerEnv().UPLOADS_DIR || path.join(process.cwd(), ".data", "uploads"));
}

function photoFiles(formData: FormData) {
  return formData.getAll("appointmentPhotos").filter((value): value is File => typeof value !== "string" && typeof value.arrayBuffer === "function" && value.size > 0);
}

export function absoluteUploadPath(relativePath: string) {
  const segments = relativePath.split("/");
  if (!segments.length || segments.some((segment) => !/^[a-zA-Z0-9._-]+$/.test(segment))) throw new Error("Invalid upload path.");
  const root = uploadsRoot();
  const resolved = path.resolve(root, ...segments);
  if (!resolved.startsWith(`${root}${path.sep}`)) throw new Error("Invalid upload path.");
  return resolved;
}

export async function removePreparedPhotos(photos: StoredPhotoPaths[]) {
  await Promise.all(photos.flatMap((photo) => [photo.imagePath, photo.thumbnailPath].flatMap((filePath) => filePath ? [unlink(absoluteUploadPath(filePath)).catch(() => undefined)] : [])));
}

export async function prepareAppointmentPhotos(appointmentId: string, formData: FormData) {
  const files = photoFiles(formData);
  if (!files.length) return [];
  if (files.length > MAX_PHOTOS_PER_UPLOAD) throw new PhotoUploadError(`Choose no more than ${MAX_PHOTOS_PER_UPLOAD} photos at once.`);

  const directory = path.join("appointments", appointmentId);
  await mkdir(absoluteUploadPath(directory), { recursive: true });
  const prepared: PreparedAppointmentPhoto[] = [];

  try {
    for (const file of files) {
      if (file.size > MAX_PHOTO_BYTES) throw new PhotoUploadError(`${file.name || "A photo"} is larger than 12 MB.`);
      const input = Buffer.from(await file.arrayBuffer());
      const metadata = await sharp(input, { failOn: "error", limitInputPixels: 40_000_000 }).metadata();
      if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format)) throw new PhotoUploadError(`${file.name || "A file"} is not a supported photo.`);

      const filename = randomUUID();
      const imagePath = `${directory}/${filename}.webp`;
      const thumbnailPath = `${directory}/${filename}-thumb.webp`;
      const image = sharp(input, { failOn: "error", limitInputPixels: 40_000_000 }).rotate();
      let imageInfo;
      try {
        imageInfo = await image.clone().resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true }).webp({ quality: 82, effort: 4 }).toFile(absoluteUploadPath(imagePath));
        await image.clone().resize({ width: 640, height: 480, fit: "cover", position: "attention", withoutEnlargement: false }).webp({ quality: 76, effort: 4 }).toFile(absoluteUploadPath(thumbnailPath));
      } catch (error) {
        await Promise.all([imagePath, thumbnailPath].map((filePath) => unlink(absoluteUploadPath(filePath)).catch(() => undefined)));
        throw error;
      }

      prepared.push({
        originalName: (file.name || "visit-photo").slice(0, 255),
        imagePath,
        thumbnailPath,
        width: imageInfo.width,
        height: imageInfo.height,
        sizeBytes: imageInfo.size,
      });
    }
    return prepared;
  } catch (error) {
    await removePreparedPhotos(prepared);
    if (error instanceof PhotoUploadError) throw error;
    throw new PhotoUploadError("One of the photos could not be processed. Use a JPEG, PNG, WebP, HEIC, or AVIF image.");
  }
}
