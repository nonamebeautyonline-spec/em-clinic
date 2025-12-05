// app/api/link-patient/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { birth, tel } = await req.json();

    // LINEログイン情報（line_user_id）は cookie から取る
    const lineUserId = req.cookies.get("line_user_id")?.value;
    if (!lineUserId) {
      return NextResponse.json(
        { ok: false, message: "LINEログイン情報がありません" },
        { status: 401 }
      );
    }

    if (!birth || !tel) {
      return NextResponse.json(
        { ok: false, message: "生年月日と電話番号は必須です" },
        { status: 400 }
      );
    }

    const GAS_URL = process.env.GAS_PATIENT_LINK_URL;
    if (!GAS_URL) {
      return NextResponse.json(
        { ok: false, message: "GAS_PATIENT_LINK_URL が未設定です" },
        { status: 500 }
      );
    }

    // GAS（問診マスター側 WebApp）に照合を依頼
    const payload = {
      type: "patient_link",
      birth,
      tel,
      line_user_id: lineUserId,
    };

    const gasRes = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await gasRes.json().catch(() => ({}));

    if (!gasRes.ok || data.ok === false) {
      return NextResponse.json(
        {
          ok: false,
          message: data.message || "照合できませんでした",
        },
        { status: 404 }
      );
    }

    const patientId = data.patient_id as string | undefined;
    const name = data.name as string | undefined;

    if (!patientId || !name) {
      return NextResponse.json(
        { ok: false, message: "患者IDまたは氏名の取得に失敗しました" },
        { status: 500 }
      );
    }

    // cookie に保存（patient_id は httpOnly、name は表示用）
    const res = NextResponse.json({ ok: true });

    res.cookies.set("patient_id", patientId, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30日
    });

    res.cookies.set("patient_name", name, {
      httpOnly: false, // UIで読めるようにする
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return res;
  } catch (err) {
    console.error("link-patient error:", err);
    return NextResponse.json(
      { ok: false, message: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
