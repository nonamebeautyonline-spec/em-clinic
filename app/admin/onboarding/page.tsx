"use client";

// app/admin/onboarding/page.tsx — テナント初期設定ウィザード
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Step0Welcome from "./_steps/Step0Welcome";
import Step1Line from "./_steps/Step1Line";
import Step2Payment from "./_steps/Step2Payment";
import Step3Products from "./_steps/Step3Products";
import Step4Schedule from "./_steps/Step4Schedule";
import Step5Complete from "./_steps/Step5Complete";

// セットアップ状態の型定義
interface SetupStatus {
  ok: boolean;
  setupComplete: boolean;
  completedCount: number;
  totalCount: number;
  steps: {
    line: boolean;
    payment: boolean;
    products: boolean;
    schedule: boolean;
    staff: boolean;
    richMenu: boolean;
  };
}

// ウィザードのステップ定義（ウィザードで扱う4ステップ）
type WizardStep = 0 | 1 | 2 | 3 | 4 | 5;

const STEP_LABELS = [
  { id: 1, label: "LINE連携" },
  { id: 2, label: "決済設定" },
  { id: 3, label: "商品登録" },
  { id: 4, label: "スケジュール" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(0);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 初期データ取得
  useEffect(() => {
    Promise.all([
      fetch("/api/admin/setup-status", { credentials: "include" }).then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch("/api/admin/tenant-info", { credentials: "include" }).then((r) =>
        r.ok ? r.json() : null,
      ),
    ])
      .then(([status, info]) => {
        if (status) setSetupStatus(status);
        if (info?.name) setTenantName(info.name);
        // 全完了ならダッシュボードへ
        if (status?.setupComplete) {
          router.push("/admin");
          return;
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  // セットアップ状態を再取得
  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/setup-status", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setSetupStatus(data);
        return data as SetupStatus;
      }
    } catch {
      // 無視
    }
    return null;
  }, []);

  // 次のステップへ進む
  const goNext = useCallback(async () => {
    // 状態を再取得して最新化
    await refreshStatus();
    setStep((s) => Math.min(s + 1, 5) as WizardStep);
  }, [refreshStatus]);

  // 前のステップへ
  const goBack = useCallback(() => {
    setStep((s) => Math.max(s - 1, 0) as WizardStep);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* ステップインジケーター（Welcome/Complete以外） */}
        {step >= 1 && step <= 4 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              {STEP_LABELS.map((s, idx) => (
                <div key={s.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                        step > s.id
                          ? "bg-green-500 text-white"
                          : step === s.id
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-slate-200 text-slate-400"
                      }`}
                    >
                      {step > s.id ? (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        s.id
                      )}
                    </div>
                    <span
                      className={`mt-1 text-xs font-medium hidden sm:block ${
                        step >= s.id ? "text-blue-600" : "text-slate-400"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {idx < STEP_LABELS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 sm:mx-3 mt-[-18px] sm:mt-0 ${
                        step > s.id ? "bg-green-500" : "bg-slate-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            {/* プログレスバー */}
            <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-500 ease-out rounded-full"
                style={{ width: `${((step - 1) / 3) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* ステップコンテンツ */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          {step === 0 && (
            <Step0Welcome
              tenantName={tenantName}
              setupStatus={setupStatus}
              onNext={goNext}
            />
          )}
          {step === 1 && (
            <Step1Line
              completed={setupStatus?.steps.line ?? false}
              onNext={goNext}
              onBack={goBack}
            />
          )}
          {step === 2 && (
            <Step2Payment
              completed={setupStatus?.steps.payment ?? false}
              onNext={goNext}
              onBack={goBack}
            />
          )}
          {step === 3 && (
            <Step3Products
              completed={setupStatus?.steps.products ?? false}
              onNext={goNext}
              onBack={goBack}
            />
          )}
          {step === 4 && (
            <Step4Schedule
              completed={setupStatus?.steps.schedule ?? false}
              onNext={goNext}
              onBack={goBack}
            />
          )}
          {step === 5 && <Step5Complete />}
        </div>
      </div>
    </div>
  );
}
