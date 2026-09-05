import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { processGoogleCalendarJobs } from "@/server/google-calendar";

export async function POST(request: Request) {
  const expected = getServerEnv().GOOGLE_CALENDAR_SYNC_SECRET;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const processed = await processGoogleCalendarJobs(prisma, 20);
  return NextResponse.json({ processed });
}
