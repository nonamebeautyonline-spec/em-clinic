// lib/ai-karte-summary.ts — AIカルテ要約（問診+過去カルテ+処方履歴→SOAP自動生成）
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";
import { withTenant } from "@/lib/tenant";
import { getSettingOrEnv } from "@/lib/settings";
import type { SoapNote } from "@/lib/soap-parser";
import { parseJsonToSoap, soapToText } from "@/lib/soap-parser";
import { formatProductCode } from "@/lib/patient-utils";

/** AI要約の結果 */
export type AiKarteSummaryResult = {
  soap: SoapNote;
  summary: string;
  medications: string[];
};

/** コンテキスト収集用の型 */
type PatientContext = {
  answers: Record<string, unknown>;
  pastNotes: string[];
  prescriptionHistory: string[];
};

/**
 * 患者コンテキスト（問診回答 + 過去カルテ + 処方履歴）を収集する
 */
async function collectPatientContext(
  patientId: string,
  tenantId: string | null,
  intakeId?: number
): Promise<PatientContext> {
  // 並列でデータ取得
  const [intakeRes, ordersRes, reordersRes] = await Promise.all([
    // 問診データ（intakeId指定時は該当レコード、なければ全件）
    withTenant(
      supabaseAdmin
        .from("intake")
        .select("id, reserve_id, status, note, answers, created_at")
        .eq("patient_id", patientId)
        .order("id", { ascending: false })
        .limit(20),
      tenantId
    ),
    // 購入履歴（処方履歴として利用）
    withTenant(
      supabaseAdmin
        .from("orders")
        .select("product_code, product_name, amount, paid_at, created_at")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(20),
      tenantId
    ),
    // 再処方履歴（karte_noteあり = 過去カルテ）
    withTenant(
      supabaseAdmin
        .from("reorders")
        .select("id, product_code, status, karte_note, created_at, approved_at")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(10),
      tenantId
    ),
  ]);

  const intakes = intakeRes.data || [];
  const orders = ordersRes.data || [];
  const reorders = reordersRes.data || [];

  // 対象のintakeを決定（intakeId指定があればそのレコード、なければ最新）
  const targetIntake = intakeId
    ? intakes.find((i: { id: number }) => i.id === intakeId)
    : intakes[0];

  const answers = (targetIntake?.answers as Record<string, unknown>) || {};

  // 過去カルテ（intake.note + reorders.karte_note）
  const pastNotes: string[] = [];

  for (const intake of intakes) {
    if (!intake.note) continue;
    // 対象のintake自身はスキップ（上書き対象なので）
    if (targetIntake && intake.id === targetIntake.id) continue;

    let noteText: string;
    try {
      // SOAP JSON形式ならテキスト化
      const parsed = JSON.parse(intake.note);
      if (parsed && typeof parsed === "object" && ("s" in parsed || "o" in parsed)) {
        noteText = soapToText(parseJsonToSoap(intake.note));
      } else {
        noteText = intake.note;
      }
    } catch {
      noteText = intake.note;
    }

    const dateStr = intake.created_at
      ? new Date(intake.created_at).toISOString().slice(0, 10)
      : "日付不明";
    pastNotes.push(`[${dateStr}] ${noteText}`);
  }

  // 再処方カルテ
  for (const r of reorders) {
    if (!r.karte_note) continue;
    const dateStr = (r.approved_at || r.created_at)
      ? new Date(r.approved_at || r.created_at).toISOString().slice(0, 10)
      : "日付不明";
    pastNotes.push(`[${dateStr} 再処方] ${r.karte_note}`);
  }

  // 処方履歴
  const prescriptionHistory: string[] = orders.map(
    (o: { product_code: string; amount: number; paid_at: string; created_at: string }) => {
      const name = formatProductCode(o.product_code);
      const dateStr = (o.paid_at || o.created_at)
        ? new Date(o.paid_at || o.created_at).toISOString().slice(0, 10)
        : "日付不明";
      return `${dateStr}: ${name} (¥${Number(o.amount).toLocaleString()})`;
    }
  );

  return { answers, pastNotes, prescriptionHistory };
}

/**
 * コンテキストからプロンプト用テキストを構築する
 */
