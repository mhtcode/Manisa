"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { paymentStatusFor } from "@/lib/payments";
import { prisma } from "@/lib/prisma";

const methodSchema = z.object({ name: z.string().trim().min(1).max(80), icon: z.enum(["banknote", "credit-card", "landmark", "wallet"]), active: z.preprocess((value) => value === "on", z.boolean()) });
const money = z.string().regex(/^\d{1,10}(\.\d{1,2})?$/);

function refreshFinance(appointmentId?: string) {
  revalidatePath("/report");
  revalidatePath("/settings/financial");
  revalidatePath("/appointments");
  if (appointmentId) revalidatePath(`/appointments/${appointmentId}`);
}

export async function createPaymentMethod(formData: FormData) {
  await requireUser();
  const data = methodSchema.parse(Object.fromEntries(formData));
  const position = await prisma.paymentMethod.count({ where: { deletedAt: null } });
  await prisma.paymentMethod.create({ data: { ...data, position } });
  revalidatePath("/settings/financial");
}

export async function updatePaymentMethod(id: string, formData: FormData) {
  await requireUser();
  const data = methodSchema.parse(Object.fromEntries(formData));
  await prisma.paymentMethod.update({ where: { id, deletedAt: null }, data });
  revalidatePath("/settings/financial");
}

export async function movePaymentMethodToTrash(id: string) {
  await requireUser();
  await prisma.paymentMethod.update({ where: { id, deletedAt: null }, data: { deletedAt: new Date(), active: false } });
  revalidatePath("/settings/financial");
  revalidatePath("/settings/trash");
}

export async function movePaymentMethod(id: string, direction: "up" | "down") {
  await requireUser();
  const methods = await prisma.paymentMethod.findMany({ where: { deletedAt: null }, orderBy: [{ position: "asc" }, { name: "asc" }] });
  const index = methods.findIndex((item) => item.id === id); const other = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || other < 0 || other >= methods.length) return;
  await prisma.$transaction([prisma.paymentMethod.update({ where: { id }, data: { position: methods[other].position } }), prisma.paymentMethod.update({ where: { id: methods[other].id }, data: { position: methods[index].position } })]);
  revalidatePath("/settings/financial");
}

async function recalculatePaymentStatus(appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId }, select: { finalPrice: true, payments: { where: { voidedAt: null }, select: { amount: true } } } });
  if (!appointment?.finalPrice) throw new Error("Finalized appointment not found.");
  const total = appointment.payments.reduce((sum, item) => sum + Number(item.amount), 0);
  await prisma.appointment.update({ where: { id: appointmentId }, data: { paymentStatus: paymentStatusFor(Number(appointment.finalPrice), total), paymentReconciliationRequired: false } });
}

export async function addAppointmentPayment(appointmentId: string, formData: FormData) {
  const user = await requireUser();
  const methodId = String(formData.get("paymentMethodId") || "");
  const amount = money.parse(String(formData.get("amount") || ""));
  const note = String(formData.get("note") || "").trim().slice(0, 500) || null;
  const appointment = await prisma.appointment.findFirst({ where: { id: appointmentId, deletedAt: null, status: "COMPLETED" }, include: { payments: { where: { voidedAt: null } } } });
  const method = await prisma.paymentMethod.findFirst({ where: { id: methodId, active: true, deletedAt: null } });
  if (!appointment?.finalPrice || !method) throw new Error("Appointment or payment method not found.");
  const existing = appointment.payments.reduce((sum, item) => sum + Number(item.amount), 0);
  if (existing + Number(amount) > Number(appointment.finalPrice) + 0.001) throw new Error("Payment exceeds the outstanding balance.");
  await prisma.$transaction(async (tx) => {
    await tx.appointmentPayment.create({ data: { appointmentId, paymentMethodId: method.id, methodNameSnapshot: method.name, amount, note, recordedById: user.id } });
    const total = existing + Number(amount);
    await tx.appointment.update({ where: { id: appointmentId }, data: { paymentStatus: paymentStatusFor(Number(appointment.finalPrice), total), paymentReconciliationRequired: false } });
  });
  refreshFinance(appointmentId);
}

export async function updateAppointmentPayment(paymentId: string, formData: FormData) {
  await requireUser();
  const methodId = String(formData.get("paymentMethodId") || "");
  const amount = money.parse(String(formData.get("amount") || ""));
  const payment = await prisma.appointmentPayment.findFirst({ where: { id: paymentId, voidedAt: null }, include: { appointment: { include: { payments: { where: { voidedAt: null } } } } } });
  const method = await prisma.paymentMethod.findFirst({ where: { id: methodId, active: true, deletedAt: null } });
  if (!payment?.appointment.finalPrice || !method) throw new Error("Payment or method not found.");
  const otherTotal = payment.appointment.payments.filter((item) => item.id !== payment.id).reduce((sum, item) => sum + Number(item.amount), 0);
  if (otherTotal + Number(amount) > Number(payment.appointment.finalPrice) + 0.001) throw new Error("Payment exceeds the outstanding balance.");
  await prisma.appointmentPayment.update({ where: { id: payment.id }, data: { amount, paymentMethodId: method.id, methodNameSnapshot: method.name } });
  await recalculatePaymentStatus(payment.appointmentId);
  refreshFinance(payment.appointmentId);
}

export async function voidAppointmentPayment(paymentId: string, formData: FormData) {
  await requireUser();
  const reason = z.string().trim().min(3).max(300).parse(formData.get("voidReason"));
  const payment = await prisma.appointmentPayment.update({ where: { id: paymentId, voidedAt: null }, data: { voidedAt: new Date(), voidReason: reason } });
  await recalculatePaymentStatus(payment.appointmentId);
  refreshFinance(payment.appointmentId);
}

export async function openFinancialAppointment(appointmentId: string) { redirect(`/appointments/${appointmentId}#payments`); }
