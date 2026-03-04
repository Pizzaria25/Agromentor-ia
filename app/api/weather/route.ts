import { NextResponse } from "next/server";
import { getForecast } from "@/lib/weather";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const location = url.searchParams.get("location") || "";
  const fc = await getForecast(location);
  if (!fc) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json(fc);
}
