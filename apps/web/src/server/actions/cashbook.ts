"use server";

import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireBusinessPermission } from "@/lib/auth";
import { customerName } from "@/lib/format";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const amountSchema = z.string().trim().regex(/^\d{1,10}(\.\d{1,2})?$/).refine((value) => Number(value) > 0);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const text = (value: FormDataEntryValue | null, max = 300) => String(value || "").trim().slice(0, max);
const onDate = (value: string) => new Date(`${value}T12:00:00.000Z`);

function refresh() {
  revalidatePath("/settings/financial");
  revalidatePath("/report");
  revalidatePath("/settings/trash");
}

async function audit(user: Awaited<ReturnType<typeof requireBusinessPermission>>, action: string, targetType: string, targetId: string, after?: Record<string, unknown>) {
  await prisma.auditLog.create({ data: { actorId: user.id, actorSnapshot: user.email, businessId: user.businessId, action, targetType, targetId, after: after as Prisma.InputJsonValue | undefined } });
}

export async function createFinancialAccount(formData: FormData) {
  const user = await requireBusinessPermission("financial.manage");
  const name = z.string().trim().min(1).max(80).parse(formData.get("name"));
  const type = z.enum(["CASH", "BANK", "CARD", "E_WALLET", "OTHER"]).parse(formData.get("type"));
  const openingBalance = z.string().regex(/^-?\d{1,10}(\.\d{1,2})?$/).parse(String(formData.get("openingBalance") || "0"));
  const position = await prisma.financialAccount.count({ where: { businessId: user.businessId, deletedAt: null } });
  const account = await prisma.financialAccount.create({ data: { businessId: user.businessId, name, type, openingBalance, position } });
  await audit(user, "financial.account.create", "FinancialAccount", account.id, { name, type, openingBalance });
  refresh();
}

export async function createFinancialCategory(formData: FormData) {
  const user = await requireBusinessPermission("financial.manage");
  const name = z.string().trim().min(1).max(80).parse(formData.get("name"));
  const type = z.enum(["INCOME", "EXPENSE"]).parse(formData.get("type"));
  const position = await prisma.financialCategory.count({ where: { businessId: user.businessId, type, deletedAt: null } });
  const category = await prisma.financialCategory.create({ data: { businessId: user.businessId, name, type, position } });
  await audit(user, "financial.category.create", "FinancialCategory", category.id, { name, type });
  refresh();
}

export async function createVendor(formData: FormData) {
  const user = await requireBusinessPermission("financial.manage");
  const name = z.string().trim().min(1).max(120).parse(formData.get("name"));
  const vendor = await prisma.vendor.create({ data: { businessId: user.businessId, name, email: text(formData.get("email"), 160) || null, phone: text(formData.get("phone"), 50) || null } });
  await audit(user, "financial.vendor.create", "Vendor", vendor.id, { name });
  refresh();
}

