// app/api/intake/route.ts
import { NextResponse } from "next/server";

// Google Apps Script Web アプリの URL（環境変数）
const GAS_INTAKE_URL = process.env.GAS_INTAKE_URL as string | undefined;

type IntakeRequestBody = {
  reserveId: string;
  answers: Record<string, string>;
  submittedAt: string;
  // 患者情報（あれば）
  name?: string;
  sex?: string;
  birth?: string;
  line_id?: string;
  lineId?: string;
  customer_id?: string;
  customerId?: string;
  phone?: string;
  // ★ ここから追加
  name_kana?: string;
  nameKana?: string;
  tel?: string;
  patient_id?: string;
  patientId?: string;
  answerer_id?: string;
  answererId?: string;
  // 将来増えるかもしれない項目も許容
  [key: string]: any;
};

// POST /api/intake
export async function POST(req: Request) {
  try {
    const body: IntakeRequestBody = await req.json();

    // ------- 1. 受け取ったデータの整理 -------

    // 必須チェック（reserveId と answers だけは最低限）
    if (!body.reserveId || !body.answers) {
      return NextResponse.json(
        { ok: false, error: "missing reserveId or answers" },
        { status: 400 }
      );
    }

    // line_id をなるべく埋める
    const line_id =
      body.line_id ||
      body.lineId ||
      body.customer_id ||
      body.customerId ||
      "";

    const name = body.name ?? "";
    const sex = body.sex ?? "";
    const birth = body.birth ?? "";

    // 電話は phone / tel どちらでもOK
    const tel =
      body.tel ??
      body.phone ??
      "";

    // 氏名カナ
    const name_kana =
      body.name_kana ??
      body.nameKana ??
      "";

    // Patient_ID
    const patient_id =
      body.patient_id ??
      body.patientId ??
      "";

    // 回答者ID（Lステ回答フォーム側のID）
    const answerer_id =
      body.answerer_id ??
      body.answererId ??
      "";

    const submittedAt =
      body.submittedAt ?? new Date().toISOString();

    // GAS に渡すペイロード（ここで何を送るかが問診シートの列になる）
    const payload = {
      type: body.type ?? "intake",
      reserveId: body.reserveId,
      answers: body.answers,
      submittedAt,
      name,
      sex,
      birth,
      line_id,
      // ここから問診シート追加列用
      name_kana,
      tel,
      patient_id,
      answerer_id,
    };

    console.log("INTAKE payload to GAS:", payload);

    // ------- 2. GAS が未設定ならモック成功を返す -------

    if (!GAS_INTAKE_URL) {
      console.warn(
        "GAS_INTAKE_URL is not set. /api/intake will return mock success."
      );
      return NextResponse.json({ ok: true, mock: true, payload });
    }

    // ------- 3. GAS Web アプリを呼び出す -------

    const gasRes = await fetch(GAS_INTAKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await gasRes.text();
    console.log("GAS intake raw:", text);

    let json: any = {};
    try {
      json = JSON.parse(text);
    } catch {
      json = {};
    }

    // GAS 側が { ok:false } を返してくるケースに対応
    if (!gasRes.ok || json.ok === false) {
      const errorMessage = json.error ?? "GAS error";

      return NextResponse.json(
        { ok: false, error: errorMessage, detail: text },
        { status: 500 }
      );
    }

    // ------- 4. 正常終了 -------

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("INTAKE API error:", err);
    return NextResponse.json(
      { ok: false, error: "server error" },
      { status: 500 }
    );
  }
}
