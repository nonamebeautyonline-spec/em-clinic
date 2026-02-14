"use client";

import { useState, useEffect, useCallback } from "react";

/* ---------- 型定義 ---------- */
interface KeywordRule {
  id: number;
  name: string;
  keyword: string;
  match_type: "exact" | "partial" | "regex";
  priority: number;
  is_enabled: boolean;
  reply_type: "text" | "template" | "action";
  reply_text: string | null;
  reply_template_id: number | null;
  reply_action_id: number | null;
  condition_rules: any[];
  created_at: string;
}

interface Template {
  id: number;
  name: string;
  content: string;
}

interface Action {
  id: number;
  name: string;
}

const MATCH_TYPES = [
  { value: "partial", label: "部分一致" },
  { value: "exact", label: "完全一致" },
  { value: "regex", label: "正規表現" },
] as const;

const REPLY_TYPES = [
  { value: "text", label: "テキスト" },
  { value: "template", label: "テンプレート" },
  { value: "action", label: "アクション" },
] as const;

const EMPTY_RULE: Omit<KeywordRule, "id" | "created_at"> = {
  name: "",
  keyword: "",
  match_type: "partial",
  priority: 0,
  is_enabled: true,
  reply_type: "text",
  reply_text: "",
  reply_template_id: null,
  reply_action_id: null,
  condition_rules: [],
};

