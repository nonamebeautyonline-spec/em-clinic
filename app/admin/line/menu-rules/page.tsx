"use client";

import { useState, useEffect, useCallback } from "react";

interface MenuRuleCondition {
  type: "tag" | "mark" | "field" | "visit_count" | "purchase_amount" | "last_visit" | "reorder_count";
  tag_ids?: number[];
  tag_match?: "any" | "all";
  mark_values?: string[];
  field_id?: number;
  field_operator?: string;
  field_value?: string;
  // 行動データ条件
  behavior_operator?: string;
  behavior_value?: string;
  behavior_value_end?: string;
  behavior_date_range?: string;
}

interface MenuAutoRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: MenuRuleCondition[];
  conditionOperator: "AND" | "OR";
  target_menu_id: number;
  priority: number;
  created_at: string;
}

interface TagDef { id: number; name: string; color: string }
interface MarkDef { value: string; label: string; color: string }
interface FieldDef { id: number; name: string }
interface RichMenu { id: number; name: string; is_active: boolean }

export default function MenuRulesPage() {
  const [rules, setRules] = useState<MenuAutoRule[]>([]);
  const [tags, setTags] = useState<TagDef[]>([]);
  const [marks, setMarks] = useState<MarkDef[]>([]);
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [menus, setMenus] = useState<RichMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // 編集モーダル
  const [editRule, setEditRule] = useState<MenuAutoRule | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [rulesRes, tagsRes, marksRes, fieldsRes, menusRes] = await Promise.all([
      fetch("/api/admin/line/menu-rules", { credentials: "include" }).then(r => r.json()),
      fetch("/api/admin/tags", { credentials: "include" }).then(r => r.json()),
      fetch("/api/admin/line/marks", { credentials: "include" }).then(r => r.json()),
      fetch("/api/admin/line/friend-fields", { credentials: "include" }).then(r => r.json()),
      fetch("/api/admin/line/rich-menus?simple=true", { credentials: "include" }).then(r => r.json()),
    ]);
    if (rulesRes.rules) setRules(rulesRes.rules);
    if (tagsRes.tags) setTags(tagsRes.tags);
    if (marksRes.marks) setMarks(marksRes.marks);
    if (fieldsRes.fields) setFields(fieldsRes.fields);
    if (menusRes.menus) setMenus(menusRes.menus);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm("このルールを削除しますか？")) return;
    await fetch(`/api/admin/line/menu-rules?id=${id}`, { method: "DELETE", credentials: "include" });
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const handleToggle = async (rule: MenuAutoRule) => {
    const updated = { ...rule, enabled: !rule.enabled };
    await fetch("/api/admin/line/menu-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ rule: updated }),
    });
    setRules(prev => prev.map(r => r.id === rule.id ? updated : r));
  };

  const handleSave = async (rule: Partial<MenuAutoRule>) => {
    const res = await fetch("/api/admin/line/menu-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ rule }),
    });
    const data = await res.json();
    if (data.rules) setRules(data.rules);
    setShowEditor(false);
    setEditRule(null);
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    const res = await fetch("/api/admin/line/menu-rules", { method: "PUT", credentials: "include" });
    const data = await res.json();
    alert(`${data.evaluated || 0}人に対してルールを評価しました`);
    setSyncing(false);
  };

  const getMenuName = (id: number) => menus.find(m => m.id === id)?.name || `ID:${id}`;
  const getTagName = (id: number) => tags.find(t => t.id === id)?.name || `ID:${id}`;

  const describeCondition = (c: MenuRuleCondition) => {
    switch (c.type) {
      case "tag": {
        const names = (c.tag_ids || []).map(id => getTagName(id)).join(", ");
        return `タグ「${names}」を${c.tag_match === "all" ? "すべて" : "いずれか"}持つ`;
      }
      case "mark": {
        const vals = (c.mark_values || []).map(v => {
          const m = marks.find(m => m.value === v);
          return m?.label || v;
        }).join(", ");
        return `マーク「${vals}」のいずれか`;
      }
      case "field": {
        const f = fields.find(f => f.id === c.field_id);
        return `${f?.name || "フィールド"} ${c.field_operator} ${c.field_value}`;
      }
      case "visit_count": {
        const op = c.behavior_operator === ">=" ? "以上" : c.behavior_operator === "<=" ? "以下" : c.behavior_operator === "=" ? "ちょうど" : c.behavior_operator === "between" ? `${c.behavior_value}〜${c.behavior_value_end}` : c.behavior_operator;
        const range = c.behavior_date_range === "all" ? "" : ` (${c.behavior_date_range})`;
        return c.behavior_operator === "between" ? `来院回数 ${op}回${range}` : `来院回数 ${c.behavior_value}回${op}${range}`;
      }
      case "purchase_amount": {
        const op = c.behavior_operator === ">=" ? "以上" : c.behavior_operator === "<=" ? "以下" : c.behavior_operator === "=" ? "ちょうど" : c.behavior_operator === "between" ? `${c.behavior_value}〜${c.behavior_value_end}` : c.behavior_operator;
        const range = c.behavior_date_range === "all" ? "" : ` (${c.behavior_date_range})`;
        return c.behavior_operator === "between" ? `購入金額 ${op}円${range}` : `購入金額 ¥${c.behavior_value}${op}${range}`;
      }
      case "last_visit": {
        const op = c.behavior_operator === "within_days" ? "以内" : "以上前";
        return `最終来院 ${c.behavior_value}日${op}`;
      }
      case "reorder_count": {
        const op = c.behavior_operator === ">=" ? "以上" : c.behavior_operator === "<=" ? "以下" : c.behavior_operator === "=" ? "ちょうど" : c.behavior_operator;
        return `再処方回数 ${c.behavior_value}回${op}`;
      }
      default:
        return "不明な条件";
    }
  };

  const activeCount = rules.filter(r => r.enabled).length;

  return (
    <div className="min-h-full bg-gray-50/50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-.293.707l-5.414 5.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L4.293 7.707A1 1 0 014 7V5z" />
                  </svg>
                </div>
                メニュー自動切替
              </h1>
              <p className="text-sm text-gray-400 mt-1">タグ・マーク・友だち情報の条件に応じてリッチメニューを自動で切り替えます</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSyncAll}
                disabled={syncing}
                className="px-4 py-2.5 text-sm font-medium text-teal-600 bg-white border border-teal-200 rounded-xl hover:bg-teal-50 transition-all duration-200 flex items-center gap-1.5"
              >
                {syncing ? (
                  <div className="w-3.5 h-3.5 border-2 border-teal-300 border-t-teal-600 rounded-full animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                全員に適用
              </button>
              <button
                onClick={() => { setEditRule(null); setShowEditor(true); }}
                className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl text-sm font-medium hover:from-teal-600 hover:to-cyan-700 shadow-lg shadow-teal-500/25 transition-all duration-200 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                ルール追加
              </button>
            </div>
          </div>

          {/* サマリーカード */}
          {rules.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-4 border border-teal-100/50">
                <div className="text-2xl font-bold text-teal-700">{rules.length}</div>
                <div className="text-xs text-teal-500 mt-0.5">ルール数</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100/50">
                <div className="text-2xl font-bold text-green-700">{activeCount}</div>
                <div className="text-xs text-green-500 mt-0.5">有効</div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl p-4 border border-blue-100/50">
                <div className="text-2xl font-bold text-blue-700">{menus.filter(m => m.is_active).length}</div>
                <div className="text-xs text-blue-500 mt-0.5">アクティブメニュー</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ルール一覧 */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin" />
              <span className="text-sm text-gray-400">読み込み中...</span>
            </div>
          </div>
        ) : rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-.293.707l-5.414 5.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L4.293 7.707A1 1 0 014 7V5z" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">ルールがありません</p>
            <p className="text-gray-300 text-xs mt-1">条件に応じたメニュー自動切替ルールを追加してください</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {rules.sort((a, b) => a.priority - b.priority).map((rule, idx) => (
              <div
                key={rule.id}
                className={`bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all duration-200 group ${
                  !rule.enabled ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* 優先順位 */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                    rule.enabled
                      ? "bg-gradient-to-br from-teal-500 to-cyan-600 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}>
                    {idx + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* ルール名 + メニュー */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[15px] font-semibold text-gray-900">{rule.name}</span>
                      <svg className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      <span className="text-xs font-medium text-teal-700 bg-gradient-to-r from-teal-50 to-cyan-50 px-2 py-0.5 rounded-lg border border-teal-100/50">
                        {getMenuName(rule.target_menu_id)}
                      </span>
                    </div>
                    {/* 条件 */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {rule.conditions.map((c, ci) => (
                        <span key={ci} className="text-[11px] px-2 py-0.5 bg-gray-50/80 text-gray-600 rounded-md border border-gray-100">
                          {describeCondition(c)}
                          {ci < rule.conditions.length - 1 && (
                            <span className="ml-1 text-gray-400">{rule.conditionOperator}</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 操作 */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => { setEditRule(rule); setShowEditor(true); }}
                      className="px-3 py-1.5 text-xs font-medium text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleToggle(rule)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${
                        rule.enabled ? "bg-[#06C755]" : "bg-gray-300"
                      }`}
                      title={rule.enabled ? "停止する" : "有効にする"}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          rule.enabled ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 説明 */}
        {rules.length > 0 && (
          <div className="mt-8 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-4 border border-teal-100/50">
            <h3 className="text-xs font-bold text-teal-700 mb-2 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              使い方
            </h3>
            <ul className="text-xs text-teal-600 space-y-1">
              <li>- ルールは優先順位の高い順（番号が小さい順）に評価されます</li>
              <li>- 最初にマッチしたルールのメニューが適用されます</li>
              <li>- タグ・マーク・友だち情報の変更時、予約・決済・再処方承認時に自動で評価されます</li>
              <li>- 「全員に適用」で既存の全LINE連携済みユーザーに一括適用できます</li>
            </ul>
          </div>
        )}
      </div>

      {/* 編集モーダル */}
      {showEditor && (
        <RuleEditor
          rule={editRule}
          tags={tags}
          marks={marks}
          fields={fields}
          menus={menus}
          onSave={handleSave}
          onClose={() => { setShowEditor(false); setEditRule(null); }}
        />
      )}
    </div>
  );
}

/* ==================== ルール編集モーダル ==================== */
function RuleEditor({
  rule,
  tags,
  marks,
  fields,
  menus,
  onSave,
  onClose,
}: {
  rule: MenuAutoRule | null;
  tags: TagDef[];
  marks: MarkDef[];
  fields: FieldDef[];
  menus: RichMenu[];
  onSave: (r: Partial<MenuAutoRule>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(rule?.name || "");
  const [conditions, setConditions] = useState<MenuRuleCondition[]>(rule?.conditions || []);
  const [condOp, setCondOp] = useState<"AND" | "OR">(rule?.conditionOperator || "AND");
  const [menuId, setMenuId] = useState<number>(rule?.target_menu_id || menus[0]?.id || 0);
  const [priority, setPriority] = useState(rule?.priority ?? 0);

  const addCondition = (type: MenuRuleCondition["type"]) => {
    const c: MenuRuleCondition = { type };
    if (type === "tag") { c.tag_ids = []; c.tag_match = "any"; }
    if (type === "mark") { c.mark_values = []; }
    if (type === "field") { c.field_id = fields[0]?.id; c.field_operator = "="; c.field_value = ""; }
    if (type === "visit_count" || type === "purchase_amount" || type === "reorder_count") {
      c.behavior_operator = ">="; c.behavior_value = "1"; c.behavior_date_range = "all";
    }
    if (type === "last_visit") {
      c.behavior_operator = "within_days"; c.behavior_value = "30";
    }
    setConditions(prev => [...prev, c]);
  };

  const updateCondition = (idx: number, updates: Partial<MenuRuleCondition>) => {
    setConditions(prev => prev.map((c, i) => i === idx ? { ...c, ...updates } : c));
  };

  const removeCondition = (idx: number) => {
    setConditions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    if (!name.trim() || !menuId) return;
    onSave({
      ...(rule?.id ? { id: rule.id } : {}),
      name: name.trim(),
      enabled: rule?.enabled !== false,
      conditions,
      conditionOperator: condOp,
      target_menu_id: menuId,
      priority,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-.293.707l-5.414 5.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L4.293 7.707A1 1 0 014 7V5z" />
                </svg>
              </div>
              {rule ? "ルール編集" : "ルール追加"}
            </h2>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* ルール名 */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">ルール名</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例: VIPタグ → VIP専用メニュー"
              className="w-full px-3 py-2 text-sm border border-gray-200/75 rounded-xl bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-300"
            />
          </div>

          {/* 優先順位 */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">優先順位（小さいほど優先）</label>
            <input
              type="number"
              value={priority}
              onChange={e => setPriority(Number(e.target.value))}
              className="w-20 px-3 py-2 text-sm border border-gray-200/75 rounded-xl bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-300"
            />
          </div>

          {/* 条件 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-600">条件</label>
              <div className="flex items-center gap-2">
                <select
                  value={condOp}
                  onChange={e => setCondOp(e.target.value as "AND" | "OR")}
                  className="text-xs border border-gray-200/75 rounded-xl bg-gray-50/50 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                >
                  <option value="AND">すべて満たす (AND)</option>
                  <option value="OR">いずれか満たす (OR)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              {conditions.map((c, i) => (
                <div key={i} className="flex items-start gap-2 bg-gray-50/80 rounded-xl p-3 border border-gray-100">
                  <div className="flex-1 space-y-2">
                    {c.type === "tag" && (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg">タグ</span>
                          <select
                            value={c.tag_match}
                            onChange={e => updateCondition(i, { tag_match: e.target.value as "any" | "all" })}
                            className="text-xs border border-gray-200/75 rounded-lg bg-white px-2 py-1"
                          >
                            <option value="any">いずれかを持つ</option>
                            <option value="all">すべてを持つ</option>
                          </select>
                        </div>
                        <div className="flex flex-wrap gap-1.5 ml-0.5">
                          {tags.map(t => (
                            <label key={t.id} className="flex items-center gap-1 text-xs cursor-pointer">
                              <input
                                type="checkbox"
                                checked={(c.tag_ids || []).includes(t.id)}
                                onChange={e => {
                                  const ids = c.tag_ids || [];
                                  updateCondition(i, {
                                    tag_ids: e.target.checked ? [...ids, t.id] : ids.filter(id => id !== t.id),
                                  });
                                }}
                                className="w-3 h-3 rounded border-gray-300 text-teal-500 focus:ring-teal-500/30"
                              />
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: t.color + "22", color: t.color }}>
                                {t.name}
                              </span>
                            </label>
                          ))}
                        </div>
                      </>
                    )}
                    {c.type === "mark" && (
                      <div>
                        <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg mb-1.5 inline-block">マーク（いずれか一致）</span>
                        <div className="flex flex-wrap gap-1.5">
                          {marks.map(m => (
                            <label key={m.value} className="flex items-center gap-1 text-xs cursor-pointer">
                              <input
                                type="checkbox"
                                checked={(c.mark_values || []).includes(m.value)}
                                onChange={e => {
                                  const vals = c.mark_values || [];
                                  updateCondition(i, {
                                    mark_values: e.target.checked ? [...vals, m.value] : vals.filter(v => v !== m.value),
                                  });
                                }}
                                className="w-3 h-3 rounded border-gray-300 text-teal-500 focus:ring-teal-500/30"
                              />
                              <span className="text-[10px] font-medium" style={{ color: m.color }}>{m.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    {c.type === "field" && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg">フィールド</span>
                        <select
                          value={c.field_id}
                          onChange={e => updateCondition(i, { field_id: Number(e.target.value) })}
                          className="text-xs border border-gray-200/75 rounded-lg bg-white px-2 py-1"
                        >
                          {fields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                        <select
                          value={c.field_operator}
                          onChange={e => updateCondition(i, { field_operator: e.target.value })}
                          className="text-xs border border-gray-200/75 rounded-lg bg-white px-2 py-1"
                        >
                          <option value="=">=</option>
                          <option value="!=">!=</option>
                          <option value="contains">含む</option>
                          <option value=">">&gt;</option>
                          <option value="<">&lt;</option>
                        </select>
                        <input
                          type="text"
                          value={c.field_value || ""}
                          onChange={e => updateCondition(i, { field_value: e.target.value })}
                          placeholder="値"
                          className="text-xs border border-gray-200/75 rounded-lg bg-white px-2 py-1 w-24"
                        />
                      </div>
                    )}
                    {(c.type === "visit_count" || c.type === "purchase_amount" || c.type === "reorder_count") && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-lg">
                            {c.type === "visit_count" ? "来院回数" : c.type === "purchase_amount" ? "購入金額" : "再処方回数"}
                          </span>
                          <select
                            value={c.behavior_operator || ">="}
                            onChange={e => updateCondition(i, { behavior_operator: e.target.value })}
                            className="text-xs border border-gray-200/75 rounded-lg bg-white px-2 py-1"
                          >
                            <option value=">=">以上</option>
                            <option value="<=">以下</option>
                            <option value="=">等しい</option>
                            <option value="between">範囲</option>
                          </select>
                          <input
                            type="number"
                            value={c.behavior_value || ""}
                            onChange={e => updateCondition(i, { behavior_value: e.target.value })}
                            placeholder={c.type === "purchase_amount" ? "金額(円)" : "回数"}
                            className="text-xs border border-gray-200/75 rounded-lg bg-white px-2 py-1 w-24"
                          />
                          {c.behavior_operator === "between" && (
                            <>
                              <span className="text-xs text-gray-400">〜</span>
                              <input
                                type="number"
                                value={c.behavior_value_end || ""}
                                onChange={e => updateCondition(i, { behavior_value_end: e.target.value })}
                                placeholder={c.type === "purchase_amount" ? "金額(円)" : "回数"}
                                className="text-xs border border-gray-200/75 rounded-lg bg-white px-2 py-1 w-24"
                              />
                            </>
                          )}
                        </div>
                        {c.type !== "reorder_count" && (
                          <div className="flex items-center gap-2 ml-0.5">
                            <span className="text-[11px] text-gray-500">期間:</span>
                            <select
                              value={c.behavior_date_range || "all"}
                              onChange={e => updateCondition(i, { behavior_date_range: e.target.value })}
                              className="text-xs border border-gray-200/75 rounded-lg bg-white px-2 py-1"
                            >
                              <option value="all">全期間</option>
                              <option value="30d">過去30日</option>
                              <option value="90d">過去90日</option>
                              <option value="180d">過去180日</option>
                              <option value="365d">過去1年</option>
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                    {c.type === "last_visit" && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-lg">最終来院</span>
                        <select
                          value={c.behavior_operator || "within_days"}
                          onChange={e => updateCondition(i, { behavior_operator: e.target.value })}
                          className="text-xs border border-gray-200/75 rounded-lg bg-white px-2 py-1"
                        >
                          <option value="within_days">N日以内</option>
                          <option value="more_than_days">N日以上前</option>
                        </select>
                        <input
                          type="number"
                          value={c.behavior_value || ""}
                          onChange={e => updateCondition(i, { behavior_value: e.target.value })}
                          placeholder="日数"
                          className="text-xs border border-gray-200/75 rounded-lg bg-white px-2 py-1 w-20"
                        />
                        <span className="text-xs text-gray-500">日</span>
                      </div>
                    )}
                  </div>
                  <button onClick={() => removeCondition(i)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              <button onClick={() => addCondition("tag")} className="px-3 py-1.5 text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                + タグ条件
              </button>
              <button onClick={() => addCondition("mark")} className="px-3 py-1.5 text-[11px] font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors">
                + マーク条件
              </button>
              {fields.length > 0 && (
                <button onClick={() => addCondition("field")} className="px-3 py-1.5 text-[11px] font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                  + フィールド条件
                </button>
              )}
              <button onClick={() => addCondition("visit_count")} className="px-3 py-1.5 text-[11px] font-medium text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors">
                + 来院回数
              </button>
              <button onClick={() => addCondition("purchase_amount")} className="px-3 py-1.5 text-[11px] font-medium text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors">
                + 購入金額
              </button>
              <button onClick={() => addCondition("last_visit")} className="px-3 py-1.5 text-[11px] font-medium text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors">
                + 最終来院
              </button>
              <button onClick={() => addCondition("reorder_count")} className="px-3 py-1.5 text-[11px] font-medium text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors">
                + 再処方回数
              </button>
            </div>
          </div>

          {/* 対象メニュー */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">切り替え先メニュー</label>
            <select
              value={menuId}
              onChange={e => setMenuId(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-gray-200/75 rounded-xl bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-300"
            >
              {menus.filter(m => m.is_active).map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* フッター */}
        <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || !menuId}
            className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 disabled:from-gray-300 disabled:to-gray-300 rounded-xl shadow-lg shadow-teal-500/25 transition-all duration-200"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
