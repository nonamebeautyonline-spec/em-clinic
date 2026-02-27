// lib/tenant-seed.ts — テナント初期データ自動投入
//
// テナント作成時に自動投入するデフォルトデータを定義。
// 各INSERT操作は tenantPayload(tenantId) でテナントIDを付与し、
// エラーは個別にcatchしてログ出力（1つ失敗しても他は続行）。

import { supabaseAdmin } from "@/lib/supabase";
import { tenantPayload } from "@/lib/tenant";

// ---------------------------------------------------------------------------
// 1. デフォルトメッセージテンプレート5種
// ---------------------------------------------------------------------------
function defaultTemplates(tenantId: string) {
  const tp = tenantPayload(tenantId);
  return [
    {
      ...tp,
      name: "予約確認",
      content:
        "{patient_name}様\n\nご予約を承りました。\n\n日時: {reserved_date} {reserved_time}\n\n当日は保険証をお持ちください。\nご不明点がございましたらお気軽にお問い合わせください。",
      message_type: "text",
      category: "reservation",
    },
    {
      ...tp,
      name: "リマインダー",
      content:
        "{patient_name}様\n\n明日のご予約のリマインドです。\n\n日時: {reserved_date} {reserved_time}\n\nご来院をお待ちしております。",
      message_type: "text",
      category: "reminder",
    },
    {
      ...tp,
      name: "決済完了",
      content:
        "{patient_name}様\n\n決済が完了しました。\n金額: {amount}円\n\nご利用ありがとうございます。",
      message_type: "text",
      category: "payment",
    },
    {
      ...tp,
      name: "発送通知",
      content:
        "{patient_name}様\n\nお薬を発送いたしました。\n追跡番号: {tracking_number}\n\n到着まで1〜3日程度かかります。",
      message_type: "text",
      category: "shipping",
    },
    {
      ...tp,
      name: "フォローアップ",
      content:
        "{patient_name}様\n\nその後お体の調子はいかがでしょうか？\n何かお困りのことがございましたら、お気軽にメッセージをお送りください。\n\n次回のご来院もお待ちしております。",
      message_type: "text",
      category: "followup",
    },
  ];
}

// ---------------------------------------------------------------------------
// 2. 問診フォーム雛形（intake_form_definitions テーブル）
// ---------------------------------------------------------------------------
function defaultIntakeFormDefinition(tenantId: string) {
  return {
    tenant_id: tenantId,
    name: "問診フォーム",
    fields: JSON.stringify([
      {
        id: "name",
        type: "text",
        label: "お名前（フルネーム）",
        required: true,
        placeholder: "例）山田太郎",
        sort_order: 0,
      },
      {
        id: "birthday",
        type: "date",
        label: "生年月日",
        required: true,
        sort_order: 1,
      },
      {
        id: "sex",
        type: "radio",
        label: "性別",
        required: true,
        options: [
          { label: "男性", value: "male" },
          { label: "女性", value: "female" },
          { label: "その他", value: "other" },
        ],
        sort_order: 2,
      },
      {
        id: "medical_history_yesno",
        type: "radio",
        label: "現在治療中、または過去に大きな病気はありますか？",
        required: true,
        options: [
          { label: "はい", value: "yes" },
          { label: "いいえ", value: "no" },
        ],
        sort_order: 3,
      },
      {
        id: "medical_history_detail",
        type: "textarea",
        label: "上記で「はい」と答えた方は疾患名や状況をご記入ください",
        required: true,
        placeholder: "例）高血圧で内科通院中",
        sort_order: 4,
        conditional: { when: "medical_history_yesno", value: "yes" },
      },
      {
        id: "allergy_yesno",
        type: "radio",
        label: "アレルギーはありますか？",
        required: true,
        options: [
          { label: "はい", value: "yes" },
          { label: "いいえ", value: "no" },
        ],
        sort_order: 5,
      },
      {
        id: "allergy_detail",
        type: "textarea",
        label: "上記で「はい」と答えた方はアレルギー名をご記入ください",
        required: true,
        placeholder: "例）花粉症、ペニシリン",
        sort_order: 6,
        conditional: { when: "allergy_yesno", value: "yes" },
      },
      {
        id: "current_medication_yesno",
        type: "radio",
        label: "現在、内服中のお薬はありますか？",
        required: true,
        options: [
          { label: "はい", value: "yes" },
          { label: "いいえ", value: "no" },
        ],
        sort_order: 7,
      },
      {
        id: "current_medication_detail",
        type: "textarea",
        label: "上記で「はい」と答えた方は薬剤名をご記入ください",
        required: true,
        placeholder: "例）ロキソニン60mg",
        sort_order: 8,
        conditional: { when: "current_medication_yesno", value: "yes" },
      },
    ]),
    settings: JSON.stringify({
      step_by_step: true,
      header_title: "問診",
      estimated_time: "平均回答時間 1〜2分程度",
    }),
  };
}

