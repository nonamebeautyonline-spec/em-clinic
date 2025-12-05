// app/api/link-patient/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { birth, tel } = await req.json();

  const lineUserId = req.cookies.get("line_user_id")?.value;
  if (!lineUserId) {
    return NextResponse.json(
      { message: "LINEログイン情報がありません" },
      { status: 401 }
    );
  }

  const GAS_URL = process.env.GAS_PATIENT_LINK_URL!;
  if (!GAS_URL) {
    return NextResponse.json(
      { message: "GAS_PATIENT_LINK_URL が未設定です" },
      { status: 500 }
    );
  }

  // GAS WebApp に birth / tel / line_user_id を渡す
  const gasRes = await fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ birth, tel, line_user_id: lineUserId }),
  });

  const data = await gasRes.json().catch(() => ({}));

  if (!data.ok) {
    return NextResponse.json(
      { message: "照合できませんでした" },
      { status: 404 }
    );
  }

  const patientId = data.patient_id as string | undefined;
  const name = data.name as string | undefined;

  if (!patientId) {
    return NextResponse.json(
      { message: "患者IDの取得に失敗しました" },
      { status: 500 }
    );
  }

  const res = NextResponse.json({ ok: true, patientId, name });

  // 患者IDはサーバー側用
  res.cookies.set("patient_id", patientId, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30日
  });

  // 氏名は画面表示用
  if (name) {
    res.cookies.set("patient_name", name, {
      httpOnly: false,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return res;
}
