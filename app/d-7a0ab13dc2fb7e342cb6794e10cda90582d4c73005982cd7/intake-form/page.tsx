"use client";

// 問診設定ページ（デモ用）
// モックデータを使用して問診項目の一覧・並べ替え・有効/無効切替・プレビューを提供する

import { useState } from "react";
import { DEMO_INTAKE_FIELDS, type DemoIntakeField } from "../_data/mock";

const TYPE_BADGE: Record<DemoIntakeField["type"], { label: string; color: string }> = {
  テキスト: { label: "Aa", color: "bg-blue-50 text-blue-700" },
  テキストエリア: { label: "T", color: "bg-indigo-50 text-indigo-700" },
  ラジオ: { label: "◉", color: "bg-green-50 text-green-700" },
  ドロップダウン: { label: "▾", color: "bg-purple-50 text-purple-700" },
  チェックボックス: { label: "☑", color: "bg-orange-50 text-orange-700" },
  見出し: { label: "H", color: "bg-slate-100 text-slate-600" },
};

export default function DemoIntakeFormPage() {
  const [fields, setFields] = useState<DemoIntakeField[]>(
    [...DEMO_INTAKE_FIELDS].sort((a, b) => a.sortOrder - b.sortOrder)
  );
  const [toast, setToast] = useState<string | null>(null);

  // トースト表示（3秒で自動非表示）
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // 有効/無効トグル
  const toggleEnabled = (id: string) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const updated = { ...f, isEnabled: !f.isEnabled };
        showToast(updated.isEnabled ? `「${f.label}」を有効にしました` : `「${f.label}」を無効にしました`);
        return updated;
      })
    );
  };

  // 並べ替え（上へ）
  const moveUp = (index: number) => {
    if (index === 0) return;
    setFields((prev) => {
      const next = [...prev];
      const tmpOrder = next[index].sortOrder;
      next[index] = { ...next[index], sortOrder: next[index - 1].sortOrder };
      next[index - 1] = { ...next[index - 1], sortOrder: tmpOrder };
      return next.sort((a, b) => a.sortOrder - b.sortOrder);
    });
  };

  // 並べ替え（下へ）
  const moveDown = (index: number) => {
    if (index >= fields.length - 1) return;
    setFields((prev) => {
      const next = [...prev];
      const tmpOrder = next[index].sortOrder;
      next[index] = { ...next[index], sortOrder: next[index + 1].sortOrder };
      next[index + 1] = { ...next[index + 1], sortOrder: tmpOrder };
      return next.sort((a, b) => a.sortOrder - b.sortOrder);
    });
  };

  // プレビュー用: 有効なフィールドのみ
  const enabledFields = fields.filter((f) => f.isEnabled);

  return (
    <div className="p-6 pb-12 max-w-6xl mx-auto">
      {/* トースト */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-800 text-white px-4 py-3 rounded-lg shadow-lg text-sm animate-[fadeIn_0.2s_ease-out]">
          {toast}
        </div>
      )}

      {/* ヘッダー */}
      <h1 className="text-2xl font-bold text-slate-800">問診設定</h1>
      <p className="text-sm text-slate-500 mt-1">
        問診フォームの項目を管理・並べ替えできます
      </p>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* 左: 項目一覧テーブル */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-3 py-3 font-medium text-slate-500 w-16 text-center">順番</th>
                  <th className="px-3 py-3 font-medium text-slate-500">質問</th>
                  <th className="px-3 py-3 font-medium text-slate-500">入力タイプ</th>
                  <th className="px-3 py-3 font-medium text-slate-500 text-center w-14">必須</th>
                  <th className="px-3 py-3 font-medium text-slate-500 text-center w-20">有効</th>
                  <th className="px-3 py-3 font-medium text-slate-500 text-center w-20">並替</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, idx) => {
                  const badge = TYPE_BADGE[field.type];
                  return (
                    <tr
                      key={field.id}
                      className={`border-b border-slate-50 transition-colors ${
                        field.isEnabled ? "hover:bg-slate-50/50" : "opacity-50 bg-slate-50/30"
                      }`}
                    >
                      <td className="px-3 py-3 text-center text-slate-400 font-mono text-xs">
                        {field.sortOrder}
                      </td>
                      <td className="px-3 py-3 font-medium text-slate-800">
                        {field.label}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}
                        >
                          <span>{badge.label}</span>
                          {field.type}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {field.required ? (
                          <span className="text-red-500 font-bold">〇</span>
                        ) : (
                          <span className="text-slate-300">−</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => toggleEnabled(field.id)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            field.isEnabled ? "bg-green-500" : "bg-slate-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                              field.isEnabled ? "translate-x-4.5" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => moveUp(idx)}
                            disabled={idx === 0}
                            className="px-1.5 py-0.5 text-xs rounded border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => moveDown(idx)}
                            disabled={idx === fields.length - 1}
                            className="px-1.5 py-0.5 text-xs rounded border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            ▼
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 右: プレビューパネル */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 p-5 sticky top-6">
            <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-xs">👁</span>
              フォームプレビュー
            </h2>
            <div className="space-y-4">
              {enabledFields.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-8">
                  有効な項目がありません
                </p>
              )}
              {enabledFields.map((field) => (
                <div key={field.id}>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {field.label}
                    {field.required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </label>
                  {/* タイプ別のプレビュー表示 */}
                  {field.type === "テキスト" && (
                    <div className="h-8 rounded border border-slate-200 bg-slate-50" />
                  )}
                  {field.type === "テキストエリア" && (
                    <div className="h-16 rounded border border-slate-200 bg-slate-50" />
                  )}
                  {field.type === "ラジオ" && (
                    <div className="flex flex-wrap gap-3">
                      {field.options.map((opt) => (
                        <label key={opt} className="flex items-center gap-1.5 text-xs text-slate-600">
                          <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 inline-block" />
                          {opt}
                        </label>
                      ))}
                    </div>
                  )}
                  {field.type === "ドロップダウン" && (
                    <div className="h-8 rounded border border-slate-200 bg-slate-50 flex items-center px-2 text-xs text-slate-400">
                      選択してください ▾
                    </div>
                  )}
                  {field.type === "チェックボックス" && (
                    <div className="space-y-1.5">
                      {field.options.map((opt) => (
                        <label key={opt} className="flex items-center gap-1.5 text-xs text-slate-600">
                          <span className="w-3.5 h-3.5 rounded border-2 border-slate-300 inline-block" />
                          {opt}
                        </label>
                      ))}
                    </div>
                  )}
                  {field.type === "見出し" && (
                    <div className="border-b border-slate-200 pb-1" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
