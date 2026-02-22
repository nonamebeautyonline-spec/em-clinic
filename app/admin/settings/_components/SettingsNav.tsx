// 設定ページ左サイドナビゲーション
"use client";

export type SectionKey = "general" | "payment" | "line" | "sms" | "mypage" | "flex" | "ehr" | "account";

const SECTIONS: { key: SectionKey; label: string; icon: string }[] = [
  { key: "general", label: "基本情報", icon: "🏥" },
  { key: "payment", label: "決済設定", icon: "💳" },
  { key: "line", label: "LINE連携", icon: "💬" },
  { key: "sms", label: "SMS認証", icon: "📱" },
  { key: "mypage", label: "マイページ", icon: "🎨" },
  { key: "flex", label: "LINE通知", icon: "📩" },
  { key: "ehr", label: "カルテ連携", icon: "🏗" },
  { key: "account", label: "アカウント", icon: "👤" },
];

interface SettingsNavProps {
  active: SectionKey;
  onChange: (key: SectionKey) => void;
}

export default function SettingsNav({ active, onChange }: SettingsNavProps) {
  return (
    <>
      {/* PC: 縦ナビ */}
      <nav className="hidden md:block w-52 shrink-0">
        <div className="sticky top-6 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {SECTIONS.map(({ key, label, icon }) => (
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
        </div>
      </nav>

      {/* モバイル: セレクトボックス */}
      <div className="md:hidden mb-4">
        <select
          value={active}
          onChange={(e) => onChange(e.target.value as SectionKey)}
          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        >
          {SECTIONS.map(({ key, label, icon }) => (
            <option key={key} value={key}>
              {icon} {label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