// ---------------------------------------------------------------------------
// 3. AI返信設定初期値
// ---------------------------------------------------------------------------
function defaultAiReplySettings(tenantId: string) {
  const tp = tenantPayload(tenantId);
  return {
    ...tp,
    is_enabled: false,
    mode: "approval",
    knowledge_base: [
      "Q: 診療時間は？\nA: 平日10:00〜18:00、土曜10:00〜14:00です。日祝はお休みです。",
      "Q: 予約のキャンセルはできますか？\nA: はい、予約日の前日までにご連絡ください。",
      "Q: 駐車場はありますか？\nA: 当院専用の駐車場がございます。",
      "Q: 保険診療は対応していますか？\nA: はい、各種保険を取り扱っております。",
      "Q: 初診の持ち物は？\nA: 保険証と、お持ちの方はお薬手帳をご持参ください。",
    ].join("\n\n"),
    custom_instructions: "",
    min_message_length: 5,
    daily_limit: 100,
    approval_timeout_hours: 24,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// メインエクスポート
// ---------------------------------------------------------------------------

/**
 * テナント作成時に自動投入するデフォルトデータ
 * 各INSERT操作は個別にcatchし、1つが失敗しても他は続行する
 */
export async function seedTenantData(tenantId: string): Promise<void> {
  // 1. デフォルトテンプレート5種
  try {
    const templates = defaultTemplates(tenantId);
    const { error } = await supabaseAdmin
      .from("message_templates")
      .insert(templates);
    if (error) {
      console.error(
        `[tenant-seed] テンプレート投入エラー (tenant: ${tenantId}):`,
        error.message,
      );
    } else {
      console.log(
        `[tenant-seed] テンプレート${templates.length}件を投入 (tenant: ${tenantId})`,
      );
    }
  } catch (err) {
    console.error(`[tenant-seed] テンプレート投入例外 (tenant: ${tenantId}):`, err);
  }

  // 2. 問診フォーム雛形
  try {
    const formDef = defaultIntakeFormDefinition(tenantId);
    const { error } = await supabaseAdmin
      .from("intake_form_definitions")
      .insert(formDef);
    if (error) {
      console.error(
        `[tenant-seed] 問診フォーム投入エラー (tenant: ${tenantId}):`,
        error.message,
      );
    } else {
      console.log(
        `[tenant-seed] 問診フォーム雛形を投入 (tenant: ${tenantId})`,
      );
    }
  } catch (err) {
    console.error(
      `[tenant-seed] 問診フォーム投入例外 (tenant: ${tenantId}):`,
      err,
    );
  }

  // 3. AI返信設定初期値
  try {
    const aiSettings = defaultAiReplySettings(tenantId);
    const { error } = await supabaseAdmin
      .from("ai_reply_settings")
      .insert(aiSettings);
    if (error) {
      console.error(
        `[tenant-seed] AI返信設定投入エラー (tenant: ${tenantId}):`,
        error.message,
      );
    } else {
      console.log(
        `[tenant-seed] AI返信設定を投入 (tenant: ${tenantId})`,
      );
    }
  } catch (err) {
    console.error(
      `[tenant-seed] AI返信設定投入例外 (tenant: ${tenantId}):`,
      err,
    );
  }
}