/* ---------- メインページ ---------- */
export default function KeywordRepliesPage() {
  const [rules, setRules] = useState<KeywordRule[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [editRule, setEditRule] = useState<Partial<KeywordRule> | null>(null);
  const [saving, setSaving] = useState(false);
  const [testText, setTestText] = useState("");
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesRes, tplRes, actRes] = await Promise.all([
        fetch("/api/admin/line/keyword-replies", { credentials: "include" }),
        fetch("/api/admin/line/templates", { credentials: "include" }),
        fetch("/api/admin/line/actions", { credentials: "include" }),
      ]);
      if (rulesRes.ok) {
        const d = await rulesRes.json();
        setRules(d.rules || []);
      }
      if (tplRes.ok) {
        const d = await tplRes.json();
        setTemplates(d.templates || []);
      }
      if (actRes.ok) {
        const d = await actRes.json();
        setActions(d.actions || []);
      }
    } catch (e) {
      console.error("データ取得エラー:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // 保存
  const handleSave = async () => {
    if (!editRule) return;
    setSaving(true);
    try {
      const isNew = !editRule.id;
      const res = await fetch("/api/admin/line/keyword-replies", {
        method: isNew ? "POST" : "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editRule),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "保存に失敗しました");
        return;
      }
      setEditRule(null);
      loadData();
    } finally {
      setSaving(false);
    }
  };

  // 削除
  const handleDelete = async (id: number) => {
    if (!confirm("このルールを削除しますか？")) return;
    await fetch(`/api/admin/line/keyword-replies?id=${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    loadData();
  };

  // 有効/無効トグル
  const handleToggle = async (rule: KeywordRule) => {
    await fetch("/api/admin/line/keyword-replies", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...rule, is_enabled: !rule.is_enabled }),
    });
    loadData();
  };

  // テスト
  const handleTest = async () => {
    if (!testText.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/line/keyword-replies/test", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: testText }),
      });
      if (res.ok) {
        setTestResult(await res.json());
      }
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#06C755] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">キーワード自動応答</h1>
          <p className="text-sm text-gray-500 mt-1">
            受信メッセージにキーワードが含まれる場合に自動返信します
          </p>
        </div>
        <button
          onClick={() => setEditRule({ ...EMPTY_RULE })}
          className="px-4 py-2 bg-[#06C755] text-white text-sm font-medium rounded-lg hover:bg-[#05b34c] transition-colors"
        >
          + 新しいルール
        </button>
      </div>

      {/* テストエリア */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <p className="text-sm font-medium text-gray-700 mb-2">マッチテスト</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            placeholder="テスト文字列を入力..."
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755] focus:border-transparent"
            onKeyDown={(e) => e.key === "Enter" && handleTest()}
          />
          <button
            onClick={handleTest}
            disabled={testing || !testText.trim()}
            className="px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {testing ? "判定中..." : "テスト"}
          </button>
        </div>
        {testResult && (
          <div className={`mt-3 p-3 rounded-lg text-sm ${testResult.matched ? "bg-green-50 text-green-800" : "bg-gray-50 text-gray-600"}`}>
            {testResult.matched ? (
              <>
                <span className="font-medium">マッチ!</span> → ルール「{testResult.rule?.name}」（キーワード: {testResult.rule?.keyword}）
                {testResult.rule?.reply_text && <div className="mt-1 text-gray-600">応答: {testResult.rule.reply_text}</div>}
              </>
            ) : (
              "マッチするルールはありません"
            )}
          </div>
        )}
      </div>

      {/* ルール一覧 */}
      {rules.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          自動応答ルールはまだありません
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                <th className="px-4 py-3 text-left">優先度</th>
                <th className="px-4 py-3 text-left">ルール名</th>
                <th className="px-4 py-3 text-left">キーワード</th>
                <th className="px-4 py-3 text-left">マッチ</th>
                <th className="px-4 py-3 text-left">応答</th>
                <th className="px-4 py-3 text-center">有効</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rules.map((rule) => (
                <tr key={rule.id} className={`hover:bg-gray-50 ${!rule.is_enabled ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center justify-center w-7 h-7 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
                      {rule.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{rule.name}</td>
                  <td className="px-4 py-3">
                    <code className="px-2 py-0.5 bg-gray-100 rounded text-xs">{rule.keyword}</code>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {MATCH_TYPES.find((m) => m.value === rule.match_type)?.label}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {rule.reply_type === "text" && (
                      <span className="truncate max-w-[200px] inline-block">{rule.reply_text || "-"}</span>
                    )}
                    {rule.reply_type === "template" && "テンプレート"}
                    {rule.reply_type === "action" && "アクション"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggle(rule)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${rule.is_enabled ? "bg-[#06C755]" : "bg-gray-300"}`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${rule.is_enabled ? "translate-x-5" : "translate-x-0.5"}`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEditRule({ ...rule })}
                      className="text-blue-600 hover:text-blue-800 text-xs mr-3"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 編集モーダル */}
      {editRule && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditRule(null)}>
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">
                {editRule.id ? "ルール編集" : "新規ルール"}
              </h2>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* ルール名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ルール名</label>
                <input
                  type="text"
                  value={editRule.name || ""}
                  onChange={(e) => setEditRule({ ...editRule, name: e.target.value })}
                  placeholder="例: 予約確認"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                />
              </div>

              {/* キーワード */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">キーワード</label>
                <input
                  type="text"
                  value={editRule.keyword || ""}
                  onChange={(e) => setEditRule({ ...editRule, keyword: e.target.value })}
                  placeholder="例: 予約"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                />
              </div>

              {/* マッチタイプ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">マッチタイプ</label>
                <div className="flex gap-3">
                  {MATCH_TYPES.map((mt) => (
                    <label key={mt.value} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="match_type"
                        value={mt.value}
                        checked={editRule.match_type === mt.value}
                        onChange={() => setEditRule({ ...editRule, match_type: mt.value })}
                        className="w-4 h-4 text-[#06C755]"
                      />
                      <span className="text-sm text-gray-700">{mt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 優先順位 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  優先順位 <span className="text-gray-400 font-normal">（大きいほど優先）</span>
                </label>
                <input
                  type="number"
                  value={editRule.priority ?? 0}
                  onChange={(e) => setEditRule({ ...editRule, priority: parseInt(e.target.value) || 0 })}
                  className="w-24 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                />
              </div>

              {/* 応答タイプ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">応答タイプ</label>
                <div className="flex gap-3">
                  {REPLY_TYPES.map((rt) => (
                    <label key={rt.value} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="reply_type"
                        value={rt.value}
                        checked={editRule.reply_type === rt.value}
                        onChange={() => setEditRule({ ...editRule, reply_type: rt.value })}
                        className="w-4 h-4 text-[#06C755]"
                      />
                      <span className="text-sm text-gray-700">{rt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 応答内容 */}
              {editRule.reply_type === "text" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    応答テキスト
                    <span className="text-gray-400 font-normal ml-1">（{"{name}"} {"{patient_id}"} {"{send_date}"} 使用可）</span>
                  </label>
                  <textarea
                    value={editRule.reply_text || ""}
                    onChange={(e) => setEditRule({ ...editRule, reply_text: e.target.value })}
                    rows={4}
                    placeholder="返信メッセージを入力..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                  />
                </div>
              )}

              {editRule.reply_type === "template" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">テンプレート選択</label>
                  <select
                    value={editRule.reply_template_id || ""}
                    onChange={(e) => setEditRule({ ...editRule, reply_template_id: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                  >
                    <option value="">選択してください</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {editRule.reply_type === "action" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">アクション選択</label>
                  <select
                    value={editRule.reply_action_id || ""}
                    onChange={(e) => setEditRule({ ...editRule, reply_action_id: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                  >
                    <option value="">選択してください</option>
                    {actions.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* フッター */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setEditRule(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editRule.name?.trim() || !editRule.keyword?.trim()}
                className="px-6 py-2 bg-[#06C755] text-white text-sm font-medium rounded-lg hover:bg-[#05b34c] disabled:opacity-50 transition-colors"
              >
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
