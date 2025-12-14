import { NextRequest, NextResponse } from "next/server";

const GAS_MYPAGE_URL = process.env.GAS_MYPAGE_URL as string | undefined;

export async function GET(req: NextRequest) {
  const patientId =
    req.cookies.get("__Host-patient_id")?.value ||
    req.cookies.get("patient_id")?.value ||
    "";

  if (!patientId) {
    return NextResponse.json(
      { ok: false, message: "not_linked", _dbg: "profile-v3-gasname" },
      { status: 401 }
    );
  }

  if (!GAS_MYPAGE_URL) {
    return NextResponse.json({
      ok: true,
      patientId,
      name: "",
      _dbg: "profile-v3-gasname",
      _gas: { configured: false },
    });
  }

  try {
    const url = `${GAS_MYPAGE_URL}?type=getDashboard&pid=${encodeURIComponent(
      patientId
    )}`;
    const r = await fetch(url, { cache: "no-store" });
    const text = await r.text();

    let data: any = {};
    let parseOk = true;
    try {
      data = JSON.parse(text);
    } catch {
      parseOk = false;
    }

    const name = String(data?.patient?.displayName || "").trim();

    return NextResponse.json({
      ok: true,
      patientId,
      name,
      _dbg: "profile-v3-gasname",
      _gas: { configured: true, ok: r.ok, status: r.status, parseOk, hasDisplayName: !!name },
    });
  } catch (e) {
    console.error("mypage/profile: GAS fetch error:", e);
    return NextResponse.json({
      ok: true,
      patientId,
      name: "",
      _dbg: "profile-v3-gasname",
      _gas: { configured: true, fetchError: true },
    });
  }
}
