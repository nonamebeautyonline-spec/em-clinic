// app/api/admin/patientbundle/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Patient = { id: string; name: string; phone: string } | null;

type IntakeItem = {
  submittedAt: string;
  doctorNote?: string;
  record: Record<string, any>;
};

type KarteNote = { at: string; text: string };

type HistoryItem = {
  paidAt: string;
  productName: string;
  amount: number;
  paymentId: string;
};

export async function GET(req: NextRequest) {
  try {
    const patientId = (req.nextUrl.searchParams.get("patientId") || "").trim();
    const fallbackKey = (req.nextUrl.searchParams.get("fallbackKey") || "").trim();

    if (!patientId && !fallbackKey) {
      return NextResponse.json(
        { ok: false, message: "missing_patientId_or_fallbackKey" },
        { status: 400 }
      );
    }

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
      body: JSON.stringify({
        apiKey: KARTE_API_KEY,
        type: "getPatientBundle",
        patientId: patientId || undefined,
        fallbackKey: fallbackKey || undefined,
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

    const payload = {
      ok: true,
      patient: (data.patient ?? null) as Patient,
      intakes: (data.intakes ?? []) as IntakeItem[],
      karteNotes: (data.karteNotes ?? []) as KarteNote[],
      history: (data.history ?? []) as HistoryItem[],
    };

    return NextResponse.json(payload);
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: "server_error", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
