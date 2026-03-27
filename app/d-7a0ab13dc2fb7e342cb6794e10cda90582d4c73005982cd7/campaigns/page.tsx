"use client";

import { useState } from "react";
import { DEMO_CAMPAIGNS, DEMO_COUPONS, type DemoCampaign, type DemoCoupon } from "../_data/mock";

// ステータス色
const STATUS_COLORS: Record<DemoCampaign["status"], { bg: string; text: string; dot: string }> = {
  "実施中": { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  "予定": { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  "終了": { bg: "bg-gray-100", text: "text-gray-500", dot: "bg-gray-400" },
};

// タブ定義
type Tab = "campaigns" | "coupons";

// 日付フォーマット
function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export default function DemoCampaignsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("campaigns");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  // サマリー計算
  const activeCampaigns = DEMO_CAMPAIGNS.filter((c) => c.status === "実施中").length;
  const activeCoupons = DEMO_COUPONS.filter((c) => c.isActive).length;
  const totalUsage = DEMO_CAMPAIGNS.reduce((sum, c) => sum + c.usageCount, 0);

  return (
    <div className="p-6 pb-12 max-w-6xl mx-auto">
      {/* ヘッダー */}
      <h1 className="text-2xl font-bold text-slate-800">キャンペーン管理</h1>
      <p className="text-sm text-slate-500 mt-1">
        キャンペーンとクーポンの作成・管理を行います
      </p>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-green-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">実施中キャンペーン</p>
            <p className="text-2xl font-bold text-green-700">{activeCampaigns}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-blue-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">有効クーポン</p>
            <p className="text-2xl font-bold text-blue-700">{activeCoupons}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-purple-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">累計利用数</p>
            <p className="text-2xl font-bold text-purple-700">{totalUsage}</p>
          </div>
        </div>
      </div>

      {/* タブ */}
      <div className="flex gap-1 mb-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("campaigns")}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "campaigns"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          キャンペーン
          <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
            {DEMO_CAMPAIGNS.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("coupons")}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "coupons"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          クーポン
          <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
            {DEMO_COUPONS.length}
          </span>
        </button>
      </div>

      {/* キャンペーンタブ */}
      {activeTab === "campaigns" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">
                  キャンペーン名
                </th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                  タイプ
                </th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                  特典内容
                </th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                  期間
                </th>
                <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                  ステータス
                </th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">
                  利用数
                </th>
              </tr>
            </thead>
            <tbody>
              {DEMO_CAMPAIGNS.map((campaign) => {
                const statusColor = STATUS_COLORS[campaign.status];
                return (
                  <tr
                    key={campaign.id}
                    className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => showToast(`「${campaign.name}」の詳細画面はデモでは非対応です`)}
                  >
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-slate-800">{campaign.name}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                        {campaign.type}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-slate-600">{campaign.discount}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs text-slate-500">
                        {formatDate(campaign.startDate)} 〜 {formatDate(campaign.endDate)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${statusColor.bg} ${statusColor.text}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusColor.dot}`} />
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-semibold text-slate-800">{campaign.usageCount}</span>
                      <span className="text-xs text-slate-400 ml-0.5">件</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* クーポンタブ */}
      {activeTab === "coupons" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">
                  コード
                </th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                  キャンペーン名
                </th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                  割引
                </th>
                <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                  使用数 / 上限
                </th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                  有効期限
                </th>
                <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">
                  状態
                </th>
              </tr>
            </thead>
            <tbody>
              {DEMO_COUPONS.map((coupon) => {
                const isExpired = new Date(coupon.expiresAt) < new Date();
                return (
                  <tr
                    key={coupon.id}
                    className={`border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors ${
                      !coupon.isActive ? "opacity-60" : ""
                    }`}
                  >
                    {/* コード（等幅フォント） */}
                    <td className="px-6 py-4">
                      <code className="text-sm font-mono font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                        {coupon.code}
                      </code>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-slate-600">{coupon.campaignName}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-medium text-slate-700">{coupon.discount}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-sm font-semibold text-slate-800">{coupon.usedCount}</span>
                      <span className="text-xs text-slate-400 mx-1">/</span>
                      <span className="text-sm text-slate-500">
                        {coupon.maxUses !== null ? coupon.maxUses : "無制限"}
                      </span>
                      {/* 使用率バー（上限ありの場合） */}
                      {coupon.maxUses !== null && (
                        <div className="mt-1 w-full bg-slate-100 rounded-full h-1.5">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full transition-all"
                            style={{
                              width: `${Math.min((coupon.usedCount / coupon.maxUses) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-xs ${isExpired ? "text-red-500 font-medium" : "text-slate-500"}`}>
                        {formatDate(coupon.expiresAt)}
                        {isExpired && " (期限切れ)"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${
                          coupon.isActive
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            coupon.isActive ? "bg-green-500" : "bg-gray-400"
                          }`}
                        />
                        {coupon.isActive ? "有効" : "無効"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 補足 */}
      <p className="mt-4 text-xs text-slate-400">
        キャンペーン・クーポンの新規作成は管理画面から行えます（デモでは閲覧のみ対応）。
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
