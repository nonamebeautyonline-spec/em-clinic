/**
 * 住所バリデーションユーティリティ
 * 住所の都道府県重複を検出する
 */

const PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
  "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
  "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
  "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
] as const;

/**
 * 住所に都道府県が重複して含まれていないかチェック
 *
 * 例:
 *  - 「東京都東京都新宿区...」→ true（都道府県2連続）
 *  - 「北海道札幌市清田区平岡四条北海道札幌市...」→ true（途中で再出現）
 *  - 「東京都板橋区仲宿15-2リルシア板橋区役所前103」→ false（建物名に区名が含まれるだけ）
 */
export function hasAddressDuplication(address: string): boolean {
  if (!address) return false;
  const trimmed = address.trim();

  for (const pref of PREFECTURES) {
    if (trimmed.startsWith(pref)) {
      const rest = trimmed.slice(pref.length);
      if (rest.includes(pref)) return true;
    }
  }
  return false;
}

/**
 * addressDetail（丁目以降の入力欄）が都道府県で始まっているかチェック
 * ユーザーがautoAddressに気づかずフルアドレスを入力した場合を検出
 */
export function addressDetailStartsWithPrefecture(detail: string): boolean {
  if (!detail) return false;
  const trimmed = detail.trim();
  return PREFECTURES.some((pref) => trimmed.startsWith(pref));
}
