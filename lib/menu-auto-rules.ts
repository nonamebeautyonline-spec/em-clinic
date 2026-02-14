// lib/menu-auto-rules.ts — リッチメニュー自動切替ルールの評価
import { supabaseAdmin } from "@/lib/supabase";
import { getSetting, setSetting } from "@/lib/settings";

export interface MenuRuleCondition {
  type: "tag" | "mark" | "field";
  tag_ids?: number[];
  tag_match?: "any" | "all"; // any=いずれか, all=すべて
  mark_values?: string[];
  field_id?: number;
  field_operator?: string; // "=" | "!=" | "contains" | ">" | "<"
  field_value?: string;
}

export interface MenuAutoRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: MenuRuleCondition[];
  conditionOperator: "AND" | "OR";
  target_menu_id: number;
  priority: number; // 小さい方が優先
  created_at: string;
}

const SETTING_KEY = "menu_auto_rules";

/** ルール一覧を取得 */
export async function loadMenuRules(): Promise<MenuAutoRule[]> {
  const raw = await getSetting("line", SETTING_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

/** ルール一覧を保存 */
export async function saveMenuRules(rules: MenuAutoRule[]): Promise<boolean> {
  return setSetting("line", SETTING_KEY, JSON.stringify(rules));
}

/** 患者1人に対してルールを評価し、マッチしたらメニューを切り替える */
export async function evaluateMenuRules(patientId: string): Promise<void> {
  const rules = await loadMenuRules();
  const activeRules = rules.filter(r => r.enabled).sort((a, b) => a.priority - b.priority);
  if (activeRules.length === 0) return;

  // 患者データを一括取得
  const [tagsRes, markRes, fieldsRes, lineRes] = await Promise.all([
    supabaseAdmin.from("patient_tags").select("tag_id").eq("patient_id", patientId),
    supabaseAdmin.from("patient_marks").select("mark").eq("patient_id", patientId).maybeSingle(),
    supabaseAdmin.from("friend_field_values").select("field_id, value").eq("patient_id", patientId),
    supabaseAdmin.from("patients").select("line_id").eq("patient_id", patientId).maybeSingle(),
  ]);

  const lineId = lineRes.data?.line_id;
  if (!lineId) return; // LINE未連携なら何もしない

  const patientTagIds = new Set((tagsRes.data || []).map(t => t.tag_id));
  const patientMark = markRes.data?.mark || "none";
  const fieldMap = new Map((fieldsRes.data || []).map(f => [f.field_id, f.value]));

  // ルールを優先順に評価
  for (const rule of activeRules) {
    if (matchesRule(rule, patientTagIds, patientMark, fieldMap)) {
      await assignMenu(lineId, rule.target_menu_id);
      return;
    }
  }
}

/** 単一ルールの条件にマッチするか判定 */
function matchesRule(
  rule: MenuAutoRule,
  tagIds: Set<number>,
  mark: string,
  fields: Map<number, string>,
): boolean {
  if (rule.conditions.length === 0) return false;

  const results = rule.conditions.map(c => matchesCondition(c, tagIds, mark, fields));
  return rule.conditionOperator === "OR"
    ? results.some(Boolean)
    : results.every(Boolean);
}

/** 単一条件にマッチするか判定 */
function matchesCondition(
  cond: MenuRuleCondition,
  tagIds: Set<number>,
  mark: string,
  fields: Map<number, string>,
): boolean {
  switch (cond.type) {
    case "tag": {
      const ids = cond.tag_ids || [];
      if (ids.length === 0) return false;
      if (cond.tag_match === "all") return ids.every(id => tagIds.has(id));
      return ids.some(id => tagIds.has(id)); // any
    }
    case "mark": {
      const vals = cond.mark_values || [];
      return vals.includes(mark);
    }
    case "field": {
      const val = fields.get(cond.field_id || 0) || "";
      return matchFieldValue(val, cond.field_operator || "=", cond.field_value || "");
    }
    default:
      return false;
  }
}

function matchFieldValue(actual: string, op: string, expected: string): boolean {
  const numA = Number(actual);
  const numE = Number(expected);
  const isNum = !isNaN(numA) && !isNaN(numE) && actual !== "" && expected !== "";

  switch (op) {
    case "=": return actual === expected;
    case "!=": return actual !== expected;
    case "contains": return actual.includes(expected);
    case ">": return isNum ? numA > numE : actual > expected;
    case "<": return isNum ? numA < numE : actual < expected;
    default: return false;
  }
}

/** メニューを割り当て */
async function assignMenu(lineId: string, menuId: number): Promise<void> {
  // DBからLINE側のリッチメニューIDを取得
  const { data } = await supabaseAdmin
    .from("rich_menus")
    .select("line_rich_menu_id")
    .eq("id", menuId)
    .maybeSingle();

  if (!data?.line_rich_menu_id) return;

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return;

  try {
    await fetch(`https://api.line.me/v2/bot/user/${lineId}/richmenu/${data.line_rich_menu_id}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (e) {
    console.error("[menu-auto-rules] メニュー割り当て失敗:", e);
  }
}

/** 複数患者に対してルールを評価 */
export async function evaluateMenuRulesForMany(patientIds: string[]): Promise<void> {
  // 並列数を制限して評価
  const batchSize = 10;
  for (let i = 0; i < patientIds.length; i += batchSize) {
    const batch = patientIds.slice(i, i + batchSize);
    await Promise.all(batch.map(id => evaluateMenuRules(id)));
  }
}