export async function createCashTransaction(formData: FormData) {
  const user = await requireBusinessPermission("financial.manage");
  const type = z.enum(["INCOME", "EXPENSE", "TRANSFER"]).parse(formData.get("type"));
  const accountId = String(formData.get("accountId") || "");
  const destinationAccountId = type === "TRANSFER" ? String(formData.get("destinationAccountId") || "") : null;
  const categoryId = type === "TRANSFER" ? null : String(formData.get("categoryId") || "");
  const vendorId = String(formData.get("vendorId") || "") || null;
  const amount = amountSchema.parse(String(formData.get("amount") || ""));
  const occurredAt = onDate(dateSchema.parse(formData.get("occurredAt")));
  const description = z.string().trim().min(1).max(300).parse(formData.get("description"));
  const [account, destination, category, vendor] = await Promise.all([
    prisma.financialAccount.findFirst({ where: { id: accountId, businessId: user.businessId, active: true, deletedAt: null } }),
    destinationAccountId ? prisma.financialAccount.findFirst({ where: { id: destinationAccountId, businessId: user.businessId, active: true, deletedAt: null } }) : null,
    categoryId ? prisma.financialCategory.findFirst({ where: { id: categoryId, businessId: user.businessId, type: type === "INCOME" ? "INCOME" : "EXPENSE", active: true, deletedAt: null } }) : null,
    vendorId ? prisma.vendor.findFirst({ where: { id: vendorId, businessId: user.businessId, deletedAt: null } }) : null,
  ]);
  if (!account || (type === "TRANSFER" && (!destination || destination.id === account.id)) || (type !== "TRANSFER" && !category) || (vendorId && !vendor)) throw new Error("Choose valid financial details.");
  const transaction = await prisma.financialTransaction.create({ data: {
    businessId: user.businessId, type, accountId: account.id, destinationAccountId: destination?.id,
    categoryId: category?.id, vendorId: vendor?.id, accountNameSnapshot: account.name,
    destinationNameSnapshot: destination?.name, categoryNameSnapshot: category?.name, vendorNameSnapshot: vendor?.name,
    amount, currency: user.settings?.currency || "CAD", occurredAt, description, reference: text(formData.get("reference"), 100) || null, createdById: user.id,
  } });
  await audit(user, "financial.transaction.create", "FinancialTransaction", transaction.id, { type, amount, occurredAt, accountId });
  refresh();
}

export async function createSupplierBill(formData: FormData) {
  const user = await requireBusinessPermission("financial.manage");
  const vendorId = String(formData.get("vendorId") || "");
  const categoryId = String(formData.get("categoryId") || "");
  const amount = amountSchema.parse(String(formData.get("amount") || ""));
  const issueDate = onDate(dateSchema.parse(formData.get("issueDate")));
  const dueInput = text(formData.get("dueDate"), 10);
  const [vendor, category] = await Promise.all([
    prisma.vendor.findFirst({ where: { id: vendorId, businessId: user.businessId, active: true, deletedAt: null } }),
    prisma.financialCategory.findFirst({ where: { id: categoryId, businessId: user.businessId, type: "EXPENSE", active: true, deletedAt: null } }),
  ]);
  if (!vendor || !category) throw new Error("Choose an active vendor and expense category.");
  const description = z.string().trim().min(1).max(300).parse(formData.get("description"));
  const bill = await prisma.supplierBill.create({ data: {
    businessId: user.businessId, vendorId: vendor.id, vendorNameSnapshot: vendor.name, billNumber: text(formData.get("billNumber"), 80) || null,
    issueDate, dueDate: dueInput ? onDate(dateSchema.parse(dueInput)) : null, currency: user.settings?.currency || "CAD", total: amount,
    notes: text(formData.get("notes"), 500) || null, draft: formData.get("draft") === "on",
    lines: { create: { categoryId: category.id, categoryNameSnapshot: category.name, description, amount } },
  } });
  await audit(user, "financial.bill.create", "SupplierBill", bill.id, { vendor: vendor.name, amount });
  refresh();
}

export async function paySupplierBill(billId: string, formData: FormData) {
  const user = await requireBusinessPermission("financial.manage");
  const accountId = String(formData.get("accountId") || "");
  const amount = amountSchema.parse(String(formData.get("amount") || ""));
  const occurredAt = onDate(dateSchema.parse(formData.get("occurredAt")));
  const [bill, account] = await Promise.all([
    prisma.supplierBill.findFirst({ where: { id: billId, businessId: user.businessId, deletedAt: null }, include: { lines: true, payments: { where: { deletedAt: null, archivedAt: null } } } }),
    prisma.financialAccount.findFirst({ where: { id: accountId, businessId: user.businessId, active: true, deletedAt: null } }),
  ]);
  if (!bill || !account || bill.draft) throw new Error("Bill or account not found.");
  const remaining = Number(bill.total) - bill.payments.reduce((sum, item) => sum + Number(item.amount), 0);
  if (Number(amount) > remaining + 0.001) throw new Error("Payment exceeds the bill balance.");
  const category = bill.lines[0];
  const transaction = await prisma.financialTransaction.create({ data: {
    businessId: user.businessId, type: "BILL_PAYMENT", accountId: account.id, categoryId: category?.categoryId, vendorId: bill.vendorId, billId: bill.id,
    accountNameSnapshot: account.name, categoryNameSnapshot: category?.categoryNameSnapshot, vendorNameSnapshot: bill.vendorNameSnapshot,
    amount, currency: bill.currency, occurredAt, description: `Payment for ${bill.billNumber || bill.vendorNameSnapshot}`, createdById: user.id,
  } });
  await audit(user, "financial.bill.payment", "FinancialTransaction", transaction.id, { billId, amount });
  refresh();
}

