import { NextResponse } from "next/server";
import { getPublicBookingAvailability } from "@/server/public-booking";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const result = await getPublicBookingAvailability(query.get("date") || "", (query.get("serviceIds") || "").split(",").filter(Boolean));
  return NextResponse.json(result, { status: result.available ? 200 : 400, headers: { "Cache-Control": "private, no-store" } });
}
