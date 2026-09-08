import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const prisma = new PrismaClient();
const s3 = new S3Client({ endpoint: process.env.S3_ENDPOINT, region: process.env.S3_REGION || "us-east-1", forcePathStyle: true, credentials: { accessKeyId: process.env.S3_ACCESS_KEY, secretAccessKey: process.env.S3_SECRET_KEY } });
const bucket = process.env.S3_PRIVATE_BUCKET || "manisa-private";
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function crc32(buffer) { let crc = 0xffffffff; for (const byte of buffer) { crc ^= byte; for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); } return (crc ^ 0xffffffff) >>> 0; }
function zip(files) {
  const local = []; const central = []; let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name.replaceAll("\\", "/")); const data = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data); const crc = crc32(data);
    const head = Buffer.alloc(30); head.writeUInt32LE(0x04034b50, 0); head.writeUInt16LE(20, 4); head.writeUInt16LE(0x800, 6); head.writeUInt32LE(crc, 14); head.writeUInt32LE(data.length, 18); head.writeUInt32LE(data.length, 22); head.writeUInt16LE(name.length, 26);
    local.push(head, name, data);
    const center = Buffer.alloc(46); center.writeUInt32LE(0x02014b50, 0); center.writeUInt16LE(20, 4); center.writeUInt16LE(20, 6); center.writeUInt16LE(0x800, 8); center.writeUInt32LE(crc, 16); center.writeUInt32LE(data.length, 20); center.writeUInt32LE(data.length, 24); center.writeUInt16LE(name.length, 28); center.writeUInt32LE(offset, 42); central.push(center, name);
    offset += head.length + name.length + data.length;
  }
  const centralSize = central.reduce((sum, item) => sum + item.length, 0); const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(centralSize, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, ...central, end]);
}
function csv(rows) { if (!rows.length) return ""; const keys = Object.keys(rows[0]); const cell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`; return `${keys.map(cell).join(",")}\n${rows.map((row) => keys.map((key) => cell(row[key])).join(",")).join("\n")}\n`; }
function plain(value) { return JSON.parse(JSON.stringify(value, (_, item) => typeof item === "bigint" ? item.toString() : item)); }
function safeName(value) { return value.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "file"; }
async function object(key) { const result = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key })); return Buffer.from(await result.Body.transformToByteArray()); }
function pdf(lines) {
  const safe = (value) => String(value).replace(/[^\x20-\x7e]/g, "?").replace(/[()\\]/g, "\\$&");
  const stream = `BT /F1 12 Tf 54 770 Td 18 TL ${lines.map((line) => `(${safe(line)}) Tj T*`).join(" ")} ET`;
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>", `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
  let body = "%PDF-1.4\n"; const offsets = [0];
  objects.forEach((item, index) => { offsets.push(Buffer.byteLength(body)); body += `${index + 1} 0 obj\n${item}\nendobj\n`; });
  const xref = Buffer.byteLength(body); body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(body);
}
function nextOccurrence(date, frequency, now) {
  const next = new Date(date);
  do {
    if (frequency === "WEEKLY") next.setUTCDate(next.getUTCDate() + 7);
    else if (frequency === "MONTHLY") next.setUTCMonth(next.getUTCMonth() + 1);
    else if (frequency === "QUARTERLY") next.setUTCMonth(next.getUTCMonth() + 3);
    else next.setUTCFullYear(next.getUTCFullYear() + 1);
  } while (next <= now);
  return next;
}

