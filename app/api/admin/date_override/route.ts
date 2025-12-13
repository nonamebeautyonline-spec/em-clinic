import { NextRequest, NextResponse } from "next/server";

const GAS_ADMIN_URL = process.env.GAS_ADMIN_URL!;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN!;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(GAS_ADMIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "upsertOverride", token: ADMIN_TOKEN, ...body }),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  return NextResponse.json(json, { status: json?.ok ? 200 : 500 });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const res = await fetch(GAS_ADMIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "deleteOverride", token: ADMIN_TOKEN, ...body }),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  return NextResponse.json(json, { status: json?.ok ? 200 : 500 });
}
