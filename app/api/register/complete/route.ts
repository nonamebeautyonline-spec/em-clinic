// app/api/register/complete/route.ts
import { NextRequest, NextResponse } from "next/server";

const GAS_REGISTER_URL = process.env.GAS_REGISTER_URL;

export async function POST(req: NextRequest) {
  try {
    if (!GAS_REGISTER_URL) {
      console.error("GAS_REGISTER_URL is not set");
      return NextResponse.json(
        { error: "GAS_REGISTER_URL is not set." },
        { status: 500 }
      );
    }

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

    // GAS に phone（＋あれば lineUserId）を投げる
    const gasRes = await fetch(GAS_REGISTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone,
        line_user_id: lineUserId ?? "",
        // 必要なら type を付けても良い
        // type: "register_by_phone",
      }),
    });

    const text = await gasRes.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      console.error("GAS response is not valid JSON:", text);
      return NextResponse.json(
        {
          error: "GAS register API returned invalid JSON.",
          detail: text,
        },
        { status: 500 }
      );
    }

    // GAS 側が返してくる候補フィールドを全部見る
    const pid =
      data.pid ??
      data.patient_id ??
      data.Patient_ID ??
      null;

    if (!pid) {
      console.error("GAS register API did not return pid", data);
      return NextResponse.json(
        {
          error: "GAS register API did not return pid.",
          detail: data,
        },
        { status: 500 }
      );
    }

    // ここで pid を返せば OK（必要ならここでクッキーに保存なども可能）
    return NextResponse.json({ pid: String(pid) });
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
