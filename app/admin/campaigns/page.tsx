// キャンペーン管理（2タブ: キャンペーン / クーポン）
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import CampaignTab from "./_components/CampaignTab";
import CouponTab from "./_components/CouponTab";

const TABS = [
  { key: "campaign", label: "キャンペーン" },
  { key: "coupon", label: "クーポン" },
] as const;

function CampaignsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get("tab") === "coupon" ? "coupon" : "campaign";

  const switchTab = (tab: string) => {
    router.push(`/admin/campaigns${tab === "coupon" ? "?tab=coupon" : ""}`);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">キャンペーン管理</h1>

      {/* タブ */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => switchTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* タブ内容 */}
      {activeTab === "campaign" ? <CampaignTab /> : <CouponTab />}
    </div>
  );
}

export default function CampaignsPage() {
  return (
    <Suspense fallback={<div className="p-6">読み込み中...</div>}>
      <CampaignsPageInner />
    </Suspense>
  );
}
