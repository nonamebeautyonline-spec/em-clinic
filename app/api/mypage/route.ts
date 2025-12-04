// app/api/mypage/route.ts
import { NextRequest, NextResponse } from "next/server";

const GAS_DASHBOARD_ENDPOINT = process.env.GAS_DASHBOARD_ENDPOINT!;
// 例: "https://script.google.com/macros/s/xxx/exec"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const customerId: string = body.customer_id || body.lineId || "";
    const name: string = body.name || "";

    if (!customerId) {
      return NextResponse.json(
        { ok: false, error: "customer_id required" },
        { status: 400 }
      );
    }

    const params = new URLSearchParams();
    params.set("type", "getDashboard");
    params.set("lineId", customerId);
    if (name) params.set("name", name);

    const url = `${GAS_DASHBOARD_ENDPOINT}?${params.toString()}`;

    const gasRes = await fetch(url, {
      method: "GET",
      // キャッシュさせたくない
      cache: "no-store",
    });

    if (!gasRes.ok) {
      const text = await gasRes.text();
      console.error("GAS getDashboard error:", text);
      return NextResponse.json(
        { ok: false, error: "GAS request failed" },
        { status: 500 }
      );
    }

    const dashboard = await gasRes.json();

    // そのままフロントへ返す（構造は PatientDashboardData と合わせてある）
    return NextResponse.json(dashboard, { status: 200 });
  } catch (err) {
    console.error("api/mypage error:", err);
    return NextResponse.json(
      { ok: false, error: "internal error" },
      { status: 500 }
    );
  }
}