async function processJob(job) {
  const range = { gte: job.fromDate, lte: job.toDate };
  const [studio, customers, appointments, payments, transactions, bills, invoices, accounts, categories, vendors, methods, media, attachments] = await Promise.all([
    prisma.studioSettings.findUniqueOrThrow({ where: { id: "studio" } }),
    prisma.customer.findMany({ where: { createdAt: { lte: job.toDate } } }),
    prisma.appointment.findMany({ where: { startAt: range }, include: { serviceLines: true, actualServiceLines: true } }),
    prisma.appointmentPayment.findMany({ where: { paidAt: range } }),
    prisma.financialTransaction.findMany({ where: { occurredAt: range } }),
    prisma.supplierBill.findMany({ where: { issueDate: range }, include: { lines: true } }),
    prisma.customerInvoice.findMany({ where: { issueDate: range } }),
    prisma.financialAccount.findMany({ where: { } }), prisma.financialCategory.findMany({ where: { } }), prisma.vendor.findMany({ where: { } }), prisma.paymentMethod.findMany({ where: { } }),
    prisma.mediaAsset.findMany({ where: { status: "READY", OR: [{ appointment: { startAt: range } }, { customer: { appointments: { some: { startAt: range } } } }] }, include: { variants: true } }),
    prisma.financialAttachment.findMany({ where: { OR: [{ transaction: { occurredAt: range } }, { bill: { issueDate: range } }] } }),
  ]);
  const files = [];
  const tables = { customers, appointments, payments, transactions, bills, invoices, accounts, categories, vendors, paymentMethods: methods };
  for (const [name, rows] of Object.entries(tables)) files.push({ name: `data/${name}.csv`, data: csv(plain(rows).map((row) => Object.fromEntries(Object.entries(row).filter(([, value]) => value === null || ["string", "number", "boolean"].includes(typeof value))))) });
  const manifest = { schemaVersion: 2, generatedAt: new Date().toISOString(), period: { from: job.fromDate, to: job.toDate }, studio: plain(studio), counts: Object.fromEntries(Object.entries(tables).map(([name, rows]) => [name, rows.length])), records: plain(tables) };
  files.push({ name: "manifest.json", data: JSON.stringify(manifest, null, 2) });
  for (const invoice of invoices) files.push({ name: `documents/invoices/${safeName(invoice.invoicePrefix)}-${String(invoice.invoiceNumber).padStart(5, "0")}.pdf`, data: pdf([studio.name, `Invoice ${invoice.invoicePrefix}-${String(invoice.invoiceNumber).padStart(5, "0")}`, `Issued ${invoice.issueDate.toISOString().slice(0, 10)}`, `Amount ${invoice.currency} ${invoice.amount}`, invoice.dueDate ? `Due ${invoice.dueDate.toISOString().slice(0, 10)}` : "Due on receipt"]) });
  for (const asset of media) { const variant = asset.variants.find((item) => item.kind === "LARGE" || item.kind === "AVATAR_LARGE") || asset.variants.at(-1); if (!variant) continue; try { files.push({ name: `media/${asset.ownerType.toLowerCase()}/${asset.id}-${safeName(asset.originalName)}.webp`, data: await object(variant.objectKey) }); } catch {} }
  for (const attachment of attachments) { try { files.push({ name: `documents/attachments/${attachment.id}-${safeName(attachment.originalName)}`, data: await object(attachment.objectKey) }); } catch {} }
  const archive = zip(files); const key = `studio/exports/${job.id}.zip`; const checksum = createHash("sha256").update(archive).digest("hex");
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: archive, ContentType: "application/zip", CacheControl: "private,no-store" }));
  await prisma.exportJob.update({ where: { id: job.id }, data: { status: "READY", progress: 100, objectKey: key, checksum, sizeBytes: archive.length, fileCount: files.length, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
}

async function expire() {
  const jobs = await prisma.exportJob.findMany({ where: { status: "READY", expiresAt: { lte: new Date() }, objectKey: { not: null } } });
  for (const job of jobs) { await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: job.objectKey })).catch(() => undefined); await prisma.exportJob.update({ where: { id: job.id }, data: { status: "EXPIRED", objectKey: null } }); }
}

async function generateRecurringBills() {
  const now = new Date();
  const templates = await prisma.recurringBillTemplate.findMany({ where: { active: true, nextIssueDate: { lte: now } }, take: 100 });
  for (const template of templates) await prisma.$transaction(async (tx) => {
    const nextIssueDate = nextOccurrence(template.nextIssueDate, template.frequency, now);
    const claimed = await tx.recurringBillTemplate.updateMany({ where: { id: template.id, active: true, nextIssueDate: template.nextIssueDate }, data: { nextIssueDate } });
    if (!claimed.count) return;
    const issueDate = template.nextIssueDate; const dueDate = new Date(issueDate); dueDate.setUTCDate(dueDate.getUTCDate() + template.dueAfterDays);
    await tx.supplierBill.create({ data: { vendorId: template.vendorId, vendorNameSnapshot: template.vendorNameSnapshot, issueDate, dueDate, currency: template.currency, total: template.amount, draft: true, recurringTemplateId: template.id, lines: { create: { categoryId: template.categoryId, categoryNameSnapshot: template.categoryNameSnapshot, description: template.description, amount: template.amount } } } });
  });
}

async function run() { for (;;) { await expire(); await generateRecurringBills(); const job = await prisma.exportJob.findFirst({ where: { status: "QUEUED" }, orderBy: { createdAt: "asc" } }); if (!job) { await pause(3000); continue; } const claimed = await prisma.exportJob.updateMany({ where: { id: job.id, status: "QUEUED" }, data: { status: "PROCESSING", progress: 5 } }); if (!claimed.count) continue; try { await processJob(job); } catch (error) { await prisma.exportJob.update({ where: { id: job.id }, data: { status: "FAILED", errorMessage: error instanceof Error ? error.message.slice(0, 500) : "Export failed" } }); } } }
run().finally(() => prisma.$disconnect());
