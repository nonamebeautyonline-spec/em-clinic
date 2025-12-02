// app/api/intake/list/route.ts
import { NextResponse } from "next/server";

const LIST_URL = process.env.GAS_INTAKE_LIST_URL as string;

export async function GET() {
  try {
    if (!LIST_URL) {
      console.error("GAS_INTAKE_LIST_URL is not set");
      return NextResponse.json(
        { ok: false, error: "LIST_URL not set" },
        { status: 500 }
      );
    }

    const res = await fetch(LIST_URL, {
      method: "GET",
      // doGet の場合は Content-Type いらないがあってもOK
    });

    const text = await res.text();
    console.log("intake list raw:", text);

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: "GAS error", detail: text },
        { status: 500 }
      );
    }

    let rows: any[] = [];
    try {
      rows = JSON.parse(text);
    } catch (e) {
      console.error("JSON parse error:", e);
      return NextResponse.json(
        { ok: false, error: "parse error", detail: String(e) },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, rows });
  } catch (err) {
    console.error("intake list API error:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
