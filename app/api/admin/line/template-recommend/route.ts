// テンプレート推薦API
// 患者のセグメント・フロー段階・メッセージ履歴を元にClaude APIで最適テンプレートを推薦

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { getSettingOrEnv } from "@/lib/settings";
import { fetchPatientFlowStatus } from "@/lib/ai-reply";

export async function POST(req: NextRequest) {
  // 認証チェック
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = resolveTenantId(req);

  // リクエストボディ解析
  let body: { patient_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストボディが不正です" }, { status: 400 });
  }

  const { patient_id } = body;
  if (!patient_id?.trim()) {
    return NextResponse.json({ error: "patient_id は必須です" }, { status: 400 });
  }

  // APIキー取得
  const tid = tenantId ?? undefined;
  const apiKey = (await getSettingOrEnv("general", "anthropic_api_key", "ANTHROPIC_API_KEY", tid)) || "";
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY が未設定です" }, { status: 500 });
  }

  // 並列でデータ取得: セグメント、フロー段階、メッセージ履歴、テンプレート一覧
  const [segmentRes, flowStatus, messagesRes, templatesRes] = await Promise.all([
    // 1. 患者セグメント
    withTenant(
      supabaseAdmin
        .from("patient_segments")
        .select("segment, rfm_score")
        .eq("patient_id", patient_id)
        .maybeSingle(),
      tenantId,
    ),
    // 2. フロー段階
    fetchPatientFlowStatus(patient_id, tenantId),
    // 3. 直近メッセージ履歴（最新5件）
    withTenant(
      supabaseAdmin
        .from("message_log")
        .select("direction, content, sent_at")
        .eq("patient_id", patient_id)
        .order("sent_at", { ascending: false })
        .limit(5),
      tenantId,
    ),
    // 4. テンプレート一覧（テキストのみ）
    withTenant(
      supabaseAdmin
        .from("message_templates")
        .select("id, name, content, category")
        .eq("message_type", "text")
        .order("updated_at", { ascending: false }),
      tenantId,
    ),
  ]);

  const segment = segmentRes.data as { segment: string; rfm_score: Record<string, number> } | null;
  const recentMessages = (messagesRes.data || []) as { direction: string; content: string; sent_at: string }[];
  const templates = (templatesRes.data || []) as { id: number; name: string; content: string; category: string | null }[];

  if (templates.length === 0) {
    return NextResponse.json({
      ok: true,
      recommendations: [],
      message: "テンプレートが登録されていません",
    });
  }

  // セグメントラベル
  const segmentLabels: Record<string, string> = {
    vip: "VIP（高頻度・高額）",
    active: "アクティブ（定期利用中）",
    churn_risk: "離脱リスク（以前は利用していたが最近来ていない）",
    dormant: "休眠（長期間利用なし）",
    new: "新規（初回または利用回数が少ない）",
  };

  const segmentInfo = segment
    ? `セグメント: ${segmentLabels[segment.segment] || segment.segment}`
    : "セグメント: 未分類";

  const flowInfo = `フロー段階: ${flowStatus.flowStage}`;

  const messageHistory = recentMessages.length > 0
    ? recentMessages
        .reverse()
        .map(
          (m) =>
            `${m.direction === "incoming" ? "患者" : "スタッフ"}: ${m.content.substring(0, 100)}`,
        )
        .join("\n")
    : "（メッセージ履歴なし）";

  const templateList = templates
    .map(
      (t, i) =>
        `ID:${t.id} | 名前:${t.name} | カテゴリ:${t.category || "未分類"} | 内容:${t.content.substring(0, 80)}`,
    )
    .join("\n");

  // Claude API で推薦
  const client = new Anthropic({ apiKey });

  const systemPrompt = `あなたはクリニックのLINEメッセージ運用を支援するAIです。
患者情報とテンプレート一覧を見て、この患者に最も適したテンプレートを3件推薦してください。

## ルール
- 患者のセグメント（VIP/アクティブ/離脱リスク/休眠/新規）に合ったテンプレートを選ぶ
- 患者のフロー段階に適したテンプレートを選ぶ
- 直近のメッセージ履歴の文脈を考慮する
- 各推薦には具体的な理由を記載する
- テンプレート一覧にないIDを推薦しない

## 出力形式
以下のJSON形式で出力してください（コードブロックなし、JSONのみ）:
{
  "recommendations": [
    { "template_id": 1, "template_name": "テンプレート名", "reason": "推薦理由" },
    { "template_id": 2, "template_name": "テンプレート名", "reason": "推薦理由" },
    { "template_id": 3, "template_name": "テンプレート名", "reason": "推薦理由" }
  ]
}

テンプレートが3件未満の場合は、ある分だけ推薦してください。`;

  const userMessage = `以下の患者に最適なテンプレートを推薦してください。

## 患者情報
- ${segmentInfo}
- ${flowInfo}

## 直近のメッセージ履歴
${messageHistory}

## テンプレート一覧
${templateList}`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    // JSON 抽出
    const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    const jsonMatch = codeBlockMatch ? codeBlockMatch : text.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) {
      console.error("[Template Recommend] JSON抽出失敗:", text);
      return NextResponse.json({ error: "AIレスポンスの解析に失敗しました" }, { status: 500 });
    }

    const result = JSON.parse(jsonMatch[1]) as {
      recommendations: { template_id: number; template_name: string; reason: string }[];
    };

    // テンプレートIDの存在チェック（幻覚防止）
    const validTemplateIds = new Set(templates.map((t) => t.id));
    const validRecommendations = result.recommendations.filter((r) =>
      validTemplateIds.has(r.template_id),
    );

    return NextResponse.json({
      ok: true,
      recommendations: validRecommendations,
    });
  } catch (err) {
    console.error("[Template Recommend] Claude API エラー:", err);
    return NextResponse.json({ error: "テンプレート推薦に失敗しました" }, { status: 500 });
  }
}
