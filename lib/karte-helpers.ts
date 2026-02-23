// カルテ画面で共通利用するヘルパー関数・型定義

export type IntakeRow = { [key: string]: any };
export type PrescriptionMenu = "2.5mg" | "5mg" | "7.5mg" | "";
export type StatusFilter = "pending" | "all" | "ok" | "ng";

/** 生年月日から年齢文字列を返す */
export function parseDateToAge(birth: string | undefined): string {
  if (!birth) return "";
  const s = `${birth}`.trim();
  if (!s) return "";
  const d = new Date(s.replaceAll(".", "/").replaceAll("-", "/"));
  if (isNaN(d.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return `${age}歳`;
}

/** 生年月日表示用 "1995/12/27" 形式にそろえる */
export function formatBirthDisplay(raw: string | undefined): string {
  if (!raw) return "";
  const s = `${raw}`.trim();
  if (!s) return "";
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }
  return s.replace(/\./g, "/").replace(/-/g, "/").split("T")[0];
}

/** 電話番号表示用：数字だけにして先頭0を保証 */
export function formatTelDisplay(raw: string | undefined): string {
  if (!raw) return "";
  const digits = `${raw}`.replace(/[^0-9]/g, "");
  if (!digits) return "";
  if (digits[0] !== "0") return "0" + digits;
  return digits;
}

/** row から複数のキー候補で値を取得 */
export function pick(row: IntakeRow, keys: string[]): string {
  for (const k of keys) {
    if (row[k] != null && row[k] !== "") return String(row[k]);
  }
  return "";
}

/** 予約IDを取得 */
export function pickReserveId(row: IntakeRow): string {
  return pick(row, ["reserveId", "予約ID", "予約id"]);
}

/** 日付文字列を "YYYY-MM-DD" に正規化 */
export function normalizeDateStr(raw: any): string {
  if (raw == null) return "";
  const s = String(raw).trim();
  if (!s) return "";
  return s.replace(/\./g, "-").replace(/\//g, "-").slice(0, 10);
}

/** "YYYY-MM-DD" → "YYYY/MM/DD" */
export function displayDateSlash(iso: string): string {
  if (!iso) return "";
  return iso.replace(/-/g, "/");
}

/** "10:00" → "10:00-10:15" */
export function makeTimeRangeLabel(timeStr: string, minutes = 15): string {
  if (!timeStr) return "";
  const [hStr, mStr] = timeStr.split(":");
  let h = Number(hStr);
  let m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return "";

  const startH = String(h).padStart(2, "0");
  const startM = String(m).padStart(2, "0");

  m += minutes;
  if (m >= 60) {
    h += Math.floor(m / 60);
    m = m % 60;
  }
  const endH = String(h).padStart(2, "0");
  const endM = String(m).padStart(2, "0");

  return `${startH}:${startM}-${endH}:${endM}`;
}

/** 週ラベル "2/23（日）" 形式 */
export function formatWeekLabel(iso: string): string {
  const d = new Date(iso);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${m}/${day}（${weekday}）`;
}

/** 下書きキー */
export function draftKeyOf(reserveId: string): string {
  return `drui_chart_draft_${reserveId}`;
}
