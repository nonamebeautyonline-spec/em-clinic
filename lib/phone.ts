// lib/phone.ts
// 日本の電話番号を正規化するユーティリティ

/**
 * 日本の携帯電話番号を正規化
 * - ハイフンや空白を除去
 * - 0080/0090/0070 → 080/090/070 に変換
 * - 80/90/70 → 080/090/070 に変換
 * - 81プレフィックス（国際番号）を処理
 */
export function normalizeJPPhone(raw: string): string {
  const s = (raw || "").trim();
  if (!s) return "";

  // 数字のみ抽出
  let digits = s.replace(/[^\d]/g, "");
  if (!digits) return "";

  // ★ 0080/0090/0070 を 080/090/070 に変換
  if (digits.startsWith("0080")) {
    digits = "080" + digits.slice(4);
  } else if (digits.startsWith("0090")) {
    digits = "090" + digits.slice(4);
  } else if (digits.startsWith("0070")) {
    digits = "070" + digits.slice(4);
  }
  // その他の00プレフィックス → 先頭の0を1つだけ除去（0043→043 等の固定番号にも対応）
  else if (digits.startsWith("00")) {
    digits = digits.slice(1);
  }

  // 81（国際番号）を削除（11桁以上の場合のみ）
  // 例: 819012345678 → 09012345678, 8108012345678 → 08012345678
  if (digits.startsWith("81") && digits.length >= 11) {
    digits = digits.slice(2);
    if (!digits.startsWith("0")) {
      digits = "0" + digits;
    }
  }

  // 先頭に0がなく、7/8/9で始まる場合は0を追加 (80/90/70 → 080/090/070)
  if (!digits.startsWith("0") && /^[789]/.test(digits)) {
    digits = "0" + digits;
  }

  return digits;
}
