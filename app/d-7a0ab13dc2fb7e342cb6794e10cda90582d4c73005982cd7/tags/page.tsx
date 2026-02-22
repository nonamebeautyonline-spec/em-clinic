"use client";

import { useState, useCallback } from "react";
import { DEMO_TAG_DEFINITIONS, DEMO_PATIENTS, type DemoTagDefinition } from "../_data/mock";

// カラーパレット（10色プリセット）
const COLOR_PRESETS = [
  { name: "red", hex: "#EF4444" },
  { name: "orange", hex: "#F97316" },
  { name: "amber", hex: "#F59E0B" },
  { name: "yellow", hex: "#EAB308" },
  { name: "green", hex: "#22C55E" },
  { name: "emerald", hex: "#10B981" },
  { name: "cyan", hex: "#06B6D4" },
  { name: "blue", hex: "#3B82F6" },
  { name: "purple", hex: "#8B5CF6" },
  { name: "pink", hex: "#EC4899" },
];

// 自動タグ名の定義（問診完了・新規・リピーターは自動付与想定）
const AUTO_TAG_NAMES = ["問診完了", "新規", "リピーター"];

export default function DemoTagsPage() {
  // タグ一覧の状態管理
  const [tags, setTags] = useState<DemoTagDefinition[]>([...DEMO_TAG_DEFINITIONS]);

  // 新規作成モーダル
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(COLOR_PRESETS[7].hex); // デフォルト: blue
  const [newTagDescription, setNewTagDescription] = useState("");

  // 該当者一覧モーダル
  const [showPatientsModal, setShowPatientsModal] = useState(false);
  const [selectedTag, setSelectedTag] = useState<DemoTagDefinition | null>(null);

  // 削除確認モーダル
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DemoTagDefinition | null>(null);

  // トースト表示
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // トーストを表示するヘルパー
  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // サマリー計算
  const totalTags = tags.length;
  const autoTags = tags.filter((t) => AUTO_TAG_NAMES.includes(t.name)).length;
  const manualTags = totalTags - autoTags;

  // タグクリック → 該当者一覧を表示
  const handleTagClick = (tag: DemoTagDefinition) => {
    setSelectedTag(tag);
    setShowPatientsModal(true);
  };

  // 該当者をフィルタリング
  const getMatchingPatients = (tagName: string) => {
    return DEMO_PATIENTS.filter((p) => p.tags.some((t) => t.name === tagName));
  };

  // 新規タグ保存
  const handleCreateTag = () => {
    if (!newTagName.trim()) return;

    // 重複チェック
    if (tags.some((t) => t.name === newTagName.trim())) {
      showToast("同じ名前のタグが既に存在します", "error");
      return;
    }

    const newTag: DemoTagDefinition = {
      id: `TG${String(tags.length + 1).padStart(3, "0")}`,
      name: newTagName.trim(),
      color: newTagColor,
      count: 0,
      description: newTagDescription.trim(),
    };
    setTags((prev) => [...prev, newTag]);
    setShowCreateModal(false);
    setNewTagName("");
    setNewTagColor(COLOR_PRESETS[7].hex);
    setNewTagDescription("");
    showToast(`タグ「${newTag.name}」を作成しました`);
  };

  // 削除確認
  const handleDeleteClick = (e: React.MouseEvent, tag: DemoTagDefinition) => {
    e.stopPropagation();
    setDeleteTarget(tag);
    setShowDeleteModal(true);
  };

  // 削除実行
  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    setTags((prev) => prev.filter((t) => t.id !== deleteTarget.id));
    showToast(`タグ「${deleteTarget.name}」を削除しました`);
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  return (
    <div className="p-6 pb-12 max-w-6xl mx-auto">
      {/* ヘッダー */}
      <h1 className="text-2xl font-bold text-slate-800 mb-6">タグ管理</h1>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <SummaryCard label="タグ総数" value={totalTags} icon="tag" color="blue" />
        <SummaryCard label="自動タグ" value={autoTags} icon="auto" color="emerald" />
        <SummaryCard label="手動タグ" value={manualTags} icon="manual" color="purple" />
      </div>

      {/* 新規作成ボタン */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新規タグ作成
        </button>
      </div>

      {/* タグ一覧（カード型グリッド、3列） */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tags.map((tag) => (
          <div
            key={tag.id}
            onClick={() => handleTagClick(tag)}
            className="group relative bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-slate-300 cursor-pointer transition-all"
          >
            {/* タグ名 + 色ドット + 該当者数バッジ */}
            <div className="flex items-center gap-2 mb-2">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: tag.color }}
              />
              <span className="text-sm font-semibold text-slate-800 truncate">{tag.name}</span>
              <span className="ml-auto shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {tag.count}人
              </span>
            </div>

            {/* 説明文（2行制限） */}
            <p className="text-xs text-slate-500 line-clamp-2 min-h-[2rem]">
              {tag.description || "説明なし"}
            </p>

            {/* 自動タグバッジ */}
            {AUTO_TAG_NAMES.includes(tag.name) && (
              <span className="mt-2 inline-block text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium">
                自動
              </span>
            )}

            {/* 編集・削除ボタン（ホバー表示） */}
            <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // デモのため編集は未実装（トーストで通知）
                  showToast("デモ版のため編集機能は制限されています");
                }}
                className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-400 hover:text-blue-500 hover:border-blue-300 transition-colors"
                title="編集"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={(e) => handleDeleteClick(e, tag)}
                className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-300 transition-colors"
                title="削除"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 新規タグ作成モーダル */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* オーバーレイ */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">新規タグ作成</h2>

            {/* タグ名入力 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">タグ名</label>
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="タグ名を入力"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* カラーパレット */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">カラー</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setNewTagColor(color.hex)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      newTagColor === color.hex
                        ? "border-slate-800 scale-110 ring-2 ring-offset-1 ring-slate-300"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* 説明入力 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">説明</label>
              <textarea
                value={newTagDescription}
                onChange={(e) => setNewTagDescription(e.target.value)}
                placeholder="タグの説明を入力（任意）"
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>

            {/* プレビュー */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">プレビュー</label>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: newTagColor }}
                  />
                  <span className="text-sm font-semibold text-slate-800">
                    {newTagName || "タグ名"}
                  </span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white text-slate-500 border border-slate-200">
                    0人
                  </span>
                </div>
                {newTagDescription && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{newTagDescription}</p>
                )}
              </div>
            </div>

            {/* ボタン */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreateTag}
                disabled={!newTagName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 該当者一覧モーダル */}
      {showPatientsModal && selectedTag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setShowPatientsModal(false);
              setSelectedTag(null);
            }}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: selectedTag.color }}
                />
                <h2 className="text-lg font-bold text-slate-800">
                  「{selectedTag.name}」タグの該当者
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowPatientsModal(false);
                  setSelectedTag(null);
                }}
                className="p-1 hover:bg-slate-100 rounded text-slate-400"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 該当者一覧 */}
            <div className="overflow-y-auto flex-1">
              {(() => {
                const patients = getMatchingPatients(selectedTag.name);
                if (patients.length === 0) {
                  return (
                    <p className="text-sm text-slate-500 text-center py-8">
                      該当する患者がいません
                    </p>
                  );
                }
                return (
                  <div className="space-y-2">
                    {patients.map((patient) => (
                      <div
                        key={patient.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100"
                      >
                        {/* アバター */}
                        <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-500 shrink-0">
                          {patient.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{patient.name}</p>
                          <p className="text-xs text-slate-500">{patient.kana}</p>
                        </div>
                        <div className="flex gap-1 flex-wrap justify-end">
                          {patient.tags.map((t) => (
                            <span
                              key={t.name}
                              className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium"
                              style={{ backgroundColor: t.color }}
                            >
                              {t.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-400 text-center">
                {getMatchingPatients(selectedTag.name).length}人が該当
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setShowDeleteModal(false);
              setDeleteTarget(null);
            }}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">タグの削除</h2>
                <p className="text-sm text-slate-500">この操作は取り消せません</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-6">
              タグ「<span className="font-semibold">{deleteTarget.name}</span>」を削除してもよろしいですか？
              {deleteTarget.count > 0 && (
                <span className="block mt-1 text-xs text-red-500">
                  {deleteTarget.count}人の患者からこのタグが外れます。
                </span>
              )}
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteTarget(null);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* トースト通知 */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-[slideUp_0.3s_ease-out]">
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
              toast.type === "success"
                ? "bg-emerald-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            {toast.type === "success" ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
              </svg>
            )}
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}

// サマリーカードコンポーネント
function SummaryCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: "tag" | "auto" | "manual";
  color: "blue" | "emerald" | "purple";
}) {
  const bgMap = {
    blue: "bg-blue-50",
    emerald: "bg-emerald-50",
    purple: "bg-purple-50",
  };
  const iconColorMap = {
    blue: "text-blue-500",
    emerald: "text-emerald-500",
    purple: "text-purple-500",
  };
  const valueColorMap = {
    blue: "text-blue-700",
    emerald: "text-emerald-700",
    purple: "text-purple-700",
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-lg ${bgMap[color]} flex items-center justify-center`}>
        {icon === "tag" && (
          <svg className={`w-5 h-5 ${iconColorMap[color]}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
          </svg>
        )}
        {icon === "auto" && (
          <svg className={`w-5 h-5 ${iconColorMap[color]}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        )}
        {icon === "manual" && (
          <svg className={`w-5 h-5 ${iconColorMap[color]}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        )}
      </div>
      <div>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className={`text-2xl font-bold ${valueColorMap[color]}`}>{value}</p>
      </div>
    </div>
  );
}
