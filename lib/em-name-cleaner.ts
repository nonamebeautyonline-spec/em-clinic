// lib/em-name-cleaner.ts
// EMオンラインクリニックの氏名フィールドクリーニング
// 発送時の業務メモ（絵文字+接頭語）が氏名に混在しているため除去する

/**
 * EM氏名フィールドのクリーニング
 *
 * EMでは発送時の注意事項を氏名フィールドに記載していた:
 *   🟥郵便局　田中 → 田中
 *   ⭕️診断書　鈴木 → 鈴木
 *   ❌要確認 山田太郎 → 山田太郎
 *   田中彩奈 → 田中彩奈（そのまま）
 */
export function cleanEmName(raw: string): { cleaned: string; raw: string } {
  const trimmed = (raw || "").trim();
  if (!trimmed) return { cleaned: "", raw: trimmed };

  // 1. 先頭の絵文字・記号を除去（Unicode絵文字、丸囲み文字、その他記号）
  let s = trimmed.replace(
    /^[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}\u{2B50}\u{2705}\u{274C}\u{2B55}\u{26AA}\u{26AB}\u{25CF}\u{25CB}\u{25A0}\u{25A1}\u{2764}\u{2716}\u{2714}\u{23F0}-\u{23FA}\u{2934}\u{2935}\u{25AA}\u{25AB}\u{25FE}\u{25FD}\u{25FC}\u{25FB}\u{2B1B}\u{2B1C}\u{3030}\u{303D}\u{FE0E}]+/u,
    "",
  ).trim();

  // 2. 既知の業務メモ接頭語を除去
  const prefixes = [
    "郵便局", "診断書", "要確認", "確認済", "確認済み",
    "発送済", "発送済み", "返品", "保留", "キャンセル",
    "再発送", "転送", "書留", "速達", "レターパック",
    "ゆうパック", "宅急便", "クリックポスト", "ネコポス",
  ];
  for (const prefix of prefixes) {
    if (s.startsWith(prefix)) {
      s = s.slice(prefix.length).trim();
      break;
    }
  }

  // 3. 全角/半角スペースで分割し、最後の要素（＝実氏名）を取得
  //    ただし分割後が1要素の場合はそのまま返す
  //    「田中 太郎」のような普通の姓名はスペース含みで返す
  const parts = s.split(/[\s　]+/).filter(Boolean);
  if (parts.length >= 2) {
    // 最初の要素が業務メモっぽい場合（漢字1-3文字で人名っぽくない）のみ除去
    // → 安全策: 先頭に絵文字除去済みの業務メモが残っている場合のみ
    // 普通の姓名（田中 太郎）はそのまま結合して返す
    // ヒューリスティック: 最初の要素がprefixesに含まれる場合のみ除去
    const firstPart = parts[0];
    if (prefixes.some((p) => firstPart.includes(p))) {
      s = parts.slice(1).join("");
    } else {
      // 普通の姓名 → スペースなしで結合（「田中 太郎」→「田中太郎」）
      s = parts.join("");
    }
  }

  return { cleaned: s || trimmed, raw: trimmed };
}
