"use client";

import React, { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  DashboardProvider,
  usePatientDashboard,
  DashboardModals,
  ReservationSection,
  OrdersSection,
  HistorySection,
} from "./_components/dashboard";

export default function PatientDashboardInner() {
  const router = useRouter();
  const { loading, error, contextValue } = usePatientDashboard();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500 text-sm">読み込み中です…</div>
      </div>
    );
  }

  if (error || !contextValue) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow px-6 py-4 text-sm text-rose-600">
          {error ??
            "データが取得できませんでした。時間をおいて再度お試しください。"}
        </div>
      </div>
    );
  }

  const { data, mpColors, mpSections, mpContent, mpLabels, hasIntake, intakeStatus, reorders } = contextValue;
  const { patient, nextReservation, history, ordersFlags } = data;
  const hasHistory = history.length > 0;
  const isNG = intakeStatus === "NG";
  const hasPendingReorder = reorders.some((r) => r.status === "pending");
  const canReserve = hasIntake === true && (!hasHistory || isNG) && !nextReservation;

  // 初回購入ボタン
  const showInitialPurchase =
    hasHistory &&
    !isNG &&
    !(ordersFlags?.hasAnyPaidOrder ?? false) &&
    !hasPendingReorder;
  const canPurchaseInitial =
    showInitialPurchase && (ordersFlags?.canPurchaseCurrentCourse ?? true);

  return (
    <DashboardProvider value={contextValue}>
      <div className="min-h-screen" style={{ backgroundColor: mpColors.pageBg, '--mp-primary': mpColors.primary, '--mp-hover': mpColors.primaryHover, '--mp-light': mpColors.primaryLight, '--mp-text': mpColors.primaryText } as React.CSSProperties}>
        <DashboardModals />

        {/* ヘッダー */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200">
          <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {mpContent.logoUrl ? (
                <Image src={mpContent.logoUrl} alt="clinic logo" width={150} height={40} className="object-contain" />
              ) : mpContent.clinicName ? (
                <span className="text-lg font-bold" style={{ color: 'var(--mp-primary)' }}>{mpContent.clinicName}</span>
              ) : (
                <Image src="/images/company-name-v2.png" alt="clinic logo" width={150} height={40} className="object-contain" />
              )}
            </div>

            <button className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm font-semibold text-slate-800">
                  {patient.displayName} さん
                </div>
                <div className="text-[11px] text-slate-500">
                  Patient ID: {patient.id ? `${patient.id.slice(0, 3)}***${patient.id.slice(-2)}` : "—"}
                </div>
              </div>
              <div className="w-9 h-9 rounded-full bg-slate-200" />
            </button>
          </div>
        </header>

        {/* 上部CTA */}
        {(mpSections.showIntake || mpSections.showReserveButton) && (
        <div className="mx-auto max-w-4xl px-4 mt-3 space-y-2">
          {/* 問診 */}
          {mpSections.showIntake && (
            hasIntake === null ? (
              <button
                type="button"
                disabled
                className="block w-full rounded-xl bg-slate-200 text-slate-500 text-center py-3 text-base font-semibold cursor-not-allowed"
              >
                問診状況を確認中…
              </button>
            ) : hasIntake === true ? (
              <>
                <button
                  type="button"
                  disabled
                  className="block w-full rounded-xl bg-slate-200 text-slate-500 text-center py-3 text-base font-semibold cursor-not-allowed"
                >
                  {mpLabels.intakeCompleteText}
                </button>
                <p className="mt-1 text-[11px] text-slate-500">
                  {mpLabels.intakeGuideText}
                </p>
              </>
            ) : (
              <>
                <Link
                  href="/intake"
                  className="block w-full rounded-xl text-white text-center py-3 text-base font-semibold shadow-sm transition bg-[var(--mp-primary)] hover:bg-[var(--mp-hover)]"
                >
                  {mpLabels.intakeButtonLabel}
                </Link>
                <p className="mt-1 text-[11px] text-slate-500">
                  {mpLabels.intakeNoteText}
                </p>
              </>
            )
          )}

          {/* 予約ボタン */}
          {mpSections.showReserveButton && (
            <button
              type="button"
              disabled={!canReserve}
              onClick={() => {
                if (!canReserve) return;
                router.push("/reserve");
              }}
              className={
                "block w-full rounded-xl text-center py-3 text-base font-semibold border " +
                (!canReserve
                  ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                  : "bg-white text-[var(--mp-primary)] border-[var(--mp-primary)] hover:bg-[var(--mp-light)] transition")
              }
            >
              {mpLabels.reserveButtonLabel}
            </button>
          )}

          {/* NG患者バナー */}
          {isNG && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-sm font-semibold text-rose-700 mb-1">処方不可</p>
              <p className="text-[12px] text-rose-600 leading-relaxed">
                診察の結果、現在処方ができない状態です。<br />
                再度診察をご希望の場合は「予約に進む」から予約をお取りください。
              </p>
            </div>
          )}

          {/* 初回決済ボタン */}
          {showInitialPurchase && (
            <button
              type="button"
              disabled={!canPurchaseInitial}
              onClick={() => {
                if (!canPurchaseInitial) return;
                router.push("/mypage/purchase");
              }}
              className={
                "mt-3 block w-full rounded-xl text-center py-3 text-base font-semibold " +
                (canPurchaseInitial
                  ? "bg-[var(--mp-primary)] text-white border border-[var(--mp-primary)] hover:bg-[var(--mp-hover)] transition"
                  : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed")
              }
            >
              {mpLabels.purchaseButtonLabel}
            </button>
          )}
        </div>
        )}

        {/* 本文 */}
        <main className="mx-auto max-w-4xl px-4 py-4 space-y-4 md:py-6">
          <ReservationSection />
          <OrdersSection />
          <HistorySection />

          {/* よくある質問 */}
          <section className="bg-white rounded-3xl shadow-sm p-4 md:p-5 mb-4">
            <h2 className="text-sm font-semibold text-slate-800 mb-2">よくある質問</h2>
            <p className="text-sm text-slate-600 mb-3">
              マイページ・予約・決済・配送などについてのQ&Aをまとめています。
            </p>
            <Link
              href="/mypage/qa"
              className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition border border-[var(--mp-primary)] text-[var(--mp-primary)] bg-white hover:bg-[var(--mp-light)]"
            >
              Q&Aを見る
            </Link>
          </section>

          {/* データエクスポート */}
          <section className="bg-white rounded-3xl shadow-sm p-4 md:p-5 mb-4">
            <h2 className="text-sm font-semibold text-slate-800 mb-2">データエクスポート</h2>
            <p className="text-sm text-slate-600 mb-3">
              ご自身のデータ（予約・注文履歴など）をJSON形式でダウンロードできます。
            </p>
            <ExportButton />
          </section>

          {/* サポート */}
          {mpSections.showSupport && (
            <section className="bg-white rounded-3xl shadow-sm p-4 md:p-5 mb-4">
              <h2 className="text-sm font-semibold text-slate-800 mb-2">
                {mpLabels.supportTitle}
              </h2>
              <p className="text-sm text-slate-600 mb-3">
                {mpContent.supportMessage}
              </p>
              <a
                href={mpContent.supportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium text-white transition bg-[var(--mp-primary)] hover:bg-[var(--mp-hover)]"
              >
                {mpContent.supportButtonLabel}
              </a>
              <p className="mt-2 text-[11px] text-slate-500">
                {mpContent.supportNote}
              </p>
            </section>
          )}
        </main>
      </div>
    </DashboardProvider>
  );
}

// データエクスポートボタンコンポーネント
function ExportButton() {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    setExporting(true);
    setExportError(null);
    try {
      const res = await fetch("/api/mypage/export", { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setExportError(json.message || "エクスポートに失敗しました");
        return;
      }
      const blob = new Blob([JSON.stringify(json.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `patient-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setExportError("エクスポート中にエラーが発生しました");
    } finally {
      setExporting(false);
    }
  }, []);

  return (
    <div>
      <button
        onClick={handleExport}
        disabled={exporting}
        className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition border border-[var(--mp-primary)] text-[var(--mp-primary)] bg-white hover:bg-[var(--mp-light)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {exporting ? "エクスポート中..." : "データエクスポート"}
      </button>
      {exportError && (
        <p className="mt-2 text-[11px] text-rose-600">{exportError}</p>
      )}
    </div>
  );
}
