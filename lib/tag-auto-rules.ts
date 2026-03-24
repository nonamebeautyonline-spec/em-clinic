// lib/tag-auto-rules.ts — タグ自動付与ルールの評価（Phase1）
import { supabaseAdmin } from "@/lib/supabase";
import { withTenant, tenantPayload } from "@/lib/tenant";
import type { MenuRuleCondition } from "@/lib/menu-auto-rules";

// auto_ruleのJSON構造
export interface TagAutoRule {
  trigger:
    | "reservation_made"
    | "checkout_completed"
    | "reorder_approved"
    | "follow";
  conditions: MenuRuleCondition[];
  conditionOperator: "AND" | "OR";
}

/**
 * イベントトリガーに基づいてタグ自動付与ルールを評価し、
 * 条件を満たす場合にタグを自動付与する。
 *
 * Phase1: tag / mark / field の3条件のみ対応（行動データ条件は除外）
 */
export async function evaluateTagAutoRules(
  patientId: string,
  triggerEvent: string,
  tenantId?: string,
): Promise<void> {
  const tid = tenantId ?? null;

  // auto_ruleが設定されたタグ定義を取得
  const { data: tags } = await withTenant(
    supabaseAdmin
      .from("tag_definitions")
      .select("id, auto_rule")
      .eq("is_auto", true)
      .not("auto_rule", "is", null),
    tid,
  );

  if (!tags?.length) return;

  // トリガーが一致するルールだけ抽出
  const matchingTags = tags.filter((t) => {
    try {
      const rule: TagAutoRule =
        typeof t.auto_rule === "string"
          ? JSON.parse(t.auto_rule)
          : t.auto_rule;
      return rule.trigger === triggerEvent;
    } catch {
      return false;
    }
  });

  if (!matchingTags.length) return;

  // 患者データを取得（条件評価用）
  const [tagsRes, markRes, fieldsRes] = await Promise.all([
    withTenant(
      supabaseAdmin
        .from("patient_tags")
        .select("tag_id")
        .eq("patient_id", patientId),
      tid,
    ),
    withTenant(
      supabaseAdmin
        .from("patient_marks")
        .select("mark")
        .eq("patient_id", patientId),
      tid,
    ).maybeSingle(),
    withTenant(
      supabaseAdmin
        .from("friend_field_values")
        .select("field_id, value")
        .eq("patient_id", patientId),
      tid,
    ),
  ]);

  const patientTagIds = new Set(
    (tagsRes.data || []).map((t: { tag_id: number }) => t.tag_id),
  );
  const patientMark = markRes.data?.mark || "none";
  const fieldMap = new Map(
    (fieldsRes.data || []).map((f: { field_id: number; value: string }) => [
      f.field_id,
      f.value,
    ]),
  );

  // 各ルールを評価
  for (const tag of matchingTags) {
    try {
      const rule: TagAutoRule =
        typeof tag.auto_rule === "string"
          ? JSON.parse(tag.auto_rule)
          : tag.auto_rule;

      // 条件なし = 常にマッチ
      if (!rule.conditions || rule.conditions.length === 0) {
        await addTagIfNotExists(patientId, tag.id, tid);
        continue;
      }

      // 条件評価（tag / mark / field の3種類のみ — Phase1）
      const results = rule.conditions.map((c) =>
        matchConditionSimple(c, patientTagIds, patientMark, fieldMap),
      );
      const matched =
        rule.conditionOperator === "OR"
          ? results.some(Boolean)
          : results.every(Boolean);

      if (matched) {
        await addTagIfNotExists(patientId, tag.id, tid);
      }
    } catch (e) {
      console.error(
        `[tag-auto-rules] tag=${tag.id} error:`,
        (e as Error).message,
      );
    }
  }
}

/**
 * 単一条件の簡易評価（Phase1: tag / mark / field のみ）
 * menu-auto-rules.ts の matchesCondition と同じロジックだが、
 * 行動データ条件は重いので Phase1 では除外。
 */
function matchConditionSimple(
  cond: MenuRuleCondition,
  tagIds: Set<number>,
  mark: string,
  fields: Map<number, string>,
): boolean {
  switch (cond.type) {
    case "tag": {
      const ids = cond.tag_ids || [];
      if (ids.length === 0) return false;
      if (cond.tag_match === "all") return ids.every((id) => tagIds.has(id));
      return ids.some((id) => tagIds.has(id)); // any
    }
    case "mark": {
      const vals = cond.mark_values || [];
      return vals.includes(mark);
    }
    case "field": {
      const val = fields.get(cond.field_id || 0) || "";
      return matchFieldValue(val, cond.field_operator || "=", cond.field_value || "");
    }
    // Phase1では行動データ条件は未対応（常にfalse）
    case "last_payment_date":
    case "product_purchase":
    case "reorder_count":
      return false;
    default:
      return false;
  }
}

/** フィールド値の比較 */
function matchFieldValue(
  actual: string,
  op: string,
  expected: string,
): boolean {
  const numA = Number(actual);
  const numE = Number(expected);
  const isNum =
    !isNaN(numA) && !isNaN(numE) && actual !== "" && expected !== "";

  switch (op) {
    case "=":
      return actual === expected;
    case "!=":
      return actual !== expected;
    case "contains":
      return actual.includes(expected);
    case ">":
      return isNum ? numA > numE : actual > expected;
    case "<":
      return isNum ? numA < numE : actual < expected;
    default:
      return false;
  }
}

/**
 * patient_tagsにタグを追加（既に付与済みならスキップ）
 */
async function addTagIfNotExists(
  patientId: string,
  tagId: number,
  tenantId: string | null,
): Promise<void> {
  // 既に付与済みか確認
  const { data: existing } = await withTenant(
    supabaseAdmin
      .from("patient_tags")
      .select("id")
      .eq("patient_id", patientId)
      .eq("tag_id", tagId),
    tenantId,
  ).maybeSingle();

  if (existing) return; // 既に付与済み

  const { error } = await supabaseAdmin.from("patient_tags").insert({
    ...tenantPayload(tenantId),
    patient_id: patientId,
    tag_id: tagId,
  });

  if (error) {
    // 重複エラー（23505）は無視
    if (error.code === "23505") return;
    console.error(
      `[tag-auto-rules] タグ付与失敗: patient=${patientId} tag=${tagId}`,
      error.message,
    );
  }
}
