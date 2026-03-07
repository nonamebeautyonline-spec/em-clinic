// lib/business-hours.ts — 営業時間判定ロジック

import { supabaseAdmin } from "@/lib/supabase";

/** 曜日キー（月〜日） */
export type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

/** 曜日別の営業時間 */
export interface DaySchedule {
  start: string; // "09:00" 形式
  end: string;   // "18:00" 形式
  closed: boolean; // 定休日フラグ
}

/** 営業時間設定 */
export interface BusinessHoursConfig {
  enabled: boolean;
  schedule: Record<DayOfWeek, DaySchedule>;
  timezone: string; // "Asia/Tokyo"
  outside_message: string; // 営業時間外メッセージ
}

/** 曜日ラベル（UI表示用） */
export const DAY_LABELS: Record<DayOfWeek, string> = {
  mon: "月",
  tue: "火",
  wed: "水",
  thu: "木",
  fri: "金",
  sat: "土",
  sun: "日",
};

/** 全曜日キーの配列（順序固定） */
export const ALL_DAYS: DayOfWeek[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/** デフォルトの営業時間設定 */
export const DEFAULT_BUSINESS_HOURS: BusinessHoursConfig = {
  enabled: false,
  schedule: {
    mon: { start: "09:00", end: "18:00", closed: false },
    tue: { start: "09:00", end: "18:00", closed: false },
    wed: { start: "09:00", end: "18:00", closed: false },
    thu: { start: "09:00", end: "18:00", closed: false },
    fri: { start: "09:00", end: "18:00", closed: false },
    sat: { start: "09:00", end: "18:00", closed: true },
    sun: { start: "09:00", end: "18:00", closed: true },
  },
  timezone: "Asia/Tokyo",
  outside_message: "営業時間外のため、翌営業日にご返信いたします。",
};

/**
 * JavaScriptの Date.getDay() (0=日, 1=月, ..., 6=土) を DayOfWeek に変換
 */
function jsDayToDayOfWeek(jsDay: number): DayOfWeek {
  const map: DayOfWeek[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return map[jsDay];
}

/**
 * "HH:MM" 形式の時刻を分数に変換
 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * 指定した日時が営業時間内かどうかを判定（純粋関数）
 * @param config 営業時間設定
 * @param now 判定対象の日時（タイムゾーン適用済み）
 * @returns 営業時間内ならtrue
 */
export function checkBusinessHours(
  config: BusinessHoursConfig,
  now: Date
): boolean {
  // 機能が無効なら常に「営業時間内」として扱う
  if (!config.enabled) return true;

  // 指定タイムゾーンでの曜日・時刻を取得
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: config.timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const weekdayPart = parts.find(p => p.type === "weekday")?.value || "";
  const hourPart = parts.find(p => p.type === "hour")?.value || "0";
  const minutePart = parts.find(p => p.type === "minute")?.value || "0";

  // weekday を DayOfWeek に変換
  const weekdayMap: Record<string, DayOfWeek> = {
    Mon: "mon", Tue: "tue", Wed: "wed", Thu: "thu",
    Fri: "fri", Sat: "sat", Sun: "sun",
  };
  const dayOfWeek = weekdayMap[weekdayPart];
  if (!dayOfWeek) return true; // 変換失敗時は安全側（営業時間内）

  const daySchedule = config.schedule[dayOfWeek];
  if (!daySchedule) return true; // スケジュール未定義なら営業時間内扱い

  // 定休日チェック
  if (daySchedule.closed) return false;

  // 時刻チェック
  const currentMinutes = Number(hourPart) * 60 + Number(minutePart);
  const startMinutes = timeToMinutes(daySchedule.start);
  const endMinutes = timeToMinutes(daySchedule.end);

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * テナントの営業時間設定をDBから取得
 */
export async function getBusinessHoursConfig(
  tenantId: string | null
): Promise<BusinessHoursConfig> {
  try {
    let query = supabaseAdmin
      .from("tenant_settings")
      .select("value")
      .eq("category", "ai_reply")
      .eq("key", "business_hours");

    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    } else {
      query = query.is("tenant_id", null);
    }

    const { data, error } = await query.maybeSingle();
    if (error || !data?.value) return DEFAULT_BUSINESS_HOURS;

    // value は JSONB なのでそのままパースできる
    const stored = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
    return { ...DEFAULT_BUSINESS_HOURS, ...stored };
  } catch (err) {
    console.error("[BusinessHours] 設定取得エラー:", err);
    return DEFAULT_BUSINESS_HOURS;
  }
}

/**
 * 現在時刻が営業時間内かチェック（テナント設定をDBから取得して判定）
 * @returns { withinHours: boolean, outsideMessage: string | null }
 */
export async function isWithinBusinessHours(
  tenantId: string | null
): Promise<{ withinHours: boolean; outsideMessage: string | null }> {
  const config = await getBusinessHoursConfig(tenantId);

  if (!config.enabled) {
    return { withinHours: true, outsideMessage: null };
  }

  const now = new Date();
  const within = checkBusinessHours(config, now);

  return {
    withinHours: within,
    outsideMessage: within ? null : config.outside_message,
  };
}
