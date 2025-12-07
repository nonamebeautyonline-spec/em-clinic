// app/api/register/complete/route.ts
import { NextRequest, NextResponse } from "next/server";

// ここで GAS Web アプリ or 内部API を叩いて
// phone -> PID を解決するイメージ
async function findOrCreatePatientIdByPhone(phone: string): Promise<string> {
  // 例: GAS 側に POST して PID を返してもらう
  const gasUrl = process.env.GAS_REGISTER_URL!;
  const res = await fetch(gasUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  if (!res.ok) {
    throw new Error("GAS register API error");
  }
  const data = (await res.json()) as { pid: string };
  return data.pid;
}

export async function POST(req: NextRequest) {
  try {
    const { phone } = (await req.json()) as { phone?: string };
    if (!phone) {
      return NextResponse.json({ error: "phone is required" }, { status: 400 });
    }

    const pid = await findOrCreatePatientIdByPhone(phone);
    return NextResponse.json({ pid });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message || "register failed" },
      { status: 500 }
    );
  }
}