export async function createRecurringBill(formData: FormData) {
  const user = await requireBusinessPermission("financial.manage");
  const vendorId = String(formData.get("vendorId") || "");
  const categoryId = String(formData.get("categoryId") || "");
  const [vendor, category] = await Promise.all([
    prisma.vendor.findFirst({ where: { id: vendorId, businessId: user.businessId, active: true, deletedAt: null } }),
    prisma.financialCategory.findFirst({ where: { id: categoryId, businessId: user.businessId, type: "EXPENSE", active: true, deletedAt: null } }),
  ]);
  if (!vendor || !category) throw new Error("Choose an active vendor and category.");
  await prisma.recurringBillTemplate.create({ data: {
    businessId: user.businessId, vendorId: vendor.id, vendorNameSnapshot: vendor.name, categoryId: category.id, categoryNameSnapshot: category.name,
    description: z.string().trim().min(1).max(300).parse(formData.get("description")), amount: amountSchema.parse(String(formData.get("amount") || "")),
    frequency: z.enum(["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]).parse(formData.get("frequency")), nextIssueDate: onDate(dateSchema.parse(formData.get("nextIssueDate"))),
    dueAfterDays: z.coerce.number().int().min(0).max(365).parse(formData.get("dueAfterDays") || 0),
  } });
  refresh();
}

export async function createCustomerInvoice(appointmentId: string, formData: FormData) {
  const user = await requireBusinessPermission("financial.manage");
  const appointment = await prisma.appointment.findFirst({ where: { id: appointmentId, businessId: user.businessId, status: "COMPLETED", deletedAt: null }, include: { customer: true, actualServiceLines: true, invoices: true } });
  if (!appointment?.finalPrice) throw new Error("Only finalized appointments can be invoiced.");
  const dueInput = text(formData.get("dueDate"), 10);
  const invoice = await prisma.$transaction(async (tx) => {
    const settings = await tx.businessSettings.update({ where: { businessId: user.businessId }, data: { nextInvoiceNumber: { increment: 1 } } });
    const business = await tx.business.findUniqueOrThrow({ where: { id: user.businessId } });
    return tx.customerInvoice.create({ data: {
      businessId: user.businessId, appointmentId, invoiceNumber: settings.nextInvoiceNumber - 1, invoicePrefix: settings.invoicePrefix,
      revision: appointment.invoices.length + 1, businessSnapshot: { name: business.name, address: settings.address, email: settings.publicEmail, phone: settings.publicPhone },
      customerSnapshot: { name: customerName(appointment.customer), email: appointment.customer.email, phone: appointment.customer.phone },
      serviceSnapshot: appointment.actualServiceLines.map((line) => ({ name: line.serviceNameSnapshot, amount: String(line.finalPrice) })),
      amount: String(appointment.finalPrice), currency: appointment.currency, issueDate: new Date(), dueDate: dueInput ? onDate(dateSchema.parse(dueInput)) : null, notes: text(formData.get("notes"), 500) || null,
    } });
  }, { isolationLevel: "Serializable" });
  await audit(user, "financial.invoice.create", "CustomerInvoice", invoice.id, { appointmentId, invoiceNumber: invoice.invoiceNumber });
  refresh();
}

export async function updateFinancialRetention(formData: FormData) {
  const user = await requireBusinessPermission("business.manage");
  if (user.membership.role !== "OWNER" && !user.elevated) throw new Error("Only the owner can change financial retention.");
  const financialRetentionDays = z.coerce.number().int().min(7).max(3650).parse(formData.get("financialRetentionDays"));
  await prisma.businessSettings.update({ where: { businessId: user.businessId }, data: { financialRetentionDays } });
  await audit(user, "financial.retention.update", "BusinessSettings", user.businessId, { financialRetentionDays });
  refresh();
}

export async function moveFinancialToTrash(type: "transaction" | "bill" | "invoice" | "account" | "category" | "vendor", id: string) {
  const user = await requireBusinessPermission("financial.manage");
  await requireBusinessPermission("trash.manage");
  const now = new Date();
  const purgeAt = addDays(now, Math.max(7, user.settings?.financialRetentionDays || 2190));
  const where = { id, businessId: user.businessId, deletedAt: null };
  const model = type === "transaction" ? prisma.financialTransaction : type === "bill" ? prisma.supplierBill : type === "invoice" ? prisma.customerInvoice : type === "account" ? prisma.financialAccount : type === "category" ? prisma.financialCategory : prisma.vendor;
  const result = await (model as typeof prisma.financialTransaction).updateMany({ where, data: { deletedAt: now, purgeAt } });
  if (!result.count) throw new Error("Financial record not found.");
  await audit(user, "financial.record.trash", type, id, { purgeAt });
  refresh();
}

export async function restoreFinancialRecord(type: "transaction" | "bill" | "invoice" | "account" | "category" | "vendor", id: string) {
  const user = await requireBusinessPermission("financial.manage");
  await requireBusinessPermission("trash.manage");
  const model = type === "transaction" ? prisma.financialTransaction : type === "bill" ? prisma.supplierBill : type === "invoice" ? prisma.customerInvoice : type === "account" ? prisma.financialAccount : type === "category" ? prisma.financialCategory : prisma.vendor;
  const result = await (model as typeof prisma.financialTransaction).updateMany({ where: { id, businessId: user.businessId, deletedAt: { not: null }, archivedAt: null }, data: { deletedAt: null, purgeAt: null } });
  if (!result.count) throw new Error("This record can no longer be restored.");
  await audit(user, "financial.record.restore", type, id);
  refresh();
}

export async function bulkMoveFinancialToTrash(type: "transaction" | "bill" | "invoice" | "account" | "category" | "vendor", formData: FormData) {
  const user = await requireBusinessPermission("financial.manage");
  await requireBusinessPermission("trash.manage");
  const ids = z.array(z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/)).min(1).max(5000).parse(JSON.parse(String(formData.get("ids") || "[]")));
  const now = new Date();
  const purgeAt = addDays(now, Math.max(7, user.settings.financialRetentionDays));
  const where = { id: { in: [...new Set(ids)] }, businessId: user.businessId, deletedAt: null };
  const data = { deletedAt: now, purgeAt };
  const count = await prisma.$transaction(async (tx) => {
    let changed = 0;
    if (type === "transaction") changed = (await tx.financialTransaction.updateMany({ where, data })).count;
    else if (type === "bill") changed = (await tx.supplierBill.updateMany({ where, data })).count;
    else if (type === "invoice") changed = (await tx.customerInvoice.updateMany({ where, data })).count;
    else if (type === "account") changed = (await tx.financialAccount.updateMany({ where, data })).count;
    else if (type === "category") changed = (await tx.financialCategory.updateMany({ where, data })).count;
    else changed = (await tx.vendor.updateMany({ where, data })).count;
    if (changed !== new Set(ids).size) throw new Error("Some selected records changed. Refresh and try again.");
    return changed;
  });
  await audit(user, "financial.record.bulk-trash", type, "bulk", { count, purgeAt });
  refresh();
}
