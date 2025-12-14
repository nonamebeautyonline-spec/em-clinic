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
    // name は受け取っても「保存しない」「返さない」
    if (!patientId) {
      return NextResponse.json(
        { ok: false, message: "患者IDの取得に失敗しました" },
        { status: 500 }
      );
    }

    const res = NextResponse.json({ ok: true });

    res.cookies.set("patient_id", patientId, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    // patient_name cookie は廃止推奨
    return res;

// ...中略...
  } catch {
    // err をそのままログしない
    console.error("link-patient error");
    return NextResponse.json(
      { ok: false, message: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }

}
