// lib/shipping/shipping-date.ts — 発送予定日計算
//
// 通常便（delayDays=0）: 締め時間前の決済→当日発送、それ以降→翌日発送
// 予約便（delayDays>0）: 締め時間基準でdelayDays後の日付に発送
//   例: delayDays=10, cutoffHour=9 → 4/2 9時前決済 → 4/11発送

/**
 * 発送予定日を計算
 * @param paidAt 決済日時
 * @param delayDays 発送遅延日数（0=通常便、N=N日後）
 * @param cutoffHour 当日発送の締め時間（0-23）
 * @returns 発送予定日（Date、時刻は00:00:00 JST）
 */
export function calculateShippingDate(
  paidAt: Date,
  delayDays: number,
  cutoffHour: number,
): Date {
  // JST変換（UTC+9）
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstTime = new Date(paidAt.getTime() + jstOffset);
  const jstHour = jstTime.getUTCHours();

  if (delayDays === 0) {
    // 通常便: 締め時間前→当日、それ以降→翌日
    const baseDate = new Date(Date.UTC(jstTime.getUTCFullYear(), jstTime.getUTCMonth(), jstTime.getUTCDate()));
    if (jstHour >= cutoffHour) {
      baseDate.setUTCDate(baseDate.getUTCDate() + 1);
    }
    return baseDate;
  }

  // 予約便: 締め時間基準でdelayDays後
  // 例: cutoffHour=9, delayDays=10
  // 4/2 8:59 → 基準日=4/2 → 4/12発送
  // 4/2 9:01 → 基準日=4/3 → 4/13発送
  const baseDate = new Date(Date.UTC(jstTime.getUTCFullYear(), jstTime.getUTCMonth(), jstTime.getUTCDate()));
  if (jstHour >= cutoffHour) {
    baseDate.setUTCDate(baseDate.getUTCDate() + 1);
  }
  baseDate.setUTCDate(baseDate.getUTCDate() + delayDays);
  return baseDate;
}

/**
 * 発送予定日をYYYY-MM-DD形式で返す
 */
export function formatShippingDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * 住所変更が可能か判定
 * @param shippingDate 発送予定日
 * @param cutoffHour 住所変更締め時間
 * @returns true=変更可能
 */
export function canChangeAddress(
  shippingDate: Date,
  cutoffHour: number,
): boolean {
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstNow = new Date(now.getTime() + jstOffset);
  const jstToday = new Date(Date.UTC(jstNow.getUTCFullYear(), jstNow.getUTCMonth(), jstNow.getUTCDate()));

  // 発送予定日が今日でなければ変更可能
  if (shippingDate.getTime() !== jstToday.getTime()) {
    return shippingDate.getTime() > jstToday.getTime();
  }

  // 発送予定日が今日の場合、締め時間前なら変更可能
  return jstNow.getUTCHours() < cutoffHour;
}
