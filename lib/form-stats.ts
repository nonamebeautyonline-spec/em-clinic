// フォーム回答集計ロジック

/** フォームフィールド定義 */
export interface FormFieldDef {
  id: string;
  type: string;
  label: string;
  options?: string[];
}

/** 選択肢別カウント */
export interface OptionStat {
  label: string;
  count: number;
}

/** 数値フィールドの統計 */
export interface NumberStats {
  average: number;
  median: number;
  min: number;
  max: number;
}

/** フィールド別集計結果 */
export interface FieldStat {
  id: string;
  label: string;
  type: string;
  total: number;
  options?: OptionStat[];
  numberStats?: NumberStats;
}

/** 集計結果全体 */
export interface FormStatsResult {
  totalResponses: number;
  fields: FieldStat[];
}

/** 集計対象の選択肢フィールドタイプ */
const CHOICE_TYPES = new Set(["radio", "dropdown", "checkbox", "prefecture"]);

/** 集計対象外のフィールドタイプ */
const SKIP_TYPES = new Set(["heading_sm", "heading_md", "file"]);

/**
 * フォーム回答を集計する
 * @param fields フォームのフィールド定義
 * @param responses 回答の answers 配列
 */
export function aggregateFormStats(
  fields: FormFieldDef[],
  responses: Record<string, unknown>[]
): FormStatsResult {
  const result: FieldStat[] = [];

  for (const field of fields) {
    if (SKIP_TYPES.has(field.type)) continue;

    const stat: FieldStat = {
      id: field.id,
      label: field.label,
      type: field.type,
      total: 0,
    };

    if (CHOICE_TYPES.has(field.type)) {
      // 選択肢系フィールド: 選択肢別カウント
      const countMap = new Map<string, number>();

      // フォーム定義のoptionsを先に登録（0カウントも表示するため）
      if (field.options) {
        for (const opt of field.options) {
          countMap.set(opt, 0);
        }
      }

      for (const answer of responses) {
        const val = answer[field.id];
        if (val === null || val === undefined || val === "") continue;
        // 空配列は回答なしとして扱う
        if (Array.isArray(val) && val.length === 0) continue;
        stat.total++;

        if (Array.isArray(val)) {
          // checkbox: 複数選択
          for (const v of val) {
            const s = String(v);
            countMap.set(s, (countMap.get(s) || 0) + 1);
          }
        } else {
          const s = String(val);
          countMap.set(s, (countMap.get(s) || 0) + 1);
        }
      }

      stat.options = Array.from(countMap.entries()).map(([label, count]) => ({
        label,
        count,
      }));
    } else if (field.type === "date") {
      // 日付: 回答件数のみ
      for (const answer of responses) {
        const val = answer[field.id];
        if (val !== null && val !== undefined && val !== "") stat.total++;
      }
    } else {
      // text/textarea: 回答件数のみ
      for (const answer of responses) {
        const val = answer[field.id];
        if (val !== null && val !== undefined && val !== "") stat.total++;
      }
    }

    result.push(stat);
  }

  return {
    totalResponses: responses.length,
    fields: result,
  };
}
