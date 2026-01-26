// app/api/intake/list/route.ts
import { NextResponse } from "next/server";

const LIST_URL = process.env.GAS_INTAKE_LIST_URL as string;

export async function GET(req: Request) {
  try {
    if (!LIST_URL) {
      console.error("GAS_INTAKE_LIST_URL is not set");
      return NextResponse.json(
        { ok: false, error: "LIST_URL not set" },
        { status: 500 }
      );
    }

    // クエリパラメータを取得
    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");

    // GASにクエリパラメータを渡す
    let gasUrl = LIST_URL;
    if (fromDate || toDate) {
      const params = new URLSearchParams();
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      gasUrl = `${LIST_URL}?${params.toString()}`;
    }

    const res = await fetch(gasUrl, {
      method: "GET",
    });

    const text = await res.text();
    console.log("intake list raw:", text.slice(0, 200));

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
