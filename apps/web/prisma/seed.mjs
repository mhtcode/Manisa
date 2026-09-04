import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD;

const businessName =
  process.env.SEED_BUSINESS_NAME?.trim() || "Manisa";

const businessSlug =
  process.env.SEED_BUSINESS_SLUG?.trim() || "manisa";

const businessAddress =
  process.env.SEED_BUSINESS_ADDRESS?.trim() || null;

const instagramUrl =
  process.env.SEED_INSTAGRAM_URL?.trim() || null;

// Fake customers/appointments should be opt-in.
// Keep this false in production.
const seedDemoData =
  (process.env.SEED_DEMO_DATA ?? "false").toLowerCase() === "true";

if (!email) {
  throw new Error("Set SEED_ADMIN_EMAIL before seeding.");
}

const names = [
  ["Maryam", "Rahimi", "fa"],
  ["سارا", "احمدی", "fa"],
  ["Nadia", "Karimi", "en"],
  ["Leila", "Moradi", "fa"],
  ["Emma", "Wilson", "en"],
  ["Sophia", "Martin", "en"],
  ["نگار", "رضایی", "fa"],
  ["Olivia", "Brown", "en"],
];

async function ensureAdminUser() {
  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    /*
     * Important:
     * Do not overwrite the admin password every time the init
     * container runs.
     */
    if (!existing.passwordHash) {
      if (!password || password.length < 12) {
        throw new Error(
          "The seeded admin exists without a password. " +
            "Set SEED_ADMIN_PASSWORD to at least 12 characters.",
        );
      }

      const passwordHash = await argon2.hash(password, {
        type: argon2.argon2id,
      });

      return prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          active: true,
        },
      });
    }

    return prisma.user.update({
      where: { id: existing.id },
      data: {
        active: true,
      },
    });
  }

  if (!password || password.length < 12) {
    throw new Error(
      "Set SEED_ADMIN_PASSWORD to at least 12 characters " +
        "when creating the initial admin.",
    );
  }

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
  });

  return prisma.user.create({
    data: {
      email,
      name: "Manisa Administrator",
      passwordHash,
      active: true,
    },
  });
}

