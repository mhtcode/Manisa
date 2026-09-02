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

  const serviceCatalog = [
    { id: "seed_nail_manicure", name: "مانیکور روسی", description: "Russian manicure and detailed cuticle preparation", category: "NAIL", defaultDurationMinutes: 60, defaultPrice: "55.00", supportsColor: false },
    { id: "seed_nail_gel_polish", name: "ژلیش دست", description: "Gel polish for natural fingernails", category: "NAIL", defaultDurationMinutes: 60, defaultPrice: "65.00", supportsColor: true },
    { id: "seed_nail_acrylic", name: "کاشت پودر (اکریلیک)", description: "Full acrylic nail extension set", category: "NAIL", defaultDurationMinutes: 120, defaultPrice: "110.00", supportsColor: true },
    { id: "seed_nail_polygel", name: "کاشت ژل و پلی‌ژل", description: "Flexible gel or polygel nail extension set", category: "NAIL", defaultDurationMinutes: 120, defaultPrice: "120.00", supportsColor: true },
    { id: "seed_nail_laminate", name: "لمینت و استحکام‌سازی", description: "Natural nail overlay and strengthening", category: "NAIL", defaultDurationMinutes: 90, defaultPrice: "85.00", supportsColor: true },
    { id: "seed_nail_refill", name: "ترمیم کاشت", description: "Refill, rebalance, and shape existing extensions", category: "NAIL", defaultDurationMinutes: 90, defaultPrice: "80.00", supportsColor: true },
    { id: "seed_nail_art", name: "طراحی ناخن", description: "French, chrome, baby boomer, minimalist, or custom nail art", category: "NAIL", defaultDurationMinutes: 30, defaultPrice: "25.00", supportsColor: true },
    { id: "seed_nail_art_french", name: "فرنچ کلاسیک و رنگی", description: "Classic white, colored, reverse, or micro French finish", category: "NAIL", defaultDurationMinutes: 30, defaultPrice: "25.00", supportsColor: true },
    { id: "seed_nail_art_chrome", name: "کروم و افکت آینه‌ای", description: "Chrome powder and reflective mirror-effect nail art", category: "NAIL", defaultDurationMinutes: 30, defaultPrice: "30.00", supportsColor: true },
    { id: "seed_nail_art_baby_boomer", name: "بیبی بومر", description: "Soft gradient French design", category: "NAIL", defaultDurationMinutes: 45, defaultPrice: "35.00", supportsColor: true },
    { id: "seed_nail_art_minimal", name: "طراحی مینیمال و لاین‌آرت", description: "Fine lines, dots, negative space, and minimalist details", category: "NAIL", defaultDurationMinutes: 30, defaultPrice: "25.00", supportsColor: true },
    { id: "seed_hair_cut", name: "کوتاهی و کوپ مو", description: "Consultation-led classic or modern haircut", category: "HAIR", defaultDurationMinutes: 60, defaultPrice: "70.00", supportsColor: false },
    { id: "seed_hair_style", name: "براشینگ و حالت‌دهی", description: "Blow-dry and professional styling", category: "HAIR", defaultDurationMinutes: 60, defaultPrice: "60.00", supportsColor: false },
    { id: "seed_hair_root", name: "رنگ ریشه", description: "Root color refresh", category: "HAIR", defaultDurationMinutes: 120, defaultPrice: "110.00", supportsColor: true },
    { id: "seed_hair_full_color", name: "رنگ کامل مو", description: "Full-length custom hair color", category: "HAIR", defaultDurationMinutes: 180, defaultPrice: "180.00", supportsColor: true },
    { id: "seed_hair_balayage", name: "بالیاژ، آمبره و سامبره", description: "Dimensional lightening and blended color techniques", category: "HAIR", defaultDurationMinutes: 240, defaultPrice: "280.00", supportsColor: true },
    { id: "seed_hair_keratin", name: "کراتین و احیای مو", description: "Smoothing and restorative hair treatment", category: "HAIR", defaultDurationMinutes: 210, defaultPrice: "250.00", supportsColor: false },
  ];
  const services = [];
  for (const data of serviceCatalog) {
    const { id, ...values } = data;
    services.push(await prisma.service.upsert({ where: { id }, update: values, create: data }));
  }

  if (await prisma.customer.count()) return;

  const customers = [];
  for (let i = 0; i < names.length; i += 1) {
    const [firstName, lastName, preferredLanguage] = names[i];
    customers.push(await prisma.customer.create({ data: { firstName, lastName, preferredLanguage, phone: `+1 416 555 01${String(i).padStart(2, "0")}`, notes: i % 3 === 0 ? "Prefers afternoon appointments" : null } }));
  }

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
      serviceLines: { create: { serviceId: service.id, serviceNameSnapshot: service.name, durationMinutes: service.defaultDurationMinutes, price: service.defaultPrice } },
      actualServiceLines: past && !cancelled ? { create: { serviceId: service.id, serviceNameSnapshot: service.name, actualDurationMinutes: service.defaultDurationMinutes + (i % 4) * 5, finalPrice: finalPrice.toFixed(2) } } : undefined,
    } });
  }
}

main().finally(() => prisma.$disconnect());
