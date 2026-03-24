// lib/auto-reminder.ts — 自動リマインド共通関数
// send-reminder/route.ts と generate-reminders cron の両方から使用

/**
 * 予約時間を "2026/2/8 13:00-13:15" 形式にフォーマット
 */
export function formatReservationTime(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split("-");
  const hhmm = timeStr.slice(0, 5); // "13:00"
  const [hh, mm] = hhmm.split(":").map(Number);
  // 15分後の終了時間
  const endMin = mm + 15;
  const endHH = endMin >= 60 ? hh + 1 : hh;
  const endMM = endMin >= 60 ? endMin - 60 : endMin;
  const endTime = `${endHH}:${String(endMM).padStart(2, "0")}`;
  return `${y}/${Number(m)}/${Number(d)} ${hhmm}-${endTime}`;
}

/**
 * 当日リマインドのテキストメッセージ本文を生成
 */
export function buildReminderMessage(reservationTime: string): string {
  return `本日、診療のご予約がございます。

予約日時：${reservationTime}

詳細につきましてはマイページよりご確認ください。

診療は、予約時間枠の間に「090-」から始まる番号よりお電話いたします。
知らない番号からの着信を受け取れない設定になっている場合は、
事前にご連絡いただけますと幸いです。

なお、診療時間にご連絡なくご対応いただけなかった場合、
次回以降のご予約が取りづらくなる可能性がございます。

キャンセルや予約内容の変更をご希望の場合は、
必ず事前にマイページよりお手続きをお願いいたします。

本日もどうぞよろしくお願いいたします。`;
}

/**
 * JST日付に1日加算（YYYY-MM-DD → 翌日の YYYY-MM-DD）
 */
export function addOneDay(ymd: string): string {
  return addDays(ymd, 1);
}

/**
 * JST日付にN日加算（YYYY-MM-DD → N日後の YYYY-MM-DD）
 */
export function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * 現在のJST時刻をDateで返す
 */
export function getJSTNow(): Date {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

/**
 * 予約日時がN時間前ウィンドウ内にあるか判定
 * cronが毎時0分に実行される前提で、1時間ウィンドウ（現在〜1時間後）で判定
 * 例: beforeHours=3, 予約が15:00 → 12:00〜13:00のcronで送信対象
 */
export function isReservationInHoursWindow(
  reservedDate: string,
  reservedTime: string,
  beforeHours: number,
): boolean {
  const [y, m, d] = reservedDate.split("-").map(Number);
  const [hh, mm] = (reservedTime || "00:00").substring(0, 5).split(":").map(Number);
  // 予約日時（UTC表現のJST）
  const reservationMs = Date.UTC(y, m - 1, d, hh - 9, mm); // JST→UTC変換
  // 送信すべき時刻 = 予約日時 - N時間
  const sendAtMs = reservationMs - beforeHours * 60 * 60 * 1000;
  const nowMs = Date.now();
  // 現在〜1時間後のウィンドウ内に送信時刻があるか
  return sendAtMs >= nowMs && sendAtMs < nowMs + 60 * 60 * 1000;
}

/**
 * 現在のJST日付を YYYY-MM-DD 形式で返す
 */
export function getJSTToday(): string {
  const jstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return jstNow.toISOString().split("T")[0];
}

/**
 * 現在のJST時刻が指定の送信時刻の15分ウィンドウ内か判定
 * cronは15分おきなので、1回のcron実行で必ず1回だけマッチする
 */
export function isInSendWindow(sendHour: number, sendMinute: number): boolean {
  const jstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const nowMinutes = jstNow.getUTCHours() * 60 + jstNow.getUTCMinutes();
  const sendMinutes = sendHour * 60 + sendMinute;

  // ウィンドウ: sendMinutes-14 ≦ nowMinutes ≦ sendMinutes
  return nowMinutes >= sendMinutes - 14 && nowMinutes <= sendMinutes;
}
