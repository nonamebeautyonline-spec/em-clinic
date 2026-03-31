// lib/salon-lifecycle.ts — サロン顧客ライフサイクルロジック
// 休眠顧客リマインド・バースデークーポン配信のコアロジック

import { supabaseAdmin } from "@/lib/supabase";

// ── 型定義 ──────────────────────────────────────────

export interface DormantCustomer {
  patientId: string; // patients.patient_id (TEXT)
  dbId: number; // patients.id (BIGINT)
  name: string;
  lineId: string;
  daysSinceVisit: number;
  lastVisitDate: string;
}

export interface BirthdayCustomer {
  patientId: string;
  dbId: number;
  name: string;
  lineId: string;
  birthday: string;
}

type LineMessage =
  | { type: "text"; text: string }
  | { type: "flex"; altText: string; contents: Record<string, unknown> };

// ── 休眠閾値 ───────────────────────────────────────

export const DORMANT_THRESHOLDS = {
  warning: 30, // 30日: 来店促進リマインド
  alert: 60, // 60日: 特別オファー付きリマインド
  critical: 90, // 90日: 最終リマインド
} as const;

export type DormantLevel = keyof typeof DORMANT_THRESHOLDS;

// ── 休眠顧客検出 ───────────────────────────────────

/**
 * 指定閾値の休眠顧客を検出
 * - salon_visits の MAX(visit_date) が thresholdDays 以上前
 * - 同月に同レベルのリマインド送信済みは除外（message_log チェック）
 * - .in() URL長制限回避のためテナント全件取得→JSフィルタ
 */
export async function findDormantCustomers(
  tenantId: string,
  thresholdDays: number,
  level: DormantLevel
): Promise<DormantCustomer[]> {
  const today = new Date();
  const cutoffDate = new Date(today);
  cutoffDate.setDate(cutoffDate.getDate() - thresholdDays);
  const cutoffStr = cutoffDate.toISOString().slice(0, 10);

  // 次の段階の閾値（上限）— 例: warning(30)なら60日未満のみ
  const nextThreshold = getNextThreshold(thresholdDays);
  const upperCutoff = nextThreshold
    ? new Date(today.getTime() - nextThreshold * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10)
    : null;

  // salon_visits テナント全件取得（patient_id, visit_date）
  const { data: visits, error: visitsErr } = await supabaseAdmin
    .from("salon_visits")
    .select("patient_id, visit_date")
    .eq("tenant_id", tenantId)
    .limit(100000);

  if (visitsErr || !visits?.length) return [];

  // 患者ごとの最終来店日を集計
  const lastVisitMap = new Map<number, string>();
  for (const v of visits) {
    const pid = v.patient_id as number;
    const current = lastVisitMap.get(pid);
    if (!current || v.visit_date > current) {
      lastVisitMap.set(pid, v.visit_date as string);
    }
  }

  // 閾値範囲内の患者を抽出
  const targetPatientIds: number[] = [];
  const lastVisitDates = new Map<number, string>();
  for (const [pid, lastDate] of lastVisitMap) {
    if (lastDate <= cutoffStr && (!upperCutoff || lastDate > upperCutoff)) {
      targetPatientIds.push(pid);
      lastVisitDates.set(pid, lastDate);
    }
  }

  if (targetPatientIds.length === 0) return [];

  // 患者情報取得（テナント全件→JSフィルタ）
  const { data: patients } = await supabaseAdmin
    .from("patients")
    .select("id, patient_id, name, line_id")
    .eq("tenant_id", tenantId)
    .limit(100000);

  if (!patients?.length) return [];

  const targetSet = new Set(targetPatientIds);
  const matchedPatients = patients.filter(
    (p: { id: number; line_id: string | null }) =>
      targetSet.has(p.id) && p.line_id
  );

  if (matchedPatients.length === 0) return [];

  // 今月の同レベルリマインド送信済みチェック（message_log）
  const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const { data: sentLogs } = await supabaseAdmin
    .from("message_log")
    .select("patient_id, content")
    .eq("tenant_id", tenantId)
    .eq("direction", "outgoing")
    .eq("status", "sent")
    .gte("created_at", monthStart)
    .like("content", `%salon_dormant_${level}%`)
    .limit(100000);

  const alreadySent = new Set(
    (sentLogs || []).map((l: { patient_id: string }) => String(l.patient_id))
  );

  const results: DormantCustomer[] = [];
  for (const p of matchedPatients) {
    if (alreadySent.has(String(p.patient_id))) continue;

    const lastDate = lastVisitDates.get(p.id as number);
    if (!lastDate) continue;

    const diffMs = today.getTime() - new Date(lastDate).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    results.push({
      patientId: p.patient_id as string,
      dbId: p.id as number,
      name: (p.name as string) || "お客様",
      lineId: p.line_id as string,
      daysSinceVisit: diffDays,
      lastVisitDate: lastDate,
    });
  }

  return results;
}

/**
 * 次の段階の閾値を返す（重複防止用）
 */
function getNextThreshold(days: number): number | null {
  const sorted = (Object.values(DORMANT_THRESHOLDS) as number[]).sort((a, b) => a - b);
  const idx = sorted.indexOf(days);
  return idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null;
}

// ── 休眠リマインドメッセージ生成 ──────────────────

/**
 * 休眠段階に応じたLINEメッセージを生成
 * content にトラッキング用タグ salon_dormant_{level} を含める
 */
