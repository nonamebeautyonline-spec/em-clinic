// app/api/doctor/reorders/route.ts
import { NextRequest, NextResponse } from "next/server";

const GAS_REORDER_URL = process.env.GAS_REORDER_URL;

export async function GET(req: NextRequest) {
  try {
    if (!GAS_REORDER_URL) {
      return NextResponse.json(
        { ok: false, error: "GAS_REORDER_URL not configured" },
        { status: 500 }
      );
    }

    const res = await fetch(GAS_REORDER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // とりあえず pending のみ。全件見たいなら include_all: true
      body: JSON.stringify({ action: "listAll", include_all: false }),
      cache: "no-store",
    });

    const text = await res.text();
    let json: any = {};
    try {
      json = JSON.parse(text);
    } catch {
      json = {};
    }

    if (!res.ok || json.ok === false) {
      return NextResponse.json(
        { ok: false, error: json.error || "GAS error" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, reorders: json.reorders ?? [] },
      { status: 200 }
    );
  } catch (e) {
    console.error("GET /api/doctor/reorders error", e);
    return NextResponse.json(
      { ok: false, error: "unexpected error" },
      { status: 500 }
    );
  }
}
