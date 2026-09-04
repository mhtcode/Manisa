"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireBusinessPermission } from "@/lib/auth";
import { paymentStatusFor } from "@/lib/payments";
import { prisma } from "@/lib/prisma";

const methodSchema = z.object({ name: z.string().trim().min(1).max(80), icon: z.enum(["banknote", "credit-card", "landmark", "wallet"]), active: z.preprocess((value) => value === "on", z.boolean()) });
const money = z.string().regex(/^\d{1,10}(\.\d{1,2})?$/).refine((value) => Number(value) > 0, "Payment amount must be positive.");

function refreshFinance(appointmentId?: string) {
  revalidatePath("/report");
  revalidatePath("/settings/financial");
  revalidatePath("/appointments");
  if (appointmentId) revalidatePath(`/appointments/${appointmentId}`);
}

export async function createPaymentMethod(formData: FormData) {
  const user = await requireBusinessPermission("payments.manage");
  const data = methodSchema.parse(Object.fromEntries(formData));
  const position = await prisma.paymentMethod.count({ where: { businessId: user.businessId, deletedAt: null } });
  await prisma.paymentMethod.create({ data: { ...data, businessId: user.businessId, position } });
  revalidatePath("/settings/financial");
}

export async function updatePaymentMethod(id: string, formData: FormData) {
  const user = await requireBusinessPermission("payments.manage");
  const data = methodSchema.parse(Object.fromEntries(formData));
  await prisma.paymentMethod.update({ where: { id, businessId: user.businessId, deletedAt: null }, data });
  revalidatePath("/settings/financial");
}

export async function movePaymentMethodToTrash(id: string) {
  const user = await requireBusinessPermission("payments.manage");
  await prisma.paymentMethod.update({ where: { id, businessId: user.businessId, deletedAt: null }, data: { deletedAt: new Date(), active: false } });
  revalidatePath("/settings/financial");
  revalidatePath("/settings/trash");
}

export async function movePaymentMethod(id: string, direction: "up" | "down") {
  const user = await requireBusinessPermission("payments.manage");
  const methods = await prisma.paymentMethod.findMany({ where: { businessId: user.businessId, deletedAt: null }, orderBy: [{ position: "asc" }, { name: "asc" }] });
  const index = methods.findIndex((item) => item.id === id); const other = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || other < 0 || other >= methods.length) return;
  await prisma.$transaction([prisma.paymentMethod.update({ where: { id }, data: { position: methods[other].position } }), prisma.paymentMethod.update({ where: { id: methods[other].id }, data: { position: methods[index].position } })]);
  revalidatePath("/settings/financial");
}

export async function addAppointmentPayment(appointmentId: string, formData: FormData) {
  const user = await requireBusinessPermission("payments.manage");
  const methodId = String(formData.get("paymentMethodId") || "");
  const amount = money.parse(String(formData.get("amount") || ""));
  const note = String(formData.get("note") || "").trim().slice(0, 500) || null;
  const appointment = await prisma.appointment.findFirst({ where: { id: appointmentId, businessId: user.businessId, deletedAt: null, status: "COMPLETED" }, include: { payments: { where: { voidedAt: null } } } });
  const method = await prisma.paymentMethod.findFirst({ where: { id: methodId, businessId: user.businessId, active: true, deletedAt: null } });
  if (!appointment?.finalPrice || !method) throw new Error("Appointment or payment method not found.");
  const existing = appointment.payments.reduce((sum, item) => sum + Number(item.amount), 0);
  if (existing + Number(amount) > Number(appointment.finalPrice) + 0.001) throw new Error("Payment exceeds the outstanding balance.");
  await prisma.$transaction(async (tx) => {
    await tx.appointmentPayment.create({ data: { businessId: user.businessId, appointmentId, paymentMethodId: method.id, methodNameSnapshot: method.name, amount, note, recordedById: user.id } });
    const total = existing + Number(amount);
    await tx.appointment.update({ where: { id: appointmentId }, data: { paymentStatus: paymentStatusFor(Number(appointment.finalPrice), total), paymentReconciliationRequired: false } });
  });
  refreshFinance(appointmentId);
}

export async function updateAppointmentPayment(paymentId: string, formData: FormData) {
  const user = await requireBusinessPermission("payments.manage");
  const methodId = String(formData.get("paymentMethodId") || "");
  const amount = money.parse(String(formData.get("amount") || ""));
  const payment = await prisma.appointmentPayment.findFirst({ where: { id: paymentId, businessId: user.businessId, voidedAt: null }, include: { appointment: { include: { payments: { where: { voidedAt: null } } } } } });
  const method = await prisma.paymentMethod.findFirst({ where: { id: methodId, businessId: user.businessId, active: true, deletedAt: null } });
  if (!payment?.appointment.finalPrice || !method) throw new Error("Payment or method not found.");
  const otherTotal = payment.appointment.payments.filter((item) => item.id !== payment.id).reduce((sum, item) => sum + Number(item.amount), 0);
  if (otherTotal + Number(amount) > Number(payment.appointment.finalPrice) + 0.001) throw new Error("Payment exceeds the outstanding balance.");
  await prisma.$transaction([
    prisma.appointmentPayment.update({ where: { id: payment.id }, data: { amount, paymentMethodId: method.id, methodNameSnapshot: method.name } }),
    prisma.appointment.update({ where: { id: payment.appointmentId }, data: { paymentStatus: paymentStatusFor(Number(payment.appointment.finalPrice), otherTotal + Number(amount)), paymentReconciliationRequired: false } }),
  ]);
  refreshFinance(payment.appointmentId);
}

export async function voidAppointmentPayment(paymentId: string, formData: FormData) {
  const user = await requireBusinessPermission("payments.manage");
  const reason = z.string().trim().min(3).max(300).parse(formData.get("voidReason"));
  const payment = await prisma.appointmentPayment.findFirst({ where: { id: paymentId, businessId: user.businessId, voidedAt: null }, include: { appointment: { include: { payments: { where: { voidedAt: null } } } } } });
  if (!payment?.appointment.finalPrice) throw new Error("Payment or appointment not found.");
  const remaining = payment.appointment.payments.filter((item) => item.id !== payment.id).reduce((sum, item) => sum + Number(item.amount), 0);
  await prisma.$transaction([
    prisma.appointmentPayment.update({ where: { id: payment.id }, data: { voidedAt: new Date(), voidReason: reason } }),
    prisma.appointment.update({ where: { id: payment.appointmentId }, data: { paymentStatus: paymentStatusFor(Number(payment.appointment.finalPrice), remaining), paymentReconciliationRequired: false } }),
  ]);
  refreshFinance(payment.appointmentId);
}

export async function openFinancialAppointment(appointmentId: string) { redirect(`/appointments/${appointmentId}#payments`); }
