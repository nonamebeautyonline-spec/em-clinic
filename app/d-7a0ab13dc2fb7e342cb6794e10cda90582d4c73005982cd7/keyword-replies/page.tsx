"use client";

import { useState } from "react";
import { DEMO_KEYWORD_RULES, type DemoKeywordRule } from "../_data/mock";

// マッチタイプの選択肢
const MATCH_TYPES: DemoKeywordRule["matchType"][] = ["部分一致", "完全一致", "正規表現"];

// 空のルールテンプレート
const EMPTY_RULE: Omit<DemoKeywordRule, "id"> = {
  name: "",
  keyword: "",
  matchType: "部分一致",
  priority: 50,
  response: "",
  isEnabled: true,
};

// マッチタイプに応じたバッジの色
function matchTypeBadgeClass(matchType: DemoKeywordRule["matchType"]): string {
  switch (matchType) {
    case "部分一致":
      return "bg-blue-100 text-blue-700";
    case "完全一致":
      return "bg-green-100 text-green-700";
    case "正規表現":
      return "bg-purple-100 text-purple-700";
  }
}

// テスト入力に対してルールがマッチするか判定
function testMatch(rule: DemoKeywordRule, input: string): boolean {
  if (!rule.isEnabled || !input) return false;
  try {
    switch (rule.matchType) {
      case "部分一致":
        return input.includes(rule.keyword);
      case "完全一致":
        return input === rule.keyword;
      case "正規表現":
        return new RegExp(rule.keyword).test(input);
    }
  } catch {
    // 正規表現が不正な場合はマッチしない
    return false;
  }
}

