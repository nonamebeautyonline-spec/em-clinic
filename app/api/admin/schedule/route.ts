import { NextRequest, NextResponse } from "next/server";

const GAS_ADMIN_URL = process.env.GAS_ADMIN_URL!;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN!;

async function gasPost(payload: any) {
  const res = await fetch(GAS_ADMIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, token: ADMIN_TOKEN }),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!json?.ok) {
    return { ok: false, error: json?.error || "gas_error", detail: json };
  }
  return json;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const doctor_id = searchParams.get("doctor_id") || "";
  const start = searchParams.get("start") || "";
  const end = searchParams.get("end") || "";

  const out = await gasPost({ type: "getScheduleRange", doctor_id, start, end });
  if (!out.ok) return NextResponse.json(out, { status: 500 });
  return NextResponse.json(out);
}
