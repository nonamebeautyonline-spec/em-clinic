// 診察会話 → SOAP形式カルテ自動生成 API
// 音声文字起こし結果（長文テキスト）からカルテを構造化する
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase";
import { getSettingOrEnv } from "@/lib/settings";
import type { VocabTerm } from "@/lib/voice/medical-refine";

/** カルテ生成結果 */
interface KarteResult {
  soap: {
    S: string; // Subjective（主観的情報 — 患者の訴え）
    O: string; // Objective（客観的情報 — 所見）
    A: string; // Assessment（評価）
    P: string; // Plan（治療計画）
  };
  summary: string;        // 1行要約
  medications: string[];  // 抽出された薬剤名
  raw_transcript: string; // 元の文字起こし
}

// 辞書取得
async function getVocabTerms(tenantId: string | null): Promise<VocabTerm[]> {
  const { data } = await withTenant(
    supabaseAdmin
      .from("medical_vocabulary")
      .select("term, reading"),
    tenantId
  );
  return (data as VocabTerm[]) || [];
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = resolveTenantId(req);

    const body = await req.json();
    const { transcript, format = "soap" } = body;

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json(
        { ok: false, error: "テキストが入力されていません" },
        { status: 400 }
      );
    }

    if (transcript.length < 10) {
      return NextResponse.json(
        { ok: false, error: "テキストが短すぎます（10文字以上必要）" },
        { status: 400 }
      );
    }

    // Claude API キー取得
    const apiKey = await getSettingOrEnv(
      "general",
      "ANTHROPIC_API_KEY",
      "ANTHROPIC_API_KEY",
      tenantId || undefined
    );
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "ANTHROPIC_API_KEY が未設定です" },
        { status: 500 }
      );
    }

    // 医療辞書取得（コンテキストとして渡す）
    const vocabTerms = await getVocabTerms(tenantId);
    const vocabList = vocabTerms.length > 0
      ? vocabTerms.map((v) => v.term).join("、")
      : "（辞書未登録）";

    const client = new Anthropic({ apiKey });

    const systemPrompt = buildSystemPrompt(format, vocabList);

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: transcript }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    // JSON 抽出
    const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    const jsonMatch = codeBlockMatch || text.match(/(\{[\s\S]*\})/);

    if (!jsonMatch) {
      // JSON解析失敗 — テキストそのままでフリーテキストカルテとして返す
      return NextResponse.json({
        ok: true,
        karte: text,
        format: "freetext",
        raw_transcript: transcript,
      });
    }

    const parsed = JSON.parse(jsonMatch[1]) as KarteResult;

    return NextResponse.json({
      ok: true,
      karte: formatKarteText(parsed.soap),
      soap: parsed.soap,
      summary: parsed.summary || "",
      medications: parsed.medications || [],
      format,
      raw_transcript: transcript,
    });
  } catch (err) {
    console.error("[voice/generate-karte] エラー:", err);
    const message = err instanceof Error ? err.message : "カルテ生成中にエラーが発生しました";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}

function buildSystemPrompt(format: string, vocabList: string): string {
  if (format === "freetext") {
    return `あなたは医療カルテ作成アシスタントです。
診察中の会話テキストから、簡潔で正確なカルテを自由記述形式で生成してください。

## ルール
1. 患者の訴え、所見、診断、治療方針を整理して記述
2. 医療用語は正確に使用（以下の辞書を参照）
3. 不要な会話（挨拶、雑談等）は省略
4. 推測や憶測は書かない — 会話に含まれる情報のみ

## 医療辞書
${vocabList}

カルテ本文のみを出力してください（JSON不要）。`;
  }

  // SOAP形式（デフォルト）
  return `あなたは医療カルテ作成アシスタントです。
診察中の会話テキスト（音声認識結果）から、SOAP形式のカルテを生成してください。

## SOAP形式
- **S（Subjective）**: 患者の主観的訴え（主訴、自覚症状、経過）
- **O（Objective）**: 客観的所見（バイタル、検査結果、身体所見）
- **A（Assessment）**: 評価（診断名、病態の評価）
- **P（Plan）**: 治療計画（処方、検査予定、次回予約、生活指導）

## ルール
1. 会話テキストから必要な情報を抽出してSOAP形式に構造化
2. 不要な会話（挨拶、雑談等）は省略
3. 医療用語は正確に使用（以下の辞書を参照）
4. 会話に含まれない情報は推測しない
5. 各セクションは箇条書きで簡潔に記述
6. 薬剤名が会話に含まれる場合、medications 配列に抽出

## 医療辞書
${vocabList}

## 出力形式（JSON）
{
  "soap": {
    "S": "患者の訴え...",
    "O": "所見...",
    "A": "評価...",
    "P": "治療計画..."
  },
  "summary": "1行要約",
  "medications": ["薬剤名1", "薬剤名2"]
}`;
}

function formatKarteText(soap: KarteResult["soap"]): string {
  const lines: string[] = [];
  if (soap.S) lines.push(`【S】${soap.S}`);
  if (soap.O) lines.push(`【O】${soap.O}`);
  if (soap.A) lines.push(`【A】${soap.A}`);
  if (soap.P) lines.push(`【P】${soap.P}`);
  return lines.join("\n");
}
