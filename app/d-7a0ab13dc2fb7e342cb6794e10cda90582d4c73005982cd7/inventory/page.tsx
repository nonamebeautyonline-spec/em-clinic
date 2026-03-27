"use client";

import { useState, useCallback, useMemo } from "react";
import { DEMO_INVENTORY, type DemoInventoryItem } from "../_data/mock";

// ステータス判定
type StockStatus = "正常" | "不足" | "要発注";

function getStockStatus(item: DemoInventoryItem): StockStatus {
  if (item.currentStock < item.minStock * 0.5) return "不足";
  if (item.currentStock < item.minStock) return "要発注";
  return "正常";
}

// ステータスバッジの色
const STATUS_STYLES: Record<StockStatus, { bg: string; text: string; dot: string }> = {
  "正常": { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  "不足": { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  "要発注": { bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-500" },
};

// 日付フォーマット
function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

// 使用期限の警告判定（残り30日以内）
function isExpiringsSoon(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
}

export default function DemoInventoryPage() {
  // 在庫データの状態管理
  const [inventory, setInventory] = useState<DemoInventoryItem[]>(
    DEMO_INVENTORY.map((item) => ({ ...item }))
  );

  // トースト
  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // サマリー計算
  const summary = useMemo(() => {
    const totalItems = inventory.length;
    const alertItems = inventory.filter((item) => item.currentStock < item.minStock).length;
    const totalStock = inventory.reduce((sum, item) => sum + item.currentStock, 0);
    return { totalItems, alertItems, totalStock };
  }, [inventory]);

  // 在庫調整
  const adjustStock = (id: string, delta: number) => {
    setInventory((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const newStock = Math.max(0, item.currentStock + delta);
        const direction = delta > 0 ? "入庫" : "出庫";
        showToast(`${item.productName}: ${direction} ${Math.abs(delta)}${item.unit}（現在庫: ${newStock}${item.unit}）`);
        return { ...item, currentStock: newStock };
      })
    );
  };

  return (
    <div className="p-6 pb-12 max-w-6xl mx-auto">
      {/* ヘッダー */}
      <h1 className="text-2xl font-bold text-slate-800">在庫管理</h1>
      <p className="text-sm text-slate-500 mt-1">
        商品の在庫状況を確認し、入出庫の調整を行います
      </p>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 mb-6">
        {/* 全品目数 */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-blue-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">全品目数</p>
            <p className="text-2xl font-bold text-blue-700">{summary.totalItems}</p>
          </div>
        </div>

        {/* アラート品目数 */}
        <div className={`bg-white rounded-xl border p-4 flex items-center gap-4 ${
          summary.alertItems > 0 ? "border-red-200 bg-red-50/30" : "border-slate-200"
        }`}>
          <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${
            summary.alertItems > 0 ? "bg-red-100" : "bg-slate-100"
          }`}>
            <svg className={`w-5 h-5 ${summary.alertItems > 0 ? "text-red-500" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">アラート品目</p>
            <p className={`text-2xl font-bold ${summary.alertItems > 0 ? "text-red-600" : "text-slate-400"}`}>
              {summary.alertItems}
            </p>
          </div>
        </div>

        {/* 総在庫数 */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-emerald-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">総在庫数</p>
            <p className="text-2xl font-bold text-emerald-700">{summary.totalStock}</p>
          </div>
        </div>
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">
                商品名
              </th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                用量
              </th>
              <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                現在庫
              </th>
              <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                最低在庫
              </th>
              <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                ステータス
              </th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                最終入庫日
              </th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                使用期限
              </th>
              <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">
                在庫調整
              </th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((item) => {
              const status = getStockStatus(item);
              const statusStyle = STATUS_STYLES[status];
              const isLow = item.currentStock < item.minStock;
              const expiringSoon = isExpiringsSoon(item.expiryDate);

              return (
                <tr
                  key={item.id}
                  className={`border-b border-slate-100 last:border-b-0 transition-colors ${
                    isLow
                      ? "bg-red-50/50 hover:bg-red-50"
                      : "hover:bg-slate-50"
                  }`}
                >
                  {/* 商品名 */}
                  <td className="px-6 py-4">
                    <span className={`text-sm font-semibold ${isLow ? "text-red-800" : "text-slate-800"}`}>
                      {item.productName}
                    </span>
                  </td>

                  {/* 用量 */}
                  <td className="px-4 py-4">
                    <span className="text-sm text-slate-500">{item.dosage}</span>
                  </td>

                  {/* 現在庫 */}
                  <td className="px-4 py-4 text-right">
                    <span className={`text-sm font-bold ${isLow ? "text-red-600" : "text-slate-800"}`}>
                      {item.currentStock}
                    </span>
                    <span className="text-xs text-slate-400 ml-0.5">{item.unit}</span>
                    {/* 在庫バー */}
                    <div className="mt-1 w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          isLow ? "bg-red-500" : "bg-emerald-500"
                        }`}
                        style={{
                          width: `${Math.min((item.currentStock / (item.minStock * 2)) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </td>

                  {/* 最低在庫 */}
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm text-slate-500">{item.minStock}</span>
                    <span className="text-xs text-slate-400 ml-0.5">{item.unit}</span>
                  </td>

                  {/* ステータスバッジ */}
                  <td className="px-4 py-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${statusStyle.bg} ${statusStyle.text}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                      {status}
                    </span>
                  </td>

                  {/* 最終入庫日 */}
                  <td className="px-4 py-4">
                    <span className="text-xs text-slate-500">{formatDate(item.lastRestocked)}</span>
                  </td>

                  {/* 使用期限 */}
                  <td className="px-4 py-4">
                    <span className={`text-xs ${expiringSoon ? "text-orange-600 font-medium" : "text-slate-500"}`}>
                      {formatDate(item.expiryDate)}
                      {expiringSoon && (
                        <span className="block text-[10px] text-orange-500 mt-0.5">期限間近</span>
                      )}
                    </span>
                  </td>

                  {/* 在庫調整ボタン */}
                  <td className="px-6 py-4 text-center">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => adjustStock(item.id, -1)}
                        disabled={item.currentStock <= 0}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 hover:border-slate-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="出庫 -1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      </button>
                      <span className="w-10 text-center text-sm font-bold text-slate-700">
                        {item.currentStock}
                      </span>
                      <button
                        onClick={() => adjustStock(item.id, 1)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition-colors"
                        title="入庫 +1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 補足 */}
      <p className="mt-4 text-xs text-slate-400">
        在庫の一括入庫・発注連携は管理画面から行えます（デモでは個別調整のみ対応）。
      </p>

      {/* トースト */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-800 text-white px-4 py-3 rounded-lg shadow-lg text-sm animate-[fadeIn_0.2s_ease-out]">
          {toast}
        </div>
      )}
    </div>
  );
}
