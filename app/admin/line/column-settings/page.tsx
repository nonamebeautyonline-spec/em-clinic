"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";

/* ---------- セクション定義 ---------- */
const SECTIONS = [
  { key: "personal", label: "個人情報", description: "カナ・性別・生年月日・電話番号", icon: "👤" },
  { key: "reservation", label: "次回予約", description: "次回予約日時の表示", icon: "📅" },
  { key: "mark", label: "対応マーク", description: "対応マークのドロップダウン選択", icon: "🏷️" },
  { key: "tags", label: "タグ", description: "タグの表示・追加・削除", icon: "🔖" },
  { key: "friendFields", label: "友だち情報", description: "カスタム情報欄の値", icon: "📋" },
  { key: "medical", label: "問診事項", description: "既往歴・GLP-1使用歴・内服歴・アレルギー", icon: "🏥" },
  { key: "latestOrder", label: "最新決済", description: "最新の注文情報・配送先・追跡番号", icon: "💳" },
  { key: "orderHistory", label: "処方履歴", description: "過去の注文一覧", icon: "📜" },
  { key: "bankTransfer", label: "銀行振込待ち", description: "振込待ちの注文アラート", icon: "🏦" },
  { key: "reorders", label: "再処方", description: "再処方の申請状況", icon: "💊" },
  { key: "richMenu", label: "リッチメニュー", description: "割り当て済みメニューの確認・変更", icon: "📱" },
];

/* ---------- メインページ ---------- */
export default function ColumnSettingsPage() {
  const SWR_KEY = "/api/admin/line/column-settings";
  const { data: settingsData, isLoading: loading } = useSWR<{ sections: Record<string, boolean> }>(SWR_KEY);
  const sections = settingsData?.sections ?? {};
  const [saving, setSaving] = useState(false);

  // トグル & 即保存（楽観的更新）
  const toggleSection = async (key: string) => {
    const current = sections[key] !== false; // デフォルトON
    const next = { ...sections, [key]: !current };
    // 楽観的更新
    mutate(SWR_KEY, { sections: next }, false);
    setSaving(true);
    try {
      await fetch("/api/admin/line/column-settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections: next }),
      });
    } catch (e) {
      console.error("保存エラー:", e);
      // エラー時はサーバーから再取得
      mutate(SWR_KEY);
    } finally {
      setSaving(false);
    }
  };

  // 全ON/全OFF
  const setAll = async (value: boolean) => {
    const next: Record<string, boolean> = {};
    SECTIONS.forEach(s => { next[s.key] = value; });
    // 楽観的更新
    mutate(SWR_KEY, { sections: next }, false);
    setSaving(true);
    try {
      await fetch("/api/admin/line/column-settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections: next }),
      });
    } catch (e) {
      console.error("保存エラー:", e);
      mutate(SWR_KEY);
    } finally {
      setSaving(false);
    }
  };

  const enabledCount = SECTIONS.filter(s => sections[s.key] !== false).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#06C755] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">右カラム表示設定</h1>
        <p className="text-sm text-gray-500 mt-1">
          個別トーク・友だち詳細画面の右側に表示する項目を選択できます
        </p>
        <p className="text-xs text-gray-400 mt-1">
          この設定はLオペにログインしている全員で共有されます
        </p>
      </div>

      {/* 操作ボタン */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-500">
          <span className="font-medium text-gray-700">{enabledCount}</span> / {SECTIONS.length} 項目を表示中
          {saving && <span className="ml-2 text-xs text-[#06C755]">保存中...</span>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setAll(true)}
            className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            すべてON
          </button>
          <button
            onClick={() => setAll(false)}
            className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            すべてOFF
          </button>
        </div>
      </div>

      {/* セクション一覧 */}
      <div className="space-y-2">
        {SECTIONS.map((s) => {
          const enabled = sections[s.key] !== false;
          return (
            <div
              key={s.key}
              className={`flex items-center gap-4 px-4 py-3 bg-white rounded-lg border transition-colors ${
                enabled ? "border-gray-200" : "border-gray-100 opacity-60"
              }`}
            >
              <span className="text-xl flex-shrink-0">{s.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">{s.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{s.description}</div>
              </div>
              <button
                onClick={() => toggleSection(s.key)}
                className={`w-11 h-6 rounded-full relative transition-colors flex-shrink-0 ${
                  enabled ? "bg-[#06C755]" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    enabled ? "translate-x-5.5 left-[1px]" : "translate-x-0 left-[2px]"
                  }`}
                  style={{ transform: enabled ? "translateX(22px)" : "translateX(0)" }}
                />
              </button>
            </div>
          );
        })}
      </div>

      {/* プレビューイメージ */}
      <div className="mt-8 bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h3 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">プレビュー（表示イメージ）</h3>
        <div className="w-full max-w-[320px] mx-auto bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          {/* プロフィール（常に表示） */}
          <div className="px-4 py-3 text-center border-b border-gray-100">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white text-sm font-bold mx-auto">
              田
            </div>
            <p className="text-sm font-bold text-gray-900 mt-1.5">田中 太郎</p>
            <p className="text-[9px] text-gray-400 font-mono">P12345</p>
          </div>
          {SECTIONS.filter(s => sections[s.key] !== false).map(s => (
            <div key={s.key} className="px-4 py-2 border-b border-gray-100 last:border-b-0">
              <span className="text-[10px] text-gray-400 font-bold">{s.label}</span>
              <div className="h-3 bg-gray-100 rounded mt-1 w-3/4" />
            </div>
          ))}
          {enabledCount === 0 && (
            <div className="px-4 py-6 text-center text-xs text-gray-300">表示項目なし</div>
          )}
        </div>
      </div>
    </div>
  );
}
