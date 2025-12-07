// app/api/register/complete/route.ts
import { NextRequest, NextResponse } from "next/server";

async function findOrCreatePatientIdByPhoneAndLine(
  phone: string,
  lineUserId: string | null
): Promise<string> {
  const gasUrl = process.env.GAS_REGISTER_URL;
  if (!gasUrl) throw new Error("GAS_REGISTER_URL is not set.");

  const res = await fetch(gasUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone,
      line_user_id: lineUserId,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GAS register API error: ${text}`);
  }

  const data = (await res.json()) as { pid: string };
  if (!data.pid) {
    throw new Error("GAS register API did not return pid.");
  }
  return data.pid;
}

export async function POST(req: NextRequest) {
  try {
    const { phone, lineUserId } = (await req.json()) as {
      phone?: string;
      lineUserId?: string;
    };

    if (!phone) {
      return NextResponse.json(
        { error: "phone is required" },
        { status: 400 }
      );
    }

    // lineUserId が body に入ってなければ cookie から拾う fallback でもOK
    const cookiesLineId =
      req.cookies.get("line_user_id")?.value || undefined;
    const finalLineUserId = lineUserId || cookiesLineId || null;

    const pid = await findOrCreatePatientIdByPhoneAndLine(
      phone,
      finalLineUserId
    );

    return NextResponse.json({ pid });
  } catch (e: any) {
    console.error("register complete error:", e);
    return NextResponse.json(
      {
        error:
          e?.message ||
          "初回登録処理に失敗しました。時間をおいて再度お試しください。",
      },
      { status: 500 }
    );
  }
}
