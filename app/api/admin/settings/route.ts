// app/api/admin/settings/route.ts — テナント設定 API
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getSetting, setSetting, getSettingsBulk, type SettingCategory } from "@/lib/settings";
import { maskValue } from "@/lib/crypto";
import { resolveTenantId } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { settingsUpdateSchema } from "@/lib/validations/admin-operations";

// 管理可能な設定キーの定義
// sensitive: false → 値をマスクせずにそのまま返す（checkout_mode等の選択肢型設定）
type SettingDef = { key: string; label: string; envFallback?: string; sensitive?: boolean };
const SETTING_DEFINITIONS: Record<SettingCategory, SettingDef[]> = {
  square: [
    { key: "access_token", label: "Access Token", envFallback: "SQUARE_ACCESS_TOKEN" },
    { key: "application_id", label: "Application ID", envFallback: "SQUARE_APPLICATION_ID" },
    { key: "location_id", label: "Location ID", envFallback: "SQUARE_LOCATION_ID" },
    { key: "webhook_signature_key", label: "Webhook Signature Key", envFallback: "SQUARE_WEBHOOK_SIGNATURE_KEY" },
    { key: "env", label: "環境 (sandbox / production)", envFallback: "SQUARE_ENV", sensitive: false },
    { key: "3ds_enabled", label: "3Dセキュア (true / false)", sensitive: false },
  ],
  gmo: [
    { key: "shop_id", label: "ショップID", envFallback: "GMO_SHOP_ID" },
    { key: "shop_pass", label: "ショップパスワード", envFallback: "GMO_SHOP_PASS" },
    { key: "site_id", label: "サイトID", envFallback: "GMO_SITE_ID" },
    { key: "site_pass", label: "サイトパスワード", envFallback: "GMO_SITE_PASS" },
    { key: "env", label: "環境 (sandbox / production)", envFallback: "GMO_ENV", sensitive: false },
  ],
  line: [
    { key: "channel_id", label: "Channel ID (OAuth)", envFallback: "LINE_CHANNEL_ID" },
    { key: "channel_secret", label: "Channel Secret (OAuth)", envFallback: "LINE_CHANNEL_SECRET" },
    { key: "channel_access_token", label: "MAPI Channel Access Token", envFallback: "LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN" },
    { key: "notify_channel_secret", label: "通知Bot Channel Secret", envFallback: "LINE_NOTIFY_CHANNEL_SECRET" },
    { key: "notify_channel_access_token", label: "通知Bot Channel Access Token", envFallback: "LINE_NOTIFY_CHANNEL_ACCESS_TOKEN" },
    { key: "admin_group_id", label: "管理グループID", envFallback: "LINE_ADMIN_GROUP_ID" },
    { key: "redirect_uri", label: "OAuth Redirect URI", envFallback: "LINE_REDIRECT_URI" },
  ],
  gas: [],
  general: [
    { key: "clinic_name", label: "クリニック名", sensitive: false },
    { key: "app_base_url", label: "App Base URL", envFallback: "APP_BASE_URL", sensitive: false },
  ],
  payment: [
    { key: "provider", label: "決済プロバイダー", sensitive: false },
    { key: "checkout_mode", label: "チェックアウトモード (hosted / inline)", sensitive: false },
    { key: "reconcile_mode", label: "振込照合モード (order_based / statement_based)", sensitive: false },
    { key: "bank_accounts", label: "振込先口座情報（JSON）", sensitive: false },
    { key: "active_bank_account_id", label: "アクティブ口座ID", sensitive: false },
  ],
  mypage: [
    { key: "config", label: "マイページ設定（JSON）" },
  ],
  flex: [
    { key: "config", label: "FLEX通知設定（JSON）" },
  ],
  sms: [
    { key: "account_sid", label: "Twilio Account SID", envFallback: "TWILIO_ACCOUNT_SID" },
    { key: "auth_token", label: "Twilio Auth Token", envFallback: "TWILIO_AUTH_TOKEN" },
    { key: "verify_sid", label: "Twilio Verify SID", envFallback: "TWILIO_VERIFY_SID" },
  ],
  dashboard: [],
  feature_flags: [],
  consultation: [
    { key: "type", label: "診察モード", sensitive: false },
    { key: "line_call_url", label: "LINEコールURL", sensitive: false },
    { key: "reorder_requires_reservation", label: "再処方時に予約必須", sensitive: false },
  ],
  notification: [
    { key: "cron_slack_webhook_url", label: "Cron通知 Slack Webhook URL" },
    { key: "cron_notify_line_uid", label: "Cron通知 LINE UID" },
  ],
  report: [
    { key: "enabled", label: "レポート送信", sensitive: false },
    { key: "frequency", label: "送信頻度", sensitive: false },
    { key: "emails", label: "送信先メールアドレス", sensitive: false },
  ],
  ehr: [
    { key: "provider", label: "連携プロバイダー", sensitive: false },
    { key: "sync_direction", label: "同期方向", sensitive: false },
    { key: "auto_sync", label: "自動同期", sensitive: false },
    { key: "orca_host", label: "ORCAホスト" },
    { key: "orca_port", label: "ORCAポート" },
    { key: "orca_user", label: "ORCAユーザー" },
    { key: "orca_password", label: "ORCAパスワード" },
    { key: "orca_is_web", label: "WebORCA" },
    { key: "fhir_base_url", label: "FHIRサーバーURL" },
    { key: "fhir_auth_type", label: "FHIR認証方式" },
    { key: "fhir_token", label: "FHIRトークン" },
    { key: "fhir_username", label: "FHIRユーザー名" },
    { key: "fhir_password", label: "FHIRパスワード" },
  ],
  business_rules: [
    { key: "dosage_change_notify", label: "用量変更時の管理者通知", sensitive: false },
    { key: "min_reorder_interval_days", label: "再処方間隔の最低日数", sensitive: false },
    { key: "notify_reorder_apply", label: "再処方申請通知", sensitive: false },
    { key: "notify_reorder_approve", label: "再処方承認通知", sensitive: false },
    { key: "notify_reorder_paid", label: "決済完了通知", sensitive: false },
    { key: "approve_message", label: "承認通知メッセージ", sensitive: false },
    { key: "intake_reminder_hours", label: "問診後リマインダー（時間）", sensitive: false },
    { key: "payment_thank_message", label: "決済完了メッセージ", sensitive: false },
    { key: "auto_approve_same_dose", label: "同量再処方の自動承認", sensitive: false },
    { key: "notify_no_answer", label: "不通時LINE自動通知", sensitive: false },
    { key: "no_answer_message", label: "不通通知メッセージ", sensitive: false },
  ],
};

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return unauthorized();
  }

  const tenantId = resolveTenantId(req);
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") as SettingCategory | null;

  const categories = category ? [category] : (Object.keys(SETTING_DEFINITIONS) as SettingCategory[]);

  // 単一カテゴリで特定キーのみ必要な場合（consultation等）はフラット形式で返す
  if (category) {
    const bulk = await getSettingsBulk([category], tenantId ?? undefined);
    const flat: Record<string, string> = {};
    for (const [k, v] of bulk) {
      const key = k.split(":")[1]; // "consultation:line_call_url" → "line_call_url"
      flat[key] = v;
    }
    return NextResponse.json({ settings: flat });
  }

  // 全カテゴリ一括取得（1回のDBクエリ）
  const bulk = await getSettingsBulk(categories, tenantId ?? undefined);

  const result: Record<string, { key: string; label: string; maskedValue: string | null; source: "db" | "env" | "none" }[]> = {};

  for (const cat of categories) {
    const defs = SETTING_DEFINITIONS[cat] || [];
    result[cat] = defs.map((def) => {
      const dbValue = bulk.get(`${cat}:${def.key}`);
      const shouldMask = def.sensitive !== false;
      if (dbValue) {
        return { key: def.key, label: def.label, maskedValue: shouldMask ? maskValue(dbValue) : dbValue, source: "db" as const };
      }
      if (def.envFallback && process.env[def.envFallback]) {
        const envVal = process.env[def.envFallback]!;
        return { key: def.key, label: def.label, maskedValue: shouldMask ? maskValue(envVal) : envVal, source: "env" as const };
      }
      return { key: def.key, label: def.label, maskedValue: null, source: "none" as const };
    });
  }

  return NextResponse.json({ settings: result, definitions: SETTING_DEFINITIONS });
}

export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return unauthorized();
  }

  const tenantId = resolveTenantId(req);
  const parsed = await parseBody(req, settingsUpdateSchema);
  if ("error" in parsed) return parsed.error;
  const { category, key, value } = parsed.data as { category: SettingCategory; key: string; value: string };

  // 設定キーがホワイトリストに含まれるか確認
  const defs = SETTING_DEFINITIONS[category];
  if (!defs || !defs.find((d) => d.key === key)) {
    return badRequest("不正な設定キーです");
  }

  const success = await setSetting(category, key, value, tenantId ?? undefined);
  if (!success) {
    return serverError("設定の保存に失敗しました");
  }

  return NextResponse.json({ success: true, maskedValue: maskValue(value) });
}
