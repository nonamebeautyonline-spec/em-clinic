import { NextRequest, NextResponse } from "next/server";

const GAS_ADMIN_URL = process.env.GAS_ADMIN_URL!;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN!;

function fail(code: string, status: number = 500) {
  return NextResponse.json({ ok: false, code }, { status });
}

async function gasPost(payload: any) {
  const res = await fetch(GAS_ADMIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, token: ADMIN_TOKEN }),
    cache: "no-store",
  });

  const text = await res.text().catch(() => "");
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }

  return { httpOk: res.ok, json };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const doctor_id = searchParams.get("doctor_id") || "";
  const start = searchParams.get("start") || "";
  const end = searchParams.get("end") || "";

  const { httpOk, json } = await gasPost({
    type: "getScheduleRange",
    doctor_id,
    start,
    end,
  });

  if (!httpOk || json?.ok !== true) return fail("GAS_ERROR", 500);

  // ★ 外部返却はホワイトリストのみ（例）
  // 予約枠データに氏名/住所/電話が混ざっても落ちないようにここで遮断
  const out = {
    ok: true,
    code: "SCHEDULE_RANGE_OK",
    // 必要なキーだけに限定（実データに合わせて調整）
    start: json.start,
    end: json.end,
    slots: Array.isArray(json.slots) ? json.slots : [],
  };

  return NextResponse.json(out, { status: 200 });
}
