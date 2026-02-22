"use client";

import { useState, useCallback } from "react";
import { DEMO_TEMPLATES, type DemoFullTemplate } from "../_data/mock";

// カテゴリ一覧
const CATEGORIES = ["すべて", "予約", "問診", "発送", "決済", "フォロー"] as const;

// カテゴリバッジの色設定
const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  予約: { bg: "bg-blue-100", text: "text-blue-700" },
  問診: { bg: "bg-purple-100", text: "text-purple-700" },
  発送: { bg: "bg-amber-100", text: "text-amber-700" },
  決済: { bg: "bg-emerald-100", text: "text-emerald-700" },
  フォロー: { bg: "bg-rose-100", text: "text-rose-700" },
};

// 変数挿入ボタン用の定義
const VARIABLES = [
  { key: "{name}", label: "名前", sample: "田中 美咲" },
  { key: "{date}", label: "日付", sample: "2月25日" },
  { key: "{product}", label: "商品", sample: "マンジャロ 5mg" },
  { key: "{amount}", label: "金額", sample: "29,800" },
] as const;

// 変数をサンプル値に置換する関数
function replaceVariables(text: string): string {
  let result = text;
  for (const v of VARIABLES) {
    result = result.split(v.key).join(v.sample);
  }
  return result;
}

