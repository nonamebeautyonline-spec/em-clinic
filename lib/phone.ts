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
  // 00プレフィックスを削除（国際電話の発信コード）
  else if (digits.startsWith("00")) {
    digits = digits.slice(2);
    // 00削除後に7/8/9で始まる場合は0を追加
    if (/^[789]/.test(digits)) {
      digits = "0" + digits;
    }
  }

  // 81（国際番号）を削除して0を追加
  if (digits.startsWith("81")) {
    digits = "0" + digits.slice(2);
  }

  // 先頭に0がなく、7/8/9で始まる場合は0を追加 (80/90/70 → 080/090/070)
  if (!digits.startsWith("0") && /^[789]/.test(digits)) {
    digits = "0" + digits;
  }

  return digits;
}
