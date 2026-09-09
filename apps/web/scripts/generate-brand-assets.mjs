import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const publicDirectory = join(projectRoot, "public");
const sourcePath = join(publicDirectory, "brand", "manisa-logo.png");
const brandDirectory = dirname(sourcePath);

await mkdir(brandDirectory, { recursive: true });

async function transparentLogo(size) {
  return sharp(sourcePath)
    .resize(size, size, { fit: "contain" })
    .webp({ quality: 92, alphaQuality: 100, effort: 6 })
    .toBuffer();
}

async function framedIcon(size, logoScale = 0.78) {
  const logoSize = Math.round(size * logoScale);
  const logo = await sharp(sourcePath)
    .resize(logoSize, logoSize, { fit: "contain" })
    .png({ compressionLevel: 9 })
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 5, g: 13, b: 29, alpha: 1 },
    },
  })
    .composite([{ input: logo, gravity: "centre" }])
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
}

function buildIco(images) {
  const headerSize = 6;
  const entrySize = 16;
  let offset = headerSize + images.length * entrySize;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const entries = images.map(({ size, buffer }) => {
    const entry = Buffer.alloc(entrySize);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += buffer.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...images.map(({ buffer }) => buffer)]);
}

const [webLogo, icon192, icon512, appleTouchIcon, favicon16, favicon32, favicon48] =
  await Promise.all([
    transparentLogo(512),
    framedIcon(192),
    framedIcon(512),
    framedIcon(180),
    framedIcon(16, 0.9),
    framedIcon(32, 0.88),
    framedIcon(48, 0.86),
  ]);

await Promise.all([
  writeFile(join(brandDirectory, "manisa-logo.webp"), webLogo),
  writeFile(join(publicDirectory, "icon-192.png"), icon192),
  writeFile(join(publicDirectory, "icon-512.png"), icon512),
  writeFile(join(publicDirectory, "apple-touch-icon.png"), appleTouchIcon),
  writeFile(join(publicDirectory, "favicon-32.png"), favicon32),
  writeFile(
    join(publicDirectory, "favicon.ico"),
    buildIco([
      { size: 16, buffer: favicon16 },
      { size: 32, buffer: favicon32 },
      { size: 48, buffer: favicon48 },
    ]),
  ),
]);

console.log("Generated Manisa web, browser, Apple, and PWA brand assets.");