export default function DemoTemplatesPage() {
  // テンプレート一覧（ローカルステート）
  const [templates, setTemplates] = useState<DemoFullTemplate[]>([...DEMO_TEMPLATES]);
  // 選択中のカテゴリ
  const [selectedCategory, setSelectedCategory] = useState<string>("すべて");
  // モーダルの開閉
  const [isModalOpen, setIsModalOpen] = useState(false);
  // 編集対象のテンプレートID（nullなら新規作成）
  const [editingId, setEditingId] = useState<string | null>(null);
  // フォーム入力値
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("予約");
  const [formBody, setFormBody] = useState("");
  // トースト表示
  const [toast, setToast] = useState<string | null>(null);

  // カテゴリでフィルタされたテンプレート
  const filteredTemplates =
    selectedCategory === "すべて"
      ? templates
      : templates.filter((t) => t.category === selectedCategory);

  // トースト表示ヘルパー
  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  }, []);

  // モーダルを開く（新規作成）
  const openCreateModal = () => {
    setEditingId(null);
    setFormTitle("");
    setFormCategory("予約");
    setFormBody("");
    setIsModalOpen(true);
  };

  // モーダルを開く（編集）
  const openEditModal = (template: DemoFullTemplate) => {
    setEditingId(template.id);
    setFormTitle(template.title);
    setFormCategory(template.category);
    setFormBody(template.body);
    setIsModalOpen(true);
  };

  // モーダルを閉じる
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  // テンプレートを保存
  const handleSave = () => {
    if (!formTitle.trim() || !formBody.trim()) return;

    if (editingId) {
      // 編集モード: 既存テンプレートを更新
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === editingId
            ? { ...t, title: formTitle.trim(), category: formCategory, body: formBody.trim() }
            : t
        )
      );
      showToast("テンプレートを更新しました");
    } else {
      // 新規作成モード
      const newTemplate: DemoFullTemplate = {
        id: `T${String(templates.length + 1).padStart(3, "0")}`,
        title: formTitle.trim(),
        body: formBody.trim(),
        category: formCategory,
        usageCount: 0,
        lastUsed: new Date().toISOString().slice(0, 10),
      };
      setTemplates((prev) => [newTemplate, ...prev]);
      showToast("テンプレートを作成しました");
    }

    closeModal();
  };

  // テンプレートを削除
  const handleDelete = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    showToast("テンプレートを削除しました");
  };

  // 変数を本文に挿入する
  const insertVariable = (variable: string) => {
    setFormBody((prev) => prev + variable);
  };

  return (
    <div className="p-6 pb-12 max-w-6xl mx-auto">
      {/* ヘッダー */}
      <h1 className="text-2xl font-bold text-slate-800 mb-6">テンプレート管理</h1>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* 左側: カテゴリサイドバー */}
        <div className="lg:w-52 shrink-0">
          {/* PC: サイドバー表示 */}
          <nav className="hidden lg:block bg-white rounded-xl border border-slate-200 p-2">
            <p className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">
              カテゴリ
            </p>
            {CATEGORIES.map((cat) => {
              const count =
                cat === "すべて"
                  ? templates.length
                  : templates.filter((t) => t.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === cat
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      selectedCategory === cat
                        ? "bg-blue-100 text-blue-600"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* モバイル: タブ形式のカテゴリ切替 */}
          <div className="lg:hidden flex gap-1 overflow-x-auto bg-slate-100 p-1 rounded-lg">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 右側: テンプレート一覧 */}
        <div className="flex-1 min-w-0">
          {/* 操作バー */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-500">
              {filteredTemplates.length}件のテンプレート
            </p>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新規作成
            </button>
          </div>

          {/* テーブル */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      テンプレート名
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      カテゴリ
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      使用回数
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      最終使用日
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTemplates.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-400">
                        該当するテンプレートがありません
                      </td>
                    </tr>
                  ) : (
                    filteredTemplates.map((t) => {
                      const colors = CATEGORY_COLORS[t.category] || {
                        bg: "bg-slate-100",
                        text: "text-slate-700",
                      };
                      return (
                        <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                          {/* テンプレート名 */}
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-slate-800">{t.title}</p>
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                              {t.body.replace(/\n/g, " ")}
                            </p>
                          </td>
                          {/* カテゴリバッジ */}
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
                            >
                              {t.category}
                            </span>
                          </td>
                          {/* 使用回数 */}
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-semibold text-slate-700">
                              {t.usageCount.toLocaleString()}
                            </span>
                          </td>
                          {/* 最終使用日 */}
                          <td className="px-4 py-3">
                            <span className="text-sm text-slate-600">{t.lastUsed}</span>
                          </td>
                          {/* 操作 */}
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEditModal(t)}
                                className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                              >
                                編集
                              </button>
                              <button
                                onClick={() => handleDelete(t.id)}
                                className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                              >
                                削除
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 作成/編集モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* オーバーレイ */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeModal}
          />
          {/* モーダル本体 */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            {/* モーダルヘッダー */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">
                {editingId ? "テンプレート編集" : "テンプレート作成"}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* モーダルコンテンツ */}
            <div className="grid lg:grid-cols-2 gap-6 p-6">
              {/* 左: フォーム */}
              <div className="space-y-4">
                {/* タイトル入力 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    タイトル
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="テンプレート名を入力..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* カテゴリ選択 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    カテゴリ
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {CATEGORIES.filter((c) => c !== "すべて").map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 本文入力 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    本文
                  </label>
                  <textarea
                    value={formBody}
                    onChange={(e) => setFormBody(e.target.value)}
                    placeholder="メッセージ本文を入力..."
                    rows={8}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                {/* 変数挿入ボタン */}
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-2">変数を挿入</p>
                  <div className="flex flex-wrap gap-2">
                    {VARIABLES.map((v) => (
                      <button
                        key={v.key}
                        onClick={() => insertVariable(v.key)}
                        className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors border border-slate-200"
                      >
                        {v.key}
                        <span className="ml-1 text-slate-400">{v.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 右: LINEプレビュー */}
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">LINEプレビュー</p>
                <div className="bg-[#7494C0] rounded-2xl p-4 min-h-[400px]">
                  {/* LINEヘッダー */}
                  <div className="bg-[#6B8CB8] rounded-t-xl px-4 py-3 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="text-white text-sm font-medium">デモクリニック</span>
                  </div>

                  {/* メッセージ吹き出し */}
                  {formBody.trim() ? (
                    <div className="flex justify-end mb-2">
                      <div className="bg-[#8CE67E] rounded-2xl rounded-tr-md px-4 py-3 max-w-[85%] shadow-sm">
                        <p className="text-sm text-slate-800 whitespace-pre-wrap">
                          {replaceVariables(formBody)}
                        </p>
                        <p className="text-[10px] text-slate-500/70 mt-1 text-right">12:00</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64">
                      <p className="text-white/60 text-sm">本文を入力するとプレビューが表示されます</p>
                    </div>
                  )}
                </div>

                {/* プレビュー注記 */}
                {formBody.trim() && (
                  <p className="text-xs text-slate-400 mt-2">
                    ※ 変数はサンプル値で表示されています
                  </p>
                )}
              </div>
            </div>

            {/* モーダルフッター */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <button
                onClick={closeModal}
                className="px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={!formTitle.trim() || !formBody.trim()}
                className="px-6 py-2.5 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
              >
                {editingId ? "更新する" : "作成する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* トースト通知 */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-[slideUp_0.3s_ease-out]">
          <div className="bg-slate-800 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
