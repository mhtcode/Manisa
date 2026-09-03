"use server";

import argon2 from "argon2";
import { redirect } from "next/navigation";
import { createSession, destroySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation";

export type LoginState = { error?: string };

export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter a valid email and password." };
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !user.active || !(await argon2.verify(user.passwordHash, parsed.data.password))) {
    return { error: "The email or password is incorrect." };
  }
  await createSession(user.id);
  redirect("/report");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