export default function DemoKeywordRepliesPage() {
  // ルール一覧のステート
  const [rules, setRules] = useState<DemoKeywordRule[]>(DEMO_KEYWORD_RULES);

  // マッチテスト用の入力
  const [testInput, setTestInput] = useState("");

  // 作成/編集モーダル
  const [editingRule, setEditingRule] = useState<DemoKeywordRule | null>(null);
  const [isNewModal, setIsNewModal] = useState(false);

  // 削除確認モーダル
  const [deletingRule, setDeletingRule] = useState<DemoKeywordRule | null>(null);

  // トースト
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // 優先度順にソート（数値が小さいほど優先度高）
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);

  // マッチしたルール（優先度順、有効なもののみ）
  const matchedRules = testInput
    ? sorted.filter((r) => testMatch(r, testInput))
    : [];

  // 有効トグル
  const toggleEnabled = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isEnabled: !r.isEnabled } : r))
    );
  };

  // 新規作成モーダルを開く
  const openNew = () => {
    const newId = `KR${String(rules.length + 1).padStart(3, "0")}`;
    setEditingRule({ ...EMPTY_RULE, id: newId });
    setIsNewModal(true);
  };

  // 編集モーダルを開く
  const openEdit = (rule: DemoKeywordRule) => {
    setEditingRule({ ...rule });
    setIsNewModal(false);
  };

  // 保存
  const handleSave = () => {
    if (!editingRule) return;
    if (!editingRule.name || !editingRule.keyword) {
      showToast("ルール名とキーワードは必須です");
      return;
    }
    if (!editingRule.response) {
      showToast("応答テキストは必須です");
      return;
    }
    if (isNewModal) {
      setRules((prev) => [...prev, editingRule]);
      showToast("ルールを追加しました");
    } else {
      setRules((prev) =>
        prev.map((r) => (r.id === editingRule.id ? editingRule : r))
      );
      showToast("ルールを更新しました");
    }
    setEditingRule(null);
  };

  // 削除確認を開く
  const openDelete = (rule: DemoKeywordRule) => {
    setDeletingRule(rule);
  };

  // 削除実行
  const handleDelete = () => {
    if (!deletingRule) return;
    setRules((prev) => prev.filter((r) => r.id !== deletingRule.id));
    showToast("ルールを削除しました");
    setDeletingRule(null);
  };

  return (
    <div className="p-6 pb-12 max-w-6xl mx-auto">
      {/* トースト */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-800 text-white px-4 py-3 rounded-lg shadow-lg text-sm">
          {toast}
        </div>
      )}

      <h1 className="text-2xl font-bold text-slate-800 mb-6">キーワード自動返信</h1>

      {/* マッチテストエリア */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">
          マッチテスト
        </h2>
        <p className="text-xs text-slate-500 mb-3">
          テキストを入力すると、マッチするルールをリアルタイムで確認できます。
        </p>
        <input
          type="text"
          value={testInput}
          onChange={(e) => setTestInput(e.target.value)}
          placeholder="テストしたいメッセージを入力..."
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {/* マッチ結果 */}
        {testInput && (
          <div className="mt-3">
            {matchedRules.length > 0 ? (
              <div className="space-y-2">
                {matchedRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="bg-blue-50 border border-blue-200 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-blue-700">
                        {rule.name}
                      </span>
                      <span className="text-xs text-blue-500">
                        （優先度: {rule.priority}）
                      </span>
                    </div>
                    <p className="text-sm text-blue-800 whitespace-pre-wrap">
                      {rule.response}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-2">
                マッチするルールがありません
              </p>
            )}
          </div>
        )}
      </div>

      {/* ヘッダー（新規追加ボタン） */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">
          {rules.length} 件のルール（有効: {rules.filter((r) => r.isEnabled).length} 件）
        </p>
        <button
          onClick={openNew}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          新規追加
        </button>
      </div>

      {/* ルール一覧テーブル */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 w-16">
                  優先度
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">
                  ルール名
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">
                  キーワード
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500">
                  マッチタイプ
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">
                  応答テキスト
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 w-16">
                  有効
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 w-24">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((rule) => (
                <tr
                  key={rule.id}
                  className={`hover:bg-slate-50 transition-colors ${
                    !rule.isEnabled ? "opacity-50" : ""
                  }`}
                >
                  {/* 優先度 */}
                  <td className="px-4 py-3 text-sm text-slate-600 text-center font-medium">
                    {rule.priority}
                  </td>
                  {/* ルール名 */}
                  <td className="px-4 py-3 text-sm font-medium text-slate-800">
                    {rule.name}
                  </td>
                  {/* キーワード（コードブロック風） */}
                  <td className="px-4 py-3">
                    <code className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-mono">
                      {rule.keyword}
                    </code>
                  </td>
                  {/* マッチタイプバッジ */}
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${matchTypeBadgeClass(
                        rule.matchType
                      )}`}
                    >
                      {rule.matchType}
                    </span>
                  </td>
                  {/* 応答テキスト（truncate） */}
                  <td className="px-4 py-3 text-sm text-slate-600 max-w-[200px]">
                    <span className="block truncate">
                      {rule.response.replace(/\n/g, " ")}
                    </span>
                  </td>
                  {/* 有効トグル */}
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleEnabled(rule.id)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        rule.isEnabled ? "bg-green-500" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                          rule.isEnabled ? "translate-x-4.5" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </td>
                  {/* 操作 */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openEdit(rule)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-xs font-medium transition-colors"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => openDelete(rule)}
                        className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded text-xs font-medium transition-colors"
                      >
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rules.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-sm text-slate-400"
                  >
                    ルールがありません。「新規追加」ボタンからルールを作成してください。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 作成/編集モーダル */}
      {editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setEditingRule(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* モーダルヘッダー */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold text-slate-800">
                {isNewModal ? "ルールを追加" : "ルールを編集"}
              </h2>
              <button
                onClick={() => setEditingRule(null)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <svg
                  className="w-5 h-5 text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            {/* モーダルボディ */}
            <div className="p-6 space-y-4">
              {/* ルール名 */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  ルール名
                </label>
                <input
                  type="text"
                  value={editingRule.name}
                  onChange={(e) =>
                    setEditingRule({ ...editingRule, name: e.target.value })
                  }
                  placeholder="例: 予約確認"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {/* キーワード */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  キーワード
                </label>
                <input
                  type="text"
                  value={editingRule.keyword}
                  onChange={(e) =>
                    setEditingRule({ ...editingRule, keyword: e.target.value })
                  }
                  placeholder="例: 予約（正規表現の場合: 予約|キャンセル）"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {/* マッチタイプ / 優先順位 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    マッチタイプ
                  </label>
                  <select
                    value={editingRule.matchType}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        matchType: e.target.value as DemoKeywordRule["matchType"],
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {MATCH_TYPES.map((mt) => (
                      <option key={mt} value={mt}>
                        {mt}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    優先順位（小さいほど優先）
                  </label>
                  <input
                    type="number"
                    value={editingRule.priority}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        priority: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              {/* 応答テキスト */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  応答テキスト
                </label>
                <textarea
                  rows={4}
                  value={editingRule.response}
                  onChange={(e) =>
                    setEditingRule({ ...editingRule, response: e.target.value })
                  }
                  placeholder="ユーザーに返信するメッセージを入力..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              {/* 保存/キャンセル */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  className="flex-1 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors"
                >
                  保存
                </button>
                <button
                  onClick={() => setEditingRule(null)}
                  className="py-2.5 px-6 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      {deletingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDeletingRule(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-2">
                ルールを削除
              </h2>
              <p className="text-sm text-slate-600 mb-1">
                以下のルールを削除してよろしいですか？
              </p>
              <p className="text-sm font-medium text-slate-800 mb-4">
                「{deletingRule.name}」（キーワード:{" "}
                <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">
                  {deletingRule.keyword}
                </code>
                ）
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  className="flex-1 py-2.5 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors"
                >
                  削除する
                </button>
                <button
                  onClick={() => setDeletingRule(null)}
                  className="py-2.5 px-6 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
