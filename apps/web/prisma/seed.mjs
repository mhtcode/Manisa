import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;

if (!email || !password || password.length < 12) {
  throw new Error("Set SEED_ADMIN_EMAIL and a SEED_ADMIN_PASSWORD of at least 12 characters before seeding.");
}

const names = [
  ["Maryam", "Rahimi", "fa"], ["سارا", "احمدی", "fa"], ["Nadia", "Karimi", "en"],
  ["Leila", "Moradi", "fa"], ["Emma", "Wilson", "en"], ["Sophia", "Martin", "en"],
  ["نگار", "رضایی", "fa"], ["Olivia", "Brown", "en"],
];

async function main() {
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { passwordHash, active: true },
    create: { email: email.toLowerCase(), name: "Manisa Administrator", passwordHash },
  });
  await prisma.settings.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });

  if (await prisma.customer.count()) return;

  const customers = [];
  for (let i = 0; i < names.length; i += 1) {
    const [firstName, lastName, preferredLanguage] = names[i];
    customers.push(await prisma.customer.create({ data: { firstName, lastName, preferredLanguage, phone: `+1 416 555 01${String(i).padStart(2, "0")}`, notes: i % 3 === 0 ? "Prefers afternoon appointments" : null } }));
  }

  const services = await Promise.all([
    prisma.service.create({ data: { name: "Consultation", description: "Personal consultation session", defaultDurationMinutes: 60, defaultPrice: "95.00" } }),
    prisma.service.create({ data: { name: "خدمات ویژه", description: "جلسه خدمات کامل", defaultDurationMinutes: 90, defaultPrice: "145.00" } }),
    prisma.service.create({ data: { name: "Follow-up", description: "Short follow-up appointment", defaultDurationMinutes: 45, defaultPrice: "70.00" } }),
  ]);

  const now = new Date();
  for (let i = -38; i <= 14; i += 2) {
    const customer = customers[Math.abs(i * 3) % customers.length];
    const service = services[Math.abs(i) % services.length];
    const startAt = new Date(now);
    startAt.setDate(now.getDate() + i);
    startAt.setHours(14 + (Math.abs(i) % 4), 0, 0, 0);
    const past = i < 0;
    const cancelled = past && i % 10 === 0;
    const finalPrice = Number(service.defaultPrice) + (i % 3) * 5;
    await prisma.appointment.create({ data: {
      customerId: customer.id, serviceId: service.id, serviceNameSnapshot: service.name,
      startAt, expectedDurationMinutes: service.defaultDurationMinutes, expectedPrice: service.defaultPrice,
      status: past ? (cancelled ? "CANCELLED" : "COMPLETED") : "SCHEDULED",
      actualDurationMinutes: past && !cancelled ? service.defaultDurationMinutes + (i % 4) * 5 : null,
      finalPrice: past && !cancelled ? finalPrice.toFixed(2) : null,
      paymentStatus: past && !cancelled ? (i % 6 === 0 ? "UNPAID" : "PAID") : "UNPAID",
      completedAt: past && !cancelled ? new Date(startAt.getTime() + service.defaultDurationMinutes * 60_000) : null,
    } });
  }
}

main().finally(() => prisma.$disconnect());
