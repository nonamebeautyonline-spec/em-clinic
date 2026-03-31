"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR, { mutate } from "swr";
import SettingsNav, { type SectionKey } from "./_components/SettingsNav";
import GeneralSection from "./_components/GeneralSection";
import PaymentSection from "./_components/PaymentSection";
import LineSection from "./_components/LineSection";
import MypageSection from "./_components/MypageSection";
import PurchaseSection from "./_components/PurchaseSection";
import AccountSection from "./_components/AccountSection";
import SmsSection from "./_components/SmsSection";
import EhrSection from "./_components/EhrSection";
import ConsultationSection from "./_components/ConsultationSection";
import NotificationSection from "./_components/NotificationSection";
import OptionsSection from "./_components/OptionsSection";
import ReportSection from "./_components/ReportSection";
import LegalSection from "./_components/LegalSection";
import CronSection from "./_components/CronSection";
import BusinessRulesSection from "./_components/BusinessRulesSection";
import MedicalFieldsSection from "./_components/MedicalFieldsSection";
import StaffSection from "./_components/StaffSection";
import StripeConnectSection from "./_components/StripeConnectSection";

/* ---------- 共通型（子コンポーネントから参照） ---------- */
export type CategoryKey = "square" | "gmo" | "line" | "gas" | "general" | "payment" | "sms";

export interface SettingItem {
  key: string;
  label: string;
  maskedValue: string;
  source: "db" | "env" | "未設定";
  readonly?: boolean;
}

export type SettingsMap = Record<CategoryKey, SettingItem[]>;

/* ---------- 共通ユーティリティ ---------- */
const SECRET_KEYWORDS = ["token", "secret", "password", "key", "access", "webhook"];

function isSecretField(key: string): boolean {
  const lower = key.toLowerCase();
  return SECRET_KEYWORDS.some((kw) => lower.includes(kw));
}

/* ---------- 共通サブコンポーネント ---------- */
export function SourceBadge({ source }: { source: SettingItem["source"] }) {
  const styles: Record<string, string> = {
    db: "bg-green-100 text-green-700",
    env: "bg-yellow-100 text-yellow-700",
    未設定: "bg-gray-100 text-gray-500",
  };
  const labels: Record<string, string> = { db: "DB", env: "env", 未設定: "未設定" };
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${styles[source] ?? styles["未設定"]}`}>
      {labels[source] ?? source}
    </span>
  );
}

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
      type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
    }`}>
      {type === "success" ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      {message}
    </div>
  );
}

