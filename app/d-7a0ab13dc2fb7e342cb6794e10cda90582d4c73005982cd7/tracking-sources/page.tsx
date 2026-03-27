"use client";

import { useState, useMemo, useCallback } from "react";
import { DEMO_TRACKING_SOURCES, type DemoTrackingSource } from "../_data/mock";

export default function DemoTrackingSourcesPage() {
  const [sources, setSources] = useState<DemoTrackingSource[]>([...DEMO_TRACKING_SOURCES]);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // フォーム状態
  const [formName, setFormName] = useState("");
  const [formSource, setFormSource] = useState("");
  const [formMedium, setFormMedium] = useState("");
  const [formCampaign, setFormCampaign] = useState("");

  // トースト表示
  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // サマリー計算
  const summary = useMemo(() => {
    const totalSources = sources.length;
    const totalFriends = sources.reduce((sum, s) => sum + s.friendCount, 0);
    const avgCvRate = sources.length > 0
      ? sources.reduce((sum, s) => sum + s.cvRate, 0) / sources.length
      : 0;
    return { totalSources, totalFriends, avgCvRate };
  }, [sources]);

  // CV率の色分け
  const cvRateColor = (rate: number) => {
    if (rate >= 20) return "text-green-600 bg-green-50";
    if (rate >= 10) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  // モーダルリセット
  const resetForm = () => {
    setFormName("");
    setFormSource("");
    setFormMedium("");
    setFormCampaign("");
  };

  // 新規作成
  const handleCreate = () => {
    if (!formName.trim()) return;
    const newSource: DemoTrackingSource = {
      id: `TS${String(sources.length + 1).padStart(3, "0")}`,
      name: formName.trim(),
      utmSource: formSource.trim() || "direct",
      utmMedium: formMedium.trim() || "none",
      utmCampaign: formCampaign.trim() || "default",
      friendCount: 0,
      cvCount: 0,
      cvRate: 0,
      createdAt: new Date().toISOString().split("T")[0],
    };
    setSources((prev) => [...prev, newSource]);
    setShowModal(false);
    resetForm();
    showToast(`流入経路「${newSource.name}」を作成しました`);
  };

  // 日付フォーマット
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
  };

  return (
    <div className="p-6 pb-12 max-w-6xl mx-auto">
      {/* トースト */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-800 text-white px-4 py-3 rounded-lg shadow-lg text-sm animate-[fadeIn_0.2s_ease-out]">
          {toast}
        </div>
      )}

      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">流入経路</h1>
          <p className="text-sm text-slate-500 mt-1">
            UTMパラメータによる友だち追加の流入経路を管理します
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          ＋ 新規作成
        </button>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 font-medium">総流入経路数</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{summary.totalSources}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 font-medium">総友だち数</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            {summary.totalFriends.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 font-medium">平均CV率</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            {summary.avgCvRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-medium text-slate-600">名前</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">UTMソース</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">メディア</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">キャンペーン</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">友だち数</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">CV数</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">CV率</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">作成日</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((source) => (
                <tr
                  key={source.id}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-slate-800">{source.name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">
                      {source.utmSource}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">
                      {source.utmMedium}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">
                      {source.utmCampaign}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-800 font-medium">
                    {source.friendCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-800 font-medium">
                    {source.cvCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${cvRateColor(source.cvRate)}`}
                    >
                      {source.cvRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(source.createdAt)}</td>
                </tr>
              ))}
              {sources.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    流入経路がありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 新規作成モーダル */}
      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          {/* オーバーレイ */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setShowModal(false);
              resetForm();
            }}
          />
          {/* モーダル本体 */}
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 animate-[fadeIn_0.2s_ease-out]">
            <h2 className="text-lg font-bold text-slate-800 mb-4">流入経路を作成</h2>

            <div className="space-y-4">
              {/* 名前 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  名前 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="例: Instagram広告"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* UTMソース */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  UTMソース
                </label>
                <input
                  type="text"
                  value={formSource}
                  onChange={(e) => setFormSource(e.target.value)}
                  placeholder="例: instagram"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* メディア */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  メディア
                </label>
                <input
                  type="text"
                  value={formMedium}
                  onChange={(e) => setFormMedium(e.target.value)}
                  placeholder="例: paid"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* キャンペーン */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  キャンペーン
                </label>
                <input
                  type="text"
                  value={formCampaign}
                  onChange={(e) => setFormCampaign(e.target.value)}
                  placeholder="例: spring2026"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* ボタン */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreate}
                disabled={!formName.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                作成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
