// 患者関連の共通ユーティリティ

export function formatProductCode(code: string | null): string {
  if (!code) return "-";
  return code
    .replace("MJL_", "マンジャロ ")
    .replace("_", " ")
    .replace("1m", "1ヶ月")
    .replace("2m", "2ヶ月")
    .replace("3m", "3ヶ月");
}

export function formatPaymentMethod(method: string | null): string {
  if (!method) return "-";
  if (method === "card" || method === "CARD" || method === "credit_card") return "カード";
  if (method === "bank" || method === "BANK_TRANSFER" || method === "bank_transfer") return "銀行振込";
  return method;
}

export function formatReorderStatus(status: string | null): string {
  if (!status) return "-";
  const map: Record<string, string> = {
    pending: "承認待ち",
    confirmed: "承認済み",
    paid: "決済済み",
    rejected: "却下",
    canceled: "キャンセル",
  };
  return map[status] || status;
}

export function formatDateJST(dateStr: string | null): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
    const month = String(jst.getUTCMonth() + 1).padStart(2, "0");
    const day = String(jst.getUTCDate()).padStart(2, "0");
    const hours = String(jst.getUTCHours()).padStart(2, "0");
    const minutes = String(jst.getUTCMinutes()).padStart(2, "0");
    return `${month}/${day} ${hours}:${minutes}`;
  } catch {
    return dateStr.slice(0, 10);
  }
}

export function formatBirthWithEra(dateStr: string | null): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const y = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    let era = "";
    let eraYear = 0;
    if (y >= 2019) { era = "令和"; eraYear = y - 2018; }
    else if (y >= 1989) { era = "平成"; eraYear = y - 1988; }
    else if (y >= 1926) { era = "昭和"; eraYear = y - 1925; }
    else if (y >= 1912) { era = "大正"; eraYear = y - 1911; }
    else { return `${y}/${mm}/${dd}`; }
    return `(${era}${eraYear}年)${y}/${mm}/${dd}`;
  } catch {
    return dateStr;
  }
}

export function formatFullDateTimeJST(dateStr: string | null): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
    const y = jst.getUTCFullYear();
    const mm = String(jst.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(jst.getUTCDate()).padStart(2, "0");
    const hh = String(jst.getUTCHours()).padStart(2, "0");
    const mi = String(jst.getUTCMinutes()).padStart(2, "0");
    return `${y}/${mm}/${dd} ${hh}:${mi}`;
  } catch {
    return dateStr;
  }
}

export function calcAge(birthday: string | null): number | null {
  if (!birthday) return null;
  try {
    const birth = new Date(birthday);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 0 ? age : null;
  } catch {
    return null;
  }
}
