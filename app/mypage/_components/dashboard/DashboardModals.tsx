"use client";

import React from "react";
import { useDashboardContext } from "./DashboardContext";
import { formatDateTime } from "./types";

export function DashboardModals() {
  const {
    data,
    toast,
    showCancelSuccess,
    showCancelConfirm,
    setShowCancelConfirm,
    canceling,
    handleCancelReservationConfirm,
    showReorderCancelSuccess,
    showReorderCancelConfirm,
    setShowReorderCancelConfirm,
    cancelingReorder,
    handleReorderCancel,
    displayReorder,
    displayReorderStatus,
    productLabels,
  } = useDashboardContext();

  return (
    <>
      {/* トースト */}
      {toast && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20">
          <div className="bg-white px-6 py-3 rounded-2xl shadow-lg text-slate-700 text-sm font-semibold">
            ✓ {toast}
          </div>
        </div>
      )}

      {/* 予約キャンセル完了トースト */}
      {showCancelSuccess && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35">
          <div className="bg-white px-6 py-4 rounded-2xl shadow-lg text-base font-semibold" style={{ color: 'var(--mp-primary)' }}>
            ✓ 予約をキャンセルしました
          </div>
        </div>
      )}

      {/* 予約キャンセル確認モーダル */}
      {showCancelConfirm && data?.nextReservation && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35">
          <div className="bg-white rounded-2xl shadow-lg p-5 w-[90%] max-w-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">
              この予約をキャンセルしますか？
            </h3>
            <p className="text-[13px] text-slate-600 mb-4">
              {formatDateTime(data.nextReservation.datetime)}
              <br />
              {data.nextReservation.title}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                disabled={canceling}
                className="flex-1 h-10 rounded-xl border border-slate-200 text-[13px] text-slate-700"
              >
                戻る
              </button>
              <button
                type="button"
                onClick={handleCancelReservationConfirm}
                disabled={canceling}
                className={
                  "flex-1 h-10 rounded-xl text-[13px] font-semibold text-white " +
                  (canceling
                    ? "bg-[var(--mp-primary)] opacity-50 cursor-not-allowed"
                    : "bg-[var(--mp-primary)] active:scale-[0.98]")
                }
              >
                {canceling ? "処理中…" : "キャンセルする"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 再処方キャンセル完了トースト */}
      {showReorderCancelSuccess && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35">
          <div className="bg-white px-6 py-4 rounded-2xl shadow-lg text-base font-semibold" style={{ color: 'var(--mp-primary)' }}>
            ✓ 再処方申請をキャンセルしました
          </div>
        </div>
      )}

      {/* 再処方キャンセル確認モーダル */}
      {showReorderCancelConfirm && displayReorder && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35">
          <div className="bg-white rounded-2xl shadow-lg p-5 w-[90%] max-w-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">
              {displayReorderStatus === "confirmed"
                ? "許可済みの再処方をキャンセルしますか？"
                : "この再処方申請をキャンセルしますか？"}
            </h3>
            <p className="text-[13px] text-slate-600 mb-4">
              {(displayReorder.productCode && productLabels[displayReorder.productCode]) || displayReorder.productLabel}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowReorderCancelConfirm(false)}
                disabled={cancelingReorder}
                className="flex-1 h-10 rounded-xl border border-slate-200 text-[13px] text-slate-700"
              >
                戻る
              </button>
              <button
                type="button"
                onClick={handleReorderCancel}
                disabled={cancelingReorder}
                className={
                  "flex-1 h-10 rounded-xl text-[13px] font-semibold text-white " +
                  (cancelingReorder
                    ? "bg-[var(--mp-primary)] opacity-50 cursor-not-allowed"
                    : "bg-[var(--mp-primary)] active:scale-[0.98]")
                }
              >
                {cancelingReorder ? "処理中…" : "キャンセルする"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