function buildContextText(ctx: PatientContext): string {
  const sections: string[] = [];

  // 問診回答
  const ans = ctx.answers;
  if (Object.keys(ans).length > 0) {
    const lines: string[] = ["## 今回の問診回答"];
    if (ans.name || ans.氏名) lines.push(`- 氏名: ${ans.name || ans.氏名}`);
    if (ans.sex || ans.性別) lines.push(`- 性別: ${ans.sex || ans.性別}`);
    if (ans.birth || ans.生年月日) lines.push(`- 生年月日: ${ans.birth || ans.生年月日}`);
    if (ans.height) lines.push(`- 身長: ${ans.height}cm`);
    if (ans.weight) lines.push(`- 体重: ${ans.weight}kg`);

    // 既往歴
    if (ans.current_disease_yesno === "yes") {
      lines.push(`- 既往歴: ${ans.current_disease_detail || "あり"}`);
    } else if (ans.current_disease_yesno === "no") {
      lines.push("- 既往歴: なし");
    }

    // GLP-1歴
    if (ans.glp_history) lines.push(`- GLP-1使用歴: ${ans.glp_history}`);

    // 内服薬
    if (ans.med_yesno === "yes") {
      lines.push(`- 内服薬: ${ans.med_detail || "あり"}`);
    } else if (ans.med_yesno === "no") {
      lines.push("- 内服薬: なし");
    }

    // アレルギー
    if (ans.allergy_yesno === "yes") {
      lines.push(`- アレルギー: ${ans.allergy_detail || "あり"}`);
    } else if (ans.allergy_yesno === "no") {
      lines.push("- アレルギー: なし");
    }

    // 副作用
    if (ans.side_effects) lines.push(`- 副作用: ${ans.side_effects}`);

    // 希望処方
    if (ans.prescription_menu) lines.push(`- 希望処方メニュー: ${ans.prescription_menu}`);

    // NG判定
    if (ans.ng_check) lines.push(`- NG判定: ${ans.ng_check}`);

    // その他の回答（未カバーのキーも含める）
    const coveredKeys = new Set([
      "name", "氏名", "sex", "性別", "birth", "生年月日", "height", "weight",
      "current_disease_yesno", "current_disease_detail", "glp_history",
      "med_yesno", "med_detail", "allergy_yesno", "allergy_detail",
      "side_effects", "prescription_menu", "ng_check",
      "tel", "line_id", "patient_id", "カナ", "name_kana",
    ]);
    for (const [key, value] of Object.entries(ans)) {
      if (coveredKeys.has(key)) continue;
      if (value === null || value === undefined || value === "") continue;
      lines.push(`- ${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`);
    }

    sections.push(lines.join("\n"));
  }

  // 過去カルテ
  if (ctx.pastNotes.length > 0) {
    sections.push("## 過去のカルテ記録\n" + ctx.pastNotes.join("\n"));
  }

  // 処方履歴
  if (ctx.prescriptionHistory.length > 0) {
    sections.push("## 処方履歴\n" + ctx.prescriptionHistory.join("\n"));
  }

  return sections.join("\n\n");
}

/**
 * AIカルテ要約のシステムプロンプト
 */
const SYSTEM_PROMPT = `あなたは医療カルテ作成アシスタントです。
患者の問診回答・過去のカルテ記録・処方履歴を基に、SOAP形式のカルテ下書きを生成してください。

## SOAP形式
- **S（Subjective）**: 患者の主観的訴え（主訴、自覚症状、経過、問診回答からの情報）
- **O（Objective）**: 客観的所見（バイタル、検査結果、身体所見、BMI等の計算値）
- **A（Assessment）**: 評価（現在の状態の評価、治療効果の判定、リスク評価）
- **P（Plan）**: 治療計画（処方提案、次回予定、生活指導、注意事項）

## ルール
1. 問診回答と過去カルテの情報を整理してSOAP形式に構造化
2. 過去の処方履歴がある場合は、継続処方か変更かを考慮
3. 既往歴・アレルギー・内服薬がある場合はAセクションに注意事項として記載
4. 推測や憶測は書かない — 提供された情報のみに基づく
5. 各セクションは箇条書きで簡潔に記述
6. 処方に関連する薬剤名は medications 配列に抽出
7. summary は1行で全体を要約

## 出力形式（JSON）
\`\`\`json
{
  "soap": {
    "s": "患者の訴え・問診情報...",
    "o": "所見・計算値...",
    "a": "評価...",
    "p": "治療計画..."
  },
  "summary": "1行要約",
  "medications": ["薬剤名1", "薬剤名2"]
}
\`\`\`

JSONのみを出力してください。説明文は不要です。`;

/**
 * AIカルテ要約を生成する
 * @param patientId 患者ID
 * @param tenantId テナントID
 * @param intakeId 対象の問診ID（省略時は最新）
 * @returns SOAP形式の要約結果
 */
export async function generateAiKarteSummary(
  patientId: string,
  tenantId: string | null,
  intakeId?: number
): Promise<AiKarteSummaryResult> {
  // APIキー取得
  const apiKey = await getSettingOrEnv(
    "general",
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_API_KEY",
    tenantId || undefined
  );
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY が未設定です");
  }

  // 患者コンテキスト収集
  const context = await collectPatientContext(patientId, tenantId, intakeId);

  const contextText = buildContextText(context);
  if (!contextText.trim()) {
    throw new Error("要約に必要な患者データがありません");
  }

  // Claude API呼び出し
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: contextText }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  // JSON抽出
  const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  const jsonMatch = codeBlockMatch || text.match(/(\{[\s\S]*\})/);

  if (!jsonMatch) {
    throw new Error("AI応答のJSON解析に失敗しました");
  }

  const parsed = JSON.parse(jsonMatch[1]) as {
    soap?: { s?: string; o?: string; a?: string; p?: string; S?: string; O?: string; A?: string; P?: string };
    summary?: string;
    medications?: string[];
  };

  if (!parsed.soap) {
    throw new Error("AI応答にSOAPデータが含まれていません");
  }

  // 大文字・小文字両方のキーに対応（parseJsonToSoap互換）
  const soap: SoapNote = {
    s: parsed.soap.s || parsed.soap.S || "",
    o: parsed.soap.o || parsed.soap.O || "",
    a: parsed.soap.a || parsed.soap.A || "",
    p: parsed.soap.p || parsed.soap.P || "",
  };

  return {
    soap,
    summary: parsed.summary || "",
    medications: parsed.medications || [],
  };
}