async function main() {
  console.log("Starting Manisa database seed...");

  /*
   * -------------------------------------------------------
   * 1. Admin user
   * -------------------------------------------------------
   */

  const user = await ensureAdminUser();

  /*
   * UserPreference is the Prisma model name.
   *
   * @@map("Settings")
   *
   * only changes the PostgreSQL table name.
   */
  await prisma.userPreference.upsert({
    where: {
      userId: user.id,
    },
    update: {},
    create: {
      userId: user.id,
    },
  });

  /*
   * -------------------------------------------------------
   * 2. Business
   * -------------------------------------------------------
   */

  const business = await prisma.business.upsert({
    where: {
      slug: businessSlug,
    },

    update: {
      name: businessName,
      template: "NAIL_HAIR",
      active: true,
      deletedAt: null,
    },

    create: {
      name: businessName,
      slug: businessSlug,
      template: "NAIL_HAIR",
      active: true,
      primaryOwnerId: user.id,
    },
  });

  console.log(
    `Business ready: ${business.name} (${business.id})`,
  );

  /*
   * -------------------------------------------------------
   * 3. Give admin access to the business
   * -------------------------------------------------------
   */

  const membership =
    await prisma.businessMembership.upsert({
      where: {
        userId_businessId: {
          userId: user.id,
          businessId: business.id,
        },
      },

      update: {
        role: "OWNER",
        active: true,
        deletedAt: null,
      },

      create: {
        userId: user.id,
        businessId: business.id,
        role: "OWNER",
        active: true,
      },
    });

  await prisma.membershipPreference.upsert({
    where: {
      membershipId: membership.id,
    },

    update: {},

    create: {
      membershipId: membership.id,
    },
  });

  /*
   * -------------------------------------------------------
   * 4. Business settings
   * -------------------------------------------------------
   */

  await prisma.businessSettings.upsert({
    where: {
      businessId: business.id,
    },

    update: {
      currency: "CAD",
      timezone: "America/Toronto",

      ...(businessAddress
        ? { address: businessAddress }
        : {}),

      ...(instagramUrl
        ? { instagramUrl }
        : {}),
    },

    create: {
      businessId: business.id,
      currency: "CAD",
      timezone: "America/Toronto",
      address: businessAddress,
      instagramUrl,
    },
  });

  /*
   * -------------------------------------------------------
   * 5. Payment methods
   * -------------------------------------------------------
   */

  const paymentMethods = [
    {
      id: "payment_method_cash",
      name: "Cash",
      icon: "banknote",
      position: 0,
      active: true,
    },
    {
      id: "payment_method_debit",
      name: "Debit card",
      icon: "credit-card",
      position: 1,
      active: true,
    },
    {
      id: "payment_method_credit",
      name: "Credit card",
      icon: "credit-card",
      position: 2,
      active: true,
    },
    {
      id: "payment_method_etransfer",
      name: "Interac e-Transfer",
      icon: "landmark",
      position: 3,
      active: true,
    },
    {
      id: "payment_method_other",
      name: "Other",
      icon: "wallet",
      position: 4,
      active: true,
    },
  ];

  const paymentMethodByName = new Map();

  for (const method of paymentMethods) {
    const { id, ...values } = method;

    const seeded =
      await prisma.paymentMethod.upsert({
        where: {
          id,
        },

        update: {
          ...values,

          // REQUIRED by the new schema
          businessId: business.id,

          deletedAt: null,
        },

        create: {
          id,
          ...values,

          // REQUIRED by the new schema
          businessId: business.id,
        },
      });

    paymentMethodByName.set(
      seeded.name,
      seeded,
    );
  }

  /*
   * -------------------------------------------------------
   * 6. Categories
   * -------------------------------------------------------
   */

  const categories = [
    {
      id: "studio_category_nail",
      slug: "nail",
      name: "Nail studio",
      description:
        "Manicure, extensions, gel systems, strengthening, and nail art",
      icon: "nail",
      accentColor: "#A78BFA",
      position: 0,
    },
    {
      id: "studio_category_hair",
      slug: "hair",
      name: "Hair studio",
      description:
        "Cuts, styling, custom color, balayage, and restorative treatments",
      icon: "scissors",
      accentColor: "#38BDF8",
      position: 1,
    },
    {
      id: "studio_category_other",
      slug: "other",
      name: "Other services",
      description:
        "Additional services outside the main studio catalog",
      icon: "sparkles",
      accentColor: "#64748B",
      position: 2,
    },
  ];

  const categoryById = new Map();

  for (const category of categories) {
    const { id, ...values } = category;

    const seeded =
      await prisma.studioCategory.upsert({
        where: {
          id,
        },

        update: {
          ...values,
          businessId: business.id,
          active: true,
          deletedAt: null,
        },

        create: {
          id,
          ...values,
          businessId: business.id,
          active: true,
        },
      });

    categoryById.set(id, seeded);
  }

  /*
   * -------------------------------------------------------
   * 7. Services
   * -------------------------------------------------------
   */

  const serviceCatalog = [
    {
      id: "seed_nail_manicure",
      name: "مانیکور روسی",
      description:
        "Russian manicure and detailed cuticle preparation",
      categoryId: "studio_category_nail",
      defaultDurationMinutes: 60,
      defaultPrice: "55.00",
      supportsColor: false,
    },

    {
      id: "seed_nail_gel_polish",
      name: "ژلیش دست",
      description:
        "Gel polish for natural fingernails",
      categoryId: "studio_category_nail",
      defaultDurationMinutes: 60,
      defaultPrice: "65.00",
      supportsColor: true,
    },

    {
      id: "seed_nail_acrylic",
      name: "کاشت پودر (اکریلیک)",
      description:
        "Full acrylic nail extension set",
      categoryId: "studio_category_nail",
      defaultDurationMinutes: 120,
      defaultPrice: "110.00",
      supportsColor: true,
    },

    {
      id: "seed_nail_polygel",
      name: "کاشت ژل و پلی‌ژل",
      description:
        "Flexible gel or polygel nail extension set",
      categoryId: "studio_category_nail",
      defaultDurationMinutes: 120,
      defaultPrice: "120.00",
      supportsColor: true,
    },

    {
      id: "seed_nail_laminate",
      name: "لمینت و استحکام‌سازی",
      description:
        "Natural nail overlay and strengthening",
      categoryId: "studio_category_nail",
      defaultDurationMinutes: 90,
      defaultPrice: "85.00",
      supportsColor: true,
    },

    {
      id: "seed_nail_refill",
      name: "ترمیم کاشت",
      description:
        "Refill, rebalance, and shape existing extensions",
      categoryId: "studio_category_nail",
      defaultDurationMinutes: 90,
      defaultPrice: "80.00",
      supportsColor: true,
    },

    {
      id: "seed_nail_art",
      name: "طراحی ناخن",
      description:
        "French, chrome, baby boomer, minimalist, or custom nail art",
      categoryId: "studio_category_nail",
      defaultDurationMinutes: 30,
      defaultPrice: "25.00",
      supportsColor: true,
    },

    {
      id: "seed_nail_art_french",
      name: "فرنچ کلاسیک و رنگی",
      description:
        "Classic white, colored, reverse, or micro French finish",
      categoryId: "studio_category_nail",
      defaultDurationMinutes: 30,
      defaultPrice: "25.00",
      supportsColor: true,
    },

    {
      id: "seed_nail_art_chrome",
      name: "کروم و افکت آینه‌ای",
      description:
        "Chrome powder and reflective mirror-effect nail art",
      categoryId: "studio_category_nail",
      defaultDurationMinutes: 30,
      defaultPrice: "30.00",
      supportsColor: true,
    },

    {
      id: "seed_nail_art_baby_boomer",
      name: "بیبی بومر",
      description:
        "Soft gradient French design",
      categoryId: "studio_category_nail",
      defaultDurationMinutes: 45,
      defaultPrice: "35.00",
      supportsColor: true,
    },

    {
      id: "seed_nail_art_minimal",
      name: "طراحی مینیمال و لاین‌آرت",
      description:
        "Fine lines, dots, negative space, and minimalist details",
      categoryId: "studio_category_nail",
      defaultDurationMinutes: 30,
      defaultPrice: "25.00",
      supportsColor: true,
    },

    {
      id: "seed_hair_cut",
      name: "کوتاهی و کوپ مو",
      description:
        "Consultation-led classic or modern haircut",
      categoryId: "studio_category_hair",
      defaultDurationMinutes: 60,
      defaultPrice: "70.00",
      supportsColor: false,
    },

    {
      id: "seed_hair_style",
      name: "براشینگ و حالت‌دهی",
      description:
        "Blow-dry and professional styling",
      categoryId: "studio_category_hair",
      defaultDurationMinutes: 60,
      defaultPrice: "60.00",
      supportsColor: false,
    },

    {
      id: "seed_hair_root",
      name: "رنگ ریشه",
      description:
        "Root color refresh",
      categoryId: "studio_category_hair",
      defaultDurationMinutes: 120,
      defaultPrice: "110.00",
      supportsColor: true,
    },

    {
      id: "seed_hair_full_color",
      name: "رنگ کامل مو",
      description:
        "Full-length custom hair color",
      categoryId: "studio_category_hair",
      defaultDurationMinutes: 180,
      defaultPrice: "180.00",
      supportsColor: true,
    },

    {
      id: "seed_hair_balayage",
      name: "بالیاژ، آمبره و سامبره",
      description:
        "Dimensional lightening and blended color techniques",
      categoryId: "studio_category_hair",
      defaultDurationMinutes: 240,
      defaultPrice: "280.00",
      supportsColor: true,
    },

    {
      id: "seed_hair_keratin",
      name: "کراتین و احیای مو",
      description:
        "Smoothing and restorative hair treatment",
      categoryId: "studio_category_hair",
      defaultDurationMinutes: 210,
      defaultPrice: "250.00",
      supportsColor: false,
    },
  ];

  const services = [];

  for (const data of serviceCatalog) {
    const category =
      categoryById.get(data.categoryId);

    if (!category) {
      throw new Error(
        `Missing seeded category ${data.categoryId}`,
      );
    }

    const { id, ...values } = data;

    const serviceData = {
      ...values,

      // REQUIRED by new schema
      businessId: business.id,

      categoryId: category.id,
      active: true,
      deletedAt: null,
    };

    services.push(
      await prisma.service.upsert({
        where: {
          id,
        },

        update: serviceData,

        create: {
          id,
          ...serviceData,
        },
      }),
    );
  }

  /*
   * -------------------------------------------------------
   * 8. Optional demo data
   * -------------------------------------------------------
   *
   * Do NOT create fake customers in production.
   */

  if (!seedDemoData) {
    console.log(
      "Bootstrap seed completed. " +
        "Demo customers/appointments were skipped " +
        "(SEED_DEMO_DATA != true).",
    );

    return;
  }

  /*
   * -------------------------------------------------------
   * 9. Demo customers
   * -------------------------------------------------------
   */

  const customers = [];

  for (let i = 0; i < names.length; i += 1) {
    const [
      firstName,
      lastName,
      preferredLanguage,
    ] = names[i];

    /*
     * Fixed IDs make the demo portion idempotent.
     */
    const id =
      `seed_customer_${String(i + 1).padStart(2, "0")}`;

    const customerData = {
      businessId: business.id,
      firstName,
      lastName,
      preferredLanguage,

      phone:
        `+1 416 555 01${String(i).padStart(2, "0")}`,

      notes:
        i % 3 === 0
          ? "Prefers afternoon appointments"
          : null,

      active: true,
      deletedAt: null,
    };

    customers.push(
      await prisma.customer.upsert({
        where: {
          id,
        },

        update: customerData,

        create: {
          id,
          ...customerData,
        },
      }),
    );
  }

  const cashPaymentMethod =
    paymentMethodByName.get("Cash");

  if (!cashPaymentMethod) {
    throw new Error(
      "Cash payment method was not seeded.",
    );
  }

  /*
   * -------------------------------------------------------
   * 10. Demo appointments
   * -------------------------------------------------------
   */

  const now = new Date();

  for (let i = -38; i <= 14; i += 2) {
    const appointmentId =
      `seed_appointment_${
        i < 0
          ? `m${Math.abs(i)}`
          : `p${i}`
      }`;

    /*
     * We don't recreate appointments on every
     * docker compose up.
     */
    const existingAppointment =
      await prisma.appointment.findUnique({
        where: {
          id: appointmentId,
        },

        select: {
          id: true,
        },
      });

    if (existingAppointment) {
      continue;
    }

    const customer =
      customers[
        Math.abs(i * 3) %
          customers.length
      ];

    const service =
      services[
        Math.abs(i) %
          services.length
      ];

    const startAt = new Date(now);

    startAt.setDate(
      now.getDate() + i,
    );

    startAt.setHours(
      14 + (Math.abs(i) % 4),
      0,
      0,
      0,
    );

    const past = i < 0;

    const cancelled =
      past && i % 10 === 0;

    const actualDurationMinutes =
      past && !cancelled
        ? service.defaultDurationMinutes +
          (i % 4) * 5
        : null;

    const finalPriceNumber =
      Number(
        service.defaultPrice.toString(),
      ) +
      (i % 3) * 5;

    const finalPrice =
      finalPriceNumber.toFixed(2);

    const paid =
      past &&
      !cancelled &&
      i % 6 !== 0;

    const completedAt =
      past && !cancelled
        ? new Date(
            startAt.getTime() +
              actualDurationMinutes *
                60_000,
          )
        : null;

    await prisma.appointment.create({
      data: {
        id: appointmentId,

        // REQUIRED
        businessId: business.id,

        customerId: customer.id,
        serviceId: service.id,

        serviceNameSnapshot:
          service.name,

        startAt,

        expectedDurationMinutes:
          service.defaultDurationMinutes,

        expectedPrice:
          service.defaultPrice,

        status: past
          ? cancelled
            ? "CANCELLED"
            : "COMPLETED"
          : "SCHEDULED",

        actualDurationMinutes,

        finalPrice:
          past && !cancelled
            ? finalPrice
            : null,

        paymentStatus:
          paid
            ? "PAID"
            : "UNPAID",

        completedAt,

        /*
         * AppointmentService also requires businessId.
         */
        serviceLines: {
          create: {
            businessId:
              business.id,

            serviceId:
              service.id,

            serviceNameSnapshot:
              service.name,

            durationMinutes:
              service.defaultDurationMinutes,

            price:
              service.defaultPrice,
          },
        },

        /*
         * AppointmentActualService also requires businessId.
         */
        actualServiceLines:
          past && !cancelled
            ? {
                create: {
                  businessId:
                    business.id,

                  serviceId:
                    service.id,

                  serviceNameSnapshot:
                    service.name,

                  actualDurationMinutes,

                  finalPrice,
                },
              }
            : undefined,

        /*
         * AppointmentPayment also requires businessId.
         */
        payments: paid
          ? {
              create: {
                businessId:
                  business.id,

                paymentMethodId:
                  cashPaymentMethod.id,

                methodNameSnapshot:
                  cashPaymentMethod.name,

                amount:
                  finalPrice,

                paidAt:
                  completedAt,

                recordedById:
                  user.id,
              },
            }
          : undefined,
      },
    });
  }

  console.log(
    "Bootstrap + demo seed completed successfully.",
  );
}

main()
  .catch((error) => {
    console.error(
      "Seed failed:",
      error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
