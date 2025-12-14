import { NextRequest, NextResponse } from "next/server";

const GAS_ADMIN_URL = process.env.GAS_ADMIN_URL!;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN!;

function ok(code: string = "OK") {
  return NextResponse.json({ ok: true, code }, { status: 200 });
}
function fail(code: string, status: number = 500) {
  return NextResponse.json({ ok: false, code }, { status });
}

async function postToGas(type: string, body: any) {
  const res = await fetch(GAS_ADMIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, token: ADMIN_TOKEN, ...body }),
    cache: "no-store",
  });

  // 上流本文は読んでも「返さない」
  const text = await res.text().catch(() => "");
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }

  return { httpOk: res.ok, ok: Boolean(json?.ok) };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const r = await postToGas("upsertOverride", body);
  if (!r.httpOk || !r.ok) return fail("GAS_ERROR", 500);
  return ok("UPSERT_OVERRIDE_OK");
}

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const r = await postToGas("deleteOverride", body);
  if (!r.httpOk || !r.ok) return fail("GAS_ERROR", 500);
  return ok("DELETE_OVERRIDE_OK");
}
