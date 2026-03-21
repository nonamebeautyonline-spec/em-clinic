// 設定ページ左サイドナビゲーション
"use client";

import { useRouter } from "next/navigation";

export type SectionKey = "general" | "payment" | "line" | "sms" | "mypage" | "purchase" | "consultation" | "medical_fields" | "ehr" | "notification" | "business_rules" | "report" | "legal" | "options" | "cron" | "staff" | "account";
const SECTIONS: { key: SectionKey; label: string; icon: string; clinicOnly?: boolean; ownerOnly?: boolean }[] = [
  { key: "general", label: "基本情報", icon: "🏥" },
  { key: "line", label: "LINE連携", icon: "💬" },
  { key: "payment", label: "決済設定", icon: "💳" },
  { key: "sms", label: "SMS認証", icon: "📱", clinicOnly: true },
  { key: "mypage", label: "マイページ", icon: "🎨" },
  { key: "purchase", label: "購入画面", icon: "🛒" },
  { key: "consultation", label: "診察設定", icon: "🩺", clinicOnly: true },
  { key: "medical_fields", label: "診療分野", icon: "🏷", clinicOnly: true },
  { key: "ehr", label: "カルテ連携", icon: "🏗", clinicOnly: true },
  { key: "notification", label: "通知設定", icon: "🔔" },
  { key: "business_rules", label: "再処方制御", icon: "⚙", clinicOnly: true },
  { key: "report", label: "定期レポート", icon: "📊" },
  { key: "legal", label: "利用規約", icon: "📜" },
  { key: "options", label: "オプション機能", icon: "✨" },
  { key: "cron", label: "Cron実行履歴", icon: "⏱" },
  { key: "staff", label: "スタッフ管理", icon: "👥", ownerOnly: true },
  { key: "account", label: "アカウント", icon: "👤" },
];

interface SettingsNavProps {
  active: SectionKey;
  onChange: (key: SectionKey) => void;
  industry?: string;
  tenantRole?: string;
}

export default function SettingsNav({ active, onChange, industry = "clinic", tenantRole }: SettingsNavProps) {
  const router = useRouter();
  const visibleSections = SECTIONS.filter((s) => {
    if (s.clinicOnly && industry !== "clinic") return false;
    if (s.ownerOnly && tenantRole !== "owner" && tenantRole !== "admin") return false;
    return true;
  });

  return (
    <>
      {/* PC: 縦ナビ */}
      <nav className="hidden md:block w-52 shrink-0">
        <div className="sticky top-6 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {visibleSections.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium transition-colors text-left ${
                active === key
                  ? "bg-blue-50 text-blue-700 border-l-2 border-blue-600"
                  : "text-gray-600 hover:bg-gray-50 border-l-2 border-transparent"
              }`}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
          {/* 契約・課金ページへのリンク */}
          <button
            onClick={() => router.push("/admin/billing")}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium transition-colors text-left text-gray-600 hover:bg-gray-50 border-l-2 border-transparent border-t border-gray-100"
          >
            <span>💰</span>
            <span>契約・課金</span>
          </button>
        </div>
      </nav>

      {/* モバイル: セレクトボックス */}
      <div className="md:hidden mb-4">
        <select
          value={active}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "__billing__") {
              router.push("/admin/billing");
            } else {
              onChange(val as SectionKey);
            }
          }}
          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        >
          {visibleSections.map(({ key, label, icon }) => (
            <option key={key} value={key}>
              {icon} {label}
            </option>
          ))}
          <option value="__billing__">💰 契約・課金</option>
        </select>
      </div>
    </>
  );
}
