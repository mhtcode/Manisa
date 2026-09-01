"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function updateSettings(formData: FormData) {
  const user = await requireUser();
  const locale = formData.get("locale") === "fa" ? "fa" : "en";
  const themeValue = String(formData.get("theme"));
  const theme = themeValue === "LIGHT" || themeValue === "SYSTEM" ? themeValue : "DARK";
  const businessName = String(formData.get("businessName") || "Manisa").trim().slice(0, 120);
  const currency = String(formData.get("currency") || "CAD").toUpperCase().slice(0, 3);
  await prisma.settings.upsert({ where: { userId: user.id }, create: { userId: user.id, locale, theme, businessName, currency }, update: { locale, theme, businessName, currency } });
  (await cookies()).set("manisa_locale", locale, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 31536000 });
  (await cookies()).set("manisa_theme", theme.toLowerCase(), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 31536000 });
  revalidatePath("/", "layout");
}
