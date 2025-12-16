// app/api/admin/kartesearch/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Candidate = {
  patientId: string;
  fallbackKey: string;
  name: string;
  phone: string;
  lastSubmittedAt: string;
};

export async function GET(req: NextRequest) {
  try {
    const q = (req.nextUrl.searchParams.get("q") || "").trim();
    if (!q) return NextResponse.json({ ok: true, candidates: [] as Candidate[] });

    const GAS_KARTE_URL = process.env.GAS_KARTE_URL;
    const KARTE_API_KEY = process.env.KARTE_API_KEY;

    if (!GAS_KARTE_URL || !KARTE_API_KEY) {
      return NextResponse.json(
        { ok: false, message: "env_not_set" },
        { status: 500 }
      );
    }

    const res = await fetch(GAS_KARTE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // GAS側に apiKey を body で渡す
      body: JSON.stringify({
        apiKey: KARTE_API_KEY,
        type: "searchPatients",
        q,
      }),
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);

    if (!data || data.ok !== true) {
      return NextResponse.json(
        { ok: false, message: "gas_error", data },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, candidates: data.candidates ?? [] });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: "server_error", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
