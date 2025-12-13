import { NextRequest, NextResponse } from "next/server";

const GAS_ADMIN_URL = process.env.GAS_ADMIN_URL!;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN!;

export async function POST(req: NextRequest) {
  const body = await req.json();

  const res = await fetch(GAS_ADMIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "upsertWeeklyRules", token: ADMIN_TOKEN, ...body }),
    cache: "no-store",
  });

  const text = await res.text();
  console.log("GAS upsertWeeklyRules raw:", text);

  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: "GAS HTTP error", status: res.status, detail: text },
      { status: 500 }
    );
  }

  if (!text || !text.trim()) {
    return NextResponse.json(
      { ok: false, error: "Empty response from GAS" },
      { status: 500 }
    );
  }

  let json: any = {};
  try {
    json = JSON.parse(text);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "GAS returned non-JSON", detail: text },
      { status: 500 }
    );
  }

  return NextResponse.json(json, { status: json?.ok ? 200 : 500 });
}
