import { NextRequest, NextResponse } from "next/server";

const GAS_MYPAGE_URL = process.env.GAS_MYPAGE_URL as string | undefined;

export async function GET(req: NextRequest) {
  const patientId =
    req.cookies.get("__Host-patient_id")?.value ||
    req.cookies.get("patient_id")?.value ||
    "";

  if (!patientId) {
    return NextResponse.json({ ok: false, message: "not_linked" }, { status: 401 });
  }

  // GASが無い/落ちてる時も、余計な情報を返さない
  if (!GAS_MYPAGE_URL) {
    return NextResponse.json({ ok: true, name: "" }, { status: 200 });
  }

  try {
    const url =
      GAS_MYPAGE_URL +
      `?type=getDashboard&patient_id=${encodeURIComponent(patientId)}`;

    const r = await fetch(url, { cache: "no-store" });
    const text = await r.text();

    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      // 解析失敗でも詳細は返さない
      return NextResponse.json({ ok: true, name: "" }, { status: 200 });
    }

    const name = String(data?.patient?.displayName || "").trim();

    // ★ 外部返却は最小：nameだけ
    return NextResponse.json({ ok: true, name }, { status: 200 });
  } catch {
    // エラー詳細は返さない
    return NextResponse.json({ ok: true, name: "" }, { status: 200 });
  }
}