export function buildDormantReminderMessage(
  daysSinceVisit: number,
  customerName: string,
  level: DormantLevel
): LineMessage {
  const name = customerName || "お客様";

  if (level === "warning") {
    // 30日: やわらかい来店促進
    return {
      type: "text",
      text:
        `${name}様、いつもご利用ありがとうございます✨\n\n` +
        `前回のご来店から${daysSinceVisit}日が経ちました。\n` +
        `そろそろお手入れの時期ではないでしょうか？\n\n` +
        `ご予約お待ちしております😊\n` +
        `[salon_dormant_warning]`,
    };
  }

  if (level === "alert") {
    // 60日: 特別オファー付き
    return {
      type: "text",
      text:
        `${name}様、お久しぶりです💐\n\n` +
        `前回のご来店から${daysSinceVisit}日が経ちました。\n` +
        `ぜひまたお会いしたいです！\n\n` +
        `【特別ご案内】\n` +
        `次回ご来店時、トリートメントをサービスいたします🎁\n` +
        `※このメッセージをスタッフにお見せください\n\n` +
        `ご予約をお待ちしております！\n` +
        `[salon_dormant_alert]`,
    };
  }

  // critical: 90日 — 最終リマインド
  return {
    type: "text",
    text:
      `${name}様、その後いかがお過ごしでしょうか？\n\n` +
      `前回のご来店から${daysSinceVisit}日が経ちました。\n` +
      `髪やお肌のお悩みがございましたら、いつでもお気軽にご相談ください。\n\n` +
      `スタッフ一同、${name}様のご来店を心よりお待ちしております。\n` +
      `[salon_dormant_critical]`,
  };
}

// ── バースデー対象顧客検出 ──────────────────────────

/**
 * 今月誕生日の顧客を検出
 * - patients.birthday の月が今月
 * - LINE ID を持つ顧客のみ
 * - 今月にバースデークーポン未発行（coupon_issues チェック）
 */
export async function findBirthdayCustomers(
  tenantId: string
): Promise<BirthdayCustomer[]> {
  const today = new Date();
  const currentMonth = String(today.getMonth() + 1).padStart(2, "0");

  // テナントの全患者を取得（.in() URL長制限回避）
  const { data: patients, error: pErr } = await supabaseAdmin
    .from("patients")
    .select("id, patient_id, name, line_id, birthday")
    .eq("tenant_id", tenantId)
    .not("birthday", "is", null)
    .not("line_id", "is", null)
    .limit(100000);

  if (pErr || !patients?.length) return [];

  // 今月誕生日の患者をフィルタ
  // birthday フォーマット: "YYYY-MM-DD" or "YYYY/MM/DD"
  const birthdayPatients = patients.filter((p: { birthday: string }) => {
    const bd = p.birthday;
    if (!bd) return false;
    // MM部分を抽出（ハイフン/スラッシュ両対応）
    const match = bd.match(/\d{4}[-/](\d{2})[-/]\d{2}/);
    return match && match[1] === currentMonth;
  });

  if (birthdayPatients.length === 0) return [];

  // 今月のバースデークーポン発行済みチェック
  // coupon_issues テナント全件取得→JSフィルタ
  const monthStart = `${today.getFullYear()}-${currentMonth}-01`;
  const { data: issues } = await supabaseAdmin
    .from("coupon_issues")
    .select("patient_id")
    .eq("tenant_id", tenantId)
    .gte("issued_at", monthStart)
    .limit(100000);

  // message_logでもバースデーメッセージ送信済みチェック
  const { data: sentLogs } = await supabaseAdmin
    .from("message_log")
    .select("patient_id")
    .eq("tenant_id", tenantId)
    .eq("direction", "outgoing")
    .eq("status", "sent")
    .gte("created_at", monthStart)
    .like("content", "%salon_birthday_coupon%")
    .limit(100000);

  const issuedPatients = new Set(
    (issues || []).map((i: { patient_id: string }) => String(i.patient_id))
  );
  const sentPatients = new Set(
    (sentLogs || []).map((l: { patient_id: string }) => String(l.patient_id))
  );

  const results: BirthdayCustomer[] = [];
  for (const p of birthdayPatients) {
    const pid = String(p.patient_id);
    // coupon_issues と message_log 両方で未処理のもののみ
    if (issuedPatients.has(pid) || sentPatients.has(pid))
      continue;

    results.push({
      patientId: p.patient_id as string,
      dbId: p.id as number,
      name: (p.name as string) || "お客様",
      lineId: p.line_id as string,
      birthday: p.birthday as string,
    });
  }

  return results;
}

// ── バースデーメッセージ生成 ──────────────────────────

/**
 * バースデークーポン用LINEメッセージを生成
 */
export function buildBirthdayMessage(
  customerName: string,
  couponCode: string,
  discountText: string,
  validUntil: string
): LineMessage {
  const name = customerName || "お客様";

  return {
    type: "text",
    text:
      `🎂 ${name}様、お誕生日おめでとうございます！🎉\n\n` +
      `日頃のご愛顧に感謝を込めて、バースデークーポンをお届けします💝\n\n` +
      `【バースデー特別クーポン】\n` +
      `${discountText}\n` +
      `クーポンコード: ${couponCode}\n` +
      `有効期限: ${validUntil}\n\n` +
      `ぜひこの機会にご来店ください✨\n` +
      `ご予約をお待ちしております！\n` +
      `[salon_birthday_coupon]`,
  };
}
