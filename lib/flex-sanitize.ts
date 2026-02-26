// lib/flex-sanitize.ts — LINE Flex Messageサニタイズ共通ユーティリティ
// 全てのFlex送信箇所で使用し、LINE API仕様に準拠しないプロパティを除去・修正する

// バブルコンテナの許可プロパティ（LINE Messaging API公式仕様準拠）
const VALID_BUBBLE_KEYS = new Set([
  "type", "size", "direction", "header", "hero", "body", "footer", "styles", "action",
]);

// バブルらしきオブジェクトか判定（header/hero/body/footerのいずれかを持つ）
function looksLikeBubble(obj: Record<string, unknown>): boolean {
  return !!(obj.header || obj.hero || obj.body || obj.footer);
}

// LINE API仕様にないプロパティ名 → 正しい名前のマッピング
const PROP_RENAMES: Record<string, string> = {
  marginTop: "margin",
  marginBottom: "margin",
};

/**
 * Flex JSON内部の全要素を再帰的に走査し、無効なプロパティ名を修正
 */
export function fixInvalidProps(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;
  if (Array.isArray(data)) return data.map(fixInvalidProps);
  const obj = data as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = PROP_RENAMES[key] ?? key;
    result[newKey] = (typeof value === "object" && value !== null) ? fixInvalidProps(value) : value;
  }
  return result;
}

/**
 * Flexコンテナ（bubble/carousel）をLINE API仕様に準拠するようサニタイズ
 * - 不明なプロパティを除去
 * - type: "bubble" を確実に設定
 * - 再帰的にcarousel内のバブルも処理
 */
export function sanitizeFlexContainer(raw: unknown, depth = 0): unknown {
  if (depth > 5 || !raw || typeof raw !== "object") return raw;

  // 配列 → カルーセルにラップ（単一要素は取り出し）
  if (Array.isArray(raw)) {
    const items = raw.map(item => sanitizeFlexContainer(item, depth + 1));
    return items.length === 1 ? items[0] : { type: "carousel", contents: items };
  }

  const obj = raw as Record<string, unknown>;

  // { type: "flex", contents: X } → Xをアンラップして再帰
  if (obj.type === "flex" && obj.contents) {
    return sanitizeFlexContainer(obj.contents, depth + 1);
  }

  // carousel → contentsのみ保持して再帰
  if (obj.type === "carousel" && Array.isArray(obj.contents)) {
    return {
      type: "carousel",
      contents: (obj.contents as unknown[]).map(item => sanitizeFlexContainer(item, depth + 1)),
    };
  }

  // バブルコンテナ → 許可プロパティのみ残す（type: "bubble" を最初に配置）
  if (obj.type === "bubble" || looksLikeBubble(obj)) {
    const cleaned: Record<string, unknown> = { type: "bubble" };
    for (const key of Object.keys(obj)) {
      if (key !== "type" && VALID_BUBBLE_KEYS.has(key)) {
        cleaned[key] = obj[key];
      }
    }
    return cleaned;
  }

  return obj;
}

/**
 * Flex contentsに対して fixInvalidProps + sanitizeFlexContainer を一括適用
 * 全てのFlex送信箇所でこの関数を呼ぶだけでOK
 */
export function sanitizeFlexContents(contents: unknown): unknown {
  const fixed = fixInvalidProps(contents);
  let sanitized = sanitizeFlexContainer(fixed);
  // 最終安全チェック: サニタイズ後もまだ配列なら強制carousel化
  if (Array.isArray(sanitized)) {
    sanitized = sanitized.length === 1 ? sanitized[0] : { type: "carousel", contents: sanitized };
  }
  return sanitized;
}
