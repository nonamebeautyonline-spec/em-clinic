"use client";

import { useState, useEffect, useRef } from "react";

const COLOR_THEMES = [
  { value: "", label: "デフォルト" },
  { value: "blue", label: "ブルー" },
  { value: "emerald", label: "エメラルド" },
  { value: "teal", label: "ティール" },
  { value: "purple", label: "パープル" },
  { value: "pink", label: "ピンク" },
  { value: "rose", label: "ローズ" },
  { value: "amber", label: "アンバー" },
  { value: "indigo", label: "インディゴ" },
  { value: "orange", label: "オレンジ" },
];

type Props = {
  isOpen: boolean;
  initialName?: string;
  initialColorTheme?: string | null;
  title: string;
  onSave: (name: string, colorTheme?: string | null) => Promise<void>;
  onClose: () => void;
};

export function FolderEditModal({ isOpen, initialName = "", initialColorTheme = null, title, onSave, onClose }: Props) {
  const [name, setName] = useState(initialName);
  const [colorTheme, setColorTheme] = useState(initialColorTheme || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const savingRef = useRef(false);

  useEffect(() => {
    setName(initialName);
    setColorTheme(initialColorTheme || "");
    setError("");
    savingRef.current = false;
  }, [initialName, initialColorTheme, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (savingRef.current) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError("フォルダ名を入力してください");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      await onSave(trimmed, colorTheme || null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
      savingRef.current = false;
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900 text-lg">{title}</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              フォルダ名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
              placeholder="例: メディカルダイエット"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              カラーテーマ（購入画面表示用）
            </label>
            <select
              value={colorTheme}
              onChange={(e) => setColorTheme(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white"
            >
              {COLOR_THEMES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                保存中...
              </span>
            ) : (
              "保存"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