export function SettingRow({
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
        throw new Error((data.message || data.error) || `保存に失敗しました (${res.status})`);
      }
      onSaved(`${item.label} を保存しました`, "success");
      setValue("");
      setExpanded(false);
    } catch (err) {
      onSaved(err instanceof Error ? err.message : "保存に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        type="button"
        onClick={() => !item.readonly && setExpanded((v) => !v)}
        className={`w-full flex items-center justify-between px-5 py-4 transition-colors text-left ${item.readonly ? "cursor-default" : "hover:bg-gray-50"}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900">{item.label}</p>
            <p className="text-xs text-gray-500 mt-0.5 font-mono truncate">{item.maskedValue || "未設定"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {item.readonly && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">自動設定</span>}
          <SourceBadge source={item.source} />
          {!item.readonly && (
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </button>
      {expanded && (
        <div className="px-5 pb-4 flex items-center gap-3">
          <input
            type={isSecretField(item.key) ? "password" : "text"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`新しい${item.label}を入力`}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

/* ---------- メインページ ---------- */
export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SectionKey>("general");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const { data: settingsData, isLoading: loading, error: settingsError } = useSWR<{ settings: SettingsMap }>("/api/admin/settings");
  const settings = settingsData?.settings ?? null;
  const error = settingsError ? (settingsError instanceof Error ? settingsError.message : "エラーが発生しました") : "";

  // テナント情報取得
  const { data: tenantData } = useSWR<{ industry?: string; enabledOptions?: string[] }>("/api/admin/tenant-info");
  const industry = tenantData?.industry ?? "clinic";
  const enabledOptions = tenantData?.enabledOptions ?? [];

  // セッション情報取得（tenantRole用）
  const { data: sessionData } = useSWR<{ ok: boolean; user: { tenantRole?: string; userId?: string } }>("/api/admin/session");
  const tenantRole = sessionData?.ok ? sessionData.user?.tenantRole || "" : "";

  // セットアップ状態取得
  const { data: setupData } = useSWR<{ setupComplete?: boolean }>("/api/admin/setup-status");
  const setupComplete = setupData?.setupComplete ?? true;

  // URLパラメータからセクション指定
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const section = params.get("section");
    if (section) {
      setActiveSection(section as SectionKey);
    }
  }, []);

  const handleSaved = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    if (type === "success") mutate("/api/admin/settings");
  }, []);

  const handleToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
  }, []);

  // 基本設定系セクションでローディング中
  const isBasicSection = activeSection === "general" || activeSection === "payment" || activeSection === "line" || activeSection === "sms";
  if (loading && isBasicSection) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50/50">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100">
        <div className="h-0.5 bg-gradient-to-r from-amber-400 to-orange-500" />
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-5">
          <h1 className="text-xl font-bold text-gray-900">設定</h1>
          <p className="text-sm text-gray-500 mt-0.5">各種サービスの設定を管理します</p>
        </div>
      </div>

      {/* セットアップバナー（LINE未設定時） */}
      {!setupComplete && (
        <div className="max-w-7xl mx-auto px-4 md:px-8 mt-4">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-sm">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-amber-900">Lオペへようこそ</h3>
                <p className="text-sm text-amber-700 mt-1">
                  全機能を利用するために、LINE Messaging APIの設定を完了してください。
                </p>
                <button
                  onClick={() => setActiveSection("line")}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors shadow-sm"
                >
                  LINE連携を設定する
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-7xl mx-auto px-4 md:px-8 mt-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        </div>
      )}

      {/* メインレイアウト */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        {/* モバイルナビ（md未満で表示） */}
        <div className="md:hidden">
          <SettingsNav active={activeSection} onChange={setActiveSection} industry={industry} tenantRole={tenantRole} />
        </div>

        <div className="flex gap-6">
          {/* PCナビ（md以上で表示） */}
          <div className="hidden md:block">
            <SettingsNav active={activeSection} onChange={setActiveSection} industry={industry} tenantRole={tenantRole} />
          </div>

          {/* コンテンツ領域 */}
          <div className="flex-1 min-w-0">
            {activeSection === "general" && <GeneralSection settings={settings} onSaved={handleSaved} />}
            {activeSection === "payment" && <PaymentSection settings={settings} onSaved={handleSaved} />}
            {activeSection === "line" && <LineSection settings={settings} onSaved={handleSaved} />}
            {activeSection === "sms" && <SmsSection settings={settings} onSaved={handleSaved} />}
            {activeSection === "mypage" && <MypageSection onToast={handleToast} />}
            {activeSection === "purchase" && <PurchaseSection onToast={handleToast} />}
            {activeSection === "consultation" && <ConsultationSection onToast={handleToast} />}
            {activeSection === "medical_fields" && <MedicalFieldsSection onToast={handleToast} />}
            {activeSection === "ehr" && <EhrSection onToast={handleToast} />}
            {activeSection === "notification" && <NotificationSection onToast={handleToast} />}
            {activeSection === "business_rules" && <BusinessRulesSection onToast={handleToast} />}
            {activeSection === "report" && <ReportSection onToast={handleToast} />}
            {activeSection === "legal" && <LegalSection onToast={handleToast} />}
            {activeSection === "options" && <OptionsSection enabledOptions={enabledOptions} />}
            {activeSection === "cron" && <CronSection onToast={handleToast} />}
            {activeSection === "staff" && <StaffSection onToast={handleToast} currentUserId={sessionData?.ok ? (sessionData.user?.userId as string) || "" : ""} />}
            {activeSection === "stripe_connect" && <StripeConnectSection onToast={handleToast} />}
            {activeSection === "account" && <AccountSection onToast={handleToast} />}
          </div>
        </div>
      </div>
    </div>
  );
}
