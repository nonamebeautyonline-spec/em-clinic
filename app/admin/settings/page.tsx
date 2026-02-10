"use client";

import { useState, useEffect, useCallback } from "react";

/* ---------- types ---------- */
type CategoryKey = "square" | "line" | "gas" | "general" | "payment";

interface SettingItem {
  key: string;
  label: string;
  maskedValue: string;
  source: "db" | "env" | "未設定";
}

type SettingsMap = Record<CategoryKey, SettingItem[]>;

const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: "square", label: "Square" },
  { key: "line", label: "LINE" },
  { key: "gas", label: "GAS連携" },
  { key: "general", label: "一般" },
  { key: "payment", label: "決済プロバイダー" },
];

const SECRET_KEYWORDS = [
  "token",
  "secret",
  "password",
  "key",
  "access",
  "webhook",
];

function isSecretField(key: string): boolean {
  const lower = key.toLowerCase();
  return SECRET_KEYWORDS.some((kw) => lower.includes(kw));
}

/* ---------- sub-components ---------- */

function SourceBadge({ source }: { source: SettingItem["source"] }) {
  const styles: Record<string, string> = {
    db: "bg-green-100 text-green-700",
    env: "bg-yellow-100 text-yellow-700",
    未設定: "bg-gray-100 text-gray-500",
  };
  const labels: Record<string, string> = {
    db: "DB",
    env: "env",
    未設定: "未設定",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${styles[source] ?? styles["未設定"]}`}
    >
      {labels[source] ?? source}
    </span>
  );
}

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
        type === "success"
          ? "bg-green-600 text-white"
          : "bg-red-600 text-white"
      }`}
    >
      {type === "success" ? (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      ) : (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      )}
      {message}
    </div>
  );
}

/* ---------- setting row ---------- */

function SettingRow({
  item,
  category,
  onSaved,
}: {
  item: SettingItem;
  category: CategoryKey;
  onSaved: (msg: string, type: "success" | "error") => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!value.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, key: item.key, value: value.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `保存に失敗しました (${res.status})`);
      }
      onSaved(`${item.label} を保存しました`, "success");
      setValue("");
      setExpanded(false);
    } catch (err: any) {
      onSaved(err.message || "保存に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900">{item.label}</p>
            <p className="text-xs text-slate-500 mt-0.5 font-mono truncate">
              {item.maskedValue || "未設定"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <SourceBadge source={item.source} />
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-4 flex items-center gap-3">
          <input
            type={isSecretField(item.key) ? "password" : "text"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`新しい${item.label}を入力`}
            className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleSave}
            disabled={saving || !value.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- payment provider panel ---------- */

function PaymentProviderPanel({
  settings,
  onSaved,
}: {
  settings: SettingItem[];
  onSaved: (msg: string, type: "success" | "error") => void;
}) {
  const providerSetting = settings.find((s) => s.key === "provider");
  const currentProvider = providerSetting?.maskedValue || "";

  const [selected, setSelected] = useState<string>(
    currentProvider === "未設定" ? "" : currentProvider,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const val = providerSetting?.maskedValue || "";
    setSelected(val === "未設定" ? "" : val);
  }, [providerSetting?.maskedValue]);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "payment",
          key: "provider",
          value: selected,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `保存に失敗しました (${res.status})`);
      }
      onSaved("決済プロバイダーを保存しました", "success");
    } catch (err: any) {
      onSaved(err.message || "保存に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  };

  const otherSettings = settings.filter((s) => s.key !== "provider");

  return (
    <div>
      {/* provider radio selection */}
      <div className="px-5 py-4 border-b border-slate-100">
        <p className="text-sm font-medium text-slate-900 mb-3">
          決済プロバイダー選択
        </p>
        <div className="flex items-center gap-6">
          {[
            { value: "square", label: "Square" },
            { value: "gmo", label: "GMO" },
          ].map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 cursor-pointer"
            >
              <input
                type="radio"
                name="payment_provider"
                value={opt.value}
                checked={selected === opt.value}
                onChange={(e) => setSelected(e.target.value)}
                className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">{opt.label}</span>
            </label>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <SourceBadge source={providerSetting?.source ?? "未設定"} />
          <button
            onClick={handleSave}
            disabled={saving || !selected}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>

      {/* other payment-related settings */}
      {otherSettings.map((item) => (
        <SettingRow
          key={item.key}
          item={item}
          category="payment"
          onSaved={onSaved}
        />
      ))}
    </div>
  );
}

/* ---------- main page ---------- */

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<CategoryKey>("square");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings", {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`データ取得失敗 (${res.status})`);
      const data = await res.json();
      setSettings(data.settings);
    } catch (err: any) {
      setError(err.message || "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSaved = useCallback(
    (message: string, type: "success" | "error") => {
      setToast({ message, type });
      if (type === "success") {
        loadSettings();
      }
    },
    [loadSettings],
  );

  const currentSettings = settings?.[activeTab] ?? [];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-slate-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">設定</h1>
        <p className="text-slate-500 text-sm mt-1">
          各種サービスの設定を管理します
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* tabs + content */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        {/* tab navigation */}
        <div className="border-b border-slate-200">
          <nav className="flex -mb-px overflow-x-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveTab(cat.key)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === cat.key
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </nav>
        </div>

        {/* content */}
        <div>
          {currentSettings.length === 0 && !loading && (
            <div className="px-5 py-12 text-center text-slate-400 text-sm">
              この カテゴリの設定はありません
            </div>
          )}

          {activeTab === "payment" ? (
            <PaymentProviderPanel
              settings={currentSettings}
              onSaved={handleSaved}
            />
          ) : (
            currentSettings.map((item) => (
              <SettingRow
                key={item.key}
                item={item}
                category={activeTab}
                onSaved={handleSaved}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
