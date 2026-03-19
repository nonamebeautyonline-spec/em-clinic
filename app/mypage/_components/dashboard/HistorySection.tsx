"use client";

import React from "react";
import { useDashboardContext } from "./DashboardContext";
import { formatDateSafe, getTimeSafe, PRODUCT_LABELS } from "./types";

export function HistorySection() {
  const {
    data,
    mpSections,
    mpLabels,
    showAllHistory,
    historyLoading,
    historyError,
    handleShowAllHistory,
  } = useDashboardContext();

  if (!mpSections.showHistory) return null;

  const orderHistoryAll = (data.orders ?? [])
    .slice()
    .sort((a, b) => getTimeSafe(b.paidAt) - getTimeSafe(a.paidAt));

  console.log(
    "[history]",
    "orders=", (data.orders ?? []).length,
    "orderHistoryAll=", orderHistoryAll.length,
    "hasMore=", orderHistoryAll.length > 5,
    "showAll=", showAllHistory
  );

  const orderHistoryPreview = orderHistoryAll.slice(0, 5);
  const hasMoreOrderHistory = orderHistoryAll.length > 5;
  const orderHistoryToRender = showAllHistory ? orderHistoryAll : orderHistoryPreview;

  return (
    <section className="bg-white rounded-3xl shadow-sm p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-800">
          {mpLabels.historyTitle}
        </h2>
        {hasMoreOrderHistory && !showAllHistory && (
          <button
            type="button"
            onClick={handleShowAllHistory}
            disabled={historyLoading}
            className="text-xs text-slate-500 hover:text-slate-700 disabled:text-slate-300"
          >
            {historyLoading ? "読み込み中…" : "すべて表示"}
          </button>
        )}
      </div>

      {orderHistoryToRender.length === 0 ? (
        <div className="text-sm text-slate-600">
          {mpLabels.noHistoryText}
        </div>
      ) : (
        <div className="space-y-3">
          {orderHistoryToRender.map((o) => {
            const paidLabel = formatDateSafe(o.paidAt);
            const isRefunded =
              o.refundStatus === "COMPLETED" || o.paymentStatus === "refunded";
            const refundedLabel = formatDateSafe(o.refundedAt);

            return (
              <div
                key={o.id}
                className="flex items-start justify-between gap-3 border border-slate-100 rounded-xl px-3 py-3"
              >
                <div className="min-w-0">
                  <div className="text-[11px] text-slate-500">
                    {paidLabel || "—"}
                    {isRefunded && refundedLabel ? (
                      <span className="ml-2">（返金日：{refundedLabel}）</span>
                    ) : null}
                  </div>

                  <div className="text-sm font-medium text-slate-900">
                    {(o.productCode && PRODUCT_LABELS[o.productCode]) || o.productName || o.productCode}
                  </div>

                  {isRefunded && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                        返金済み
                      </span>

                      {typeof o.refundedAmount === "number" && o.refundedAmount > 0 && (
                        <span className="text-slate-600">
                          返金額：¥{o.refundedAmount.toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {historyError && (
        <div className="mt-2 text-[11px] text-rose-600">
          {historyError}
        </div>
      )}
    </section>
  );
}
