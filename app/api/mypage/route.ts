// app/api/mypage/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const GAS_MYPAGE_URL = process.env.GAS_MYPAGE_URL;

// GAS 側から返ってくる型（ざっくり）
type GasDashboardResponse = {
  patient?: {
    id: string;
    displayName: string;
  };
  nextReservation?: {
    id: string;
    datetime: string;
    title: string;
    status: string;
  } | null;
  activeOrders?: any[];
  history?: any[];
};

export async function POST(req: NextRequest) {
  try {
    if (!GAS_MYPAGE_URL) {
      return NextResponse.json(
        { ok: false, error: "GAS_MYPAGE_URL is not configured." },
        { status: 500 }
      );
    }

    // cookie から patient_id を取得（/api/mypage/profile と同じ）
    const cookieStore = await cookies();
    const patientId = cookieStore.get("patient_id")?.value;

    if (!patientId) {
      return NextResponse.json(
        { ok: false, error: "unauthorized: patient_id cookie not found" },
        { status: 401 }
      );
    }

    // （body は無視してOK。patient_id だけで判定する）
    // const body = await req.json().catch(() => ({}));

    // GAS の getDashboard を patient_id ベースで叩く
    const url =
      GAS_MYPAGE_URL +
      `?type=getDashboard&patient_id=${encodeURIComponent(patientId)}`;

    const gasRes = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    if (!gasRes.ok) {
      const text = await gasRes.text().catch(() => "");
      console.error("GAS getDashboard error:", gasRes.status, text);
      return NextResponse.json(
        { ok: false, error: "failed to fetch dashboard from GAS" },
        { status: 500 }
      );
    }

    const gasJson = (await gasRes.json()) as GasDashboardResponse;

    // PatientDashboardInner がそのまま食べられる形で返す
    return NextResponse.json(
      {
        ok: true,
        patient: gasJson.patient,
        nextReservation: gasJson.nextReservation ?? null,
        activeOrders: gasJson.activeOrders ?? [],
        history: gasJson.history ?? [],
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("POST /api/mypage error:", err);
    return NextResponse.json(
      { ok: false, error: "unexpected error" },
      { status: 500 }
    );
  }
}
