/**
 * カスタムフィールドの型定義・バリデーション
 *
 * サポートする型:
 *   text     - テキスト入力
 *   number   - 数値入力（min/max設定可能）
 *   date     - 日付入力
 *   select   - 選択肢
 *   boolean  - ON/OFFトグル
 *   url      - URL入力（バリデーション付き）
 */

// ── フィールド型の定義 ──────────────────────────────

/** サポートするフィールド型 */
export const FIELD_TYPES = ["text", "number", "date", "select", "boolean", "url"] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

/** フィールド型ごとのUI設定 */
export const FIELD_TYPE_CONFIG: Record<FieldType, { label: string; icon: string; color: string }> = {
  text:    { label: "テキスト", icon: "T",  color: "from-blue-400 to-blue-500" },
  number:  { label: "数値",     icon: "#",  color: "from-violet-400 to-violet-500" },
  date:    { label: "日付",     icon: "D",  color: "from-amber-400 to-amber-500" },
  select:  { label: "選択肢",   icon: "S",  color: "from-emerald-400 to-emerald-500" },
  boolean: { label: "ON/OFF",   icon: "B",  color: "from-pink-400 to-pink-500" },
  url:     { label: "URL",      icon: "U",  color: "from-indigo-400 to-indigo-500" },
};

/** フィールド定義のメタデータ（options JSONB に格納） */
export interface FieldMetadata {
  /** select の選択肢一覧 */
  choices?: string[];
  /** number の最小値 */
  min?: number;
  /** number の最大値 */
  max?: number;
  /** テキスト/URL のプレースホルダー */
  placeholder?: string;
}

/** DB に保存されるフィールド定義 */
export interface FieldDefinition {
  id: number;
  name: string;
  field_type: FieldType;
  /** select の選択肢（旧形式: string[]）またはメタデータ（新形式: FieldMetadata） */
  options: string[] | FieldMetadata | null;
  sort_order: number;
}

// ── メタデータ抽出ヘルパー ──────────────────────────

/**
 * options から FieldMetadata を抽出する。
 * 旧形式（string[]）の場合は choices に変換して返す。
 */
export function extractMetadata(options: FieldDefinition["options"]): FieldMetadata {
  if (!options) return {};
  // 旧形式: string[] → { choices: [...] }
  if (Array.isArray(options)) {
    return { choices: options };
  }
  return options as FieldMetadata;
}

/**
 * options から select 用の選択肢配列を取得する。
 */
export function getChoices(options: FieldDefinition["options"]): string[] {
  const meta = extractMetadata(options);
  return meta.choices ?? [];
}

// ── バリデーション ──────────────────────────────────

/** バリデーション結果 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * フィールド型に応じた値のバリデーション
 */
export function validateFieldValue(
  fieldType: FieldType,
  value: string,
  options?: FieldDefinition["options"],
): ValidationResult {
  // 空値は全型で許容（任意フィールド）
  if (value === "" || value === undefined || value === null) {
    return { valid: true };
  }

  const meta = extractMetadata(options);

  switch (fieldType) {
    case "text":
      return { valid: true };

    case "number": {
      const num = Number(value);
      if (isNaN(num)) {
        return { valid: false, error: "数値を入力してください" };
      }
      if (meta.min !== undefined && num < meta.min) {
        return { valid: false, error: `${meta.min}以上の値を入力してください` };
      }
      if (meta.max !== undefined && num > meta.max) {
        return { valid: false, error: `${meta.max}以下の値を入力してください` };
      }
      return { valid: true };
    }

    case "date": {
      // YYYY-MM-DD 形式チェック
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return { valid: false, error: "YYYY-MM-DD形式で入力してください" };
      }
      const d = new Date(value);
      if (isNaN(d.getTime())) {
        return { valid: false, error: "有効な日付を入力してください" };
      }
      return { valid: true };
    }

    case "select": {
      const choices = meta.choices ?? [];
      if (choices.length > 0 && !choices.includes(value)) {
        return { valid: false, error: "選択肢から選んでください" };
      }
      return { valid: true };
    }

    case "boolean": {
      if (value !== "true" && value !== "false") {
        return { valid: false, error: "true または false を指定してください" };
      }
      return { valid: true };
    }

    case "url": {
      try {
        new URL(value);
        return { valid: true };
      } catch {
        return { valid: false, error: "有効なURLを入力してください" };
      }
    }

    default:
      return { valid: true };
  }
}

/**
 * フィールド型が有効かどうか
 */
export function isValidFieldType(type: string): type is FieldType {
  return (FIELD_TYPES as readonly string[]).includes(type);
}
