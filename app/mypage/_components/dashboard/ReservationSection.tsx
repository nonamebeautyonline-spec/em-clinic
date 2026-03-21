"use client";

import React from "react";
import { useDashboardContext } from "./DashboardContext";
import {
  formatDateTime,
  formatVisitSlotRange,
  reservationStatusBadgeClass,
  reservationStatusLabel,
} from "./types";

export function ReservationSection() {
  const {
    data,
    mpSections,
    mpLabels,
    reservationSettings,
    handleChangeReservation,
    setShowCancelConfirm,
    multiFieldEnabled,
  } = useDashboardContext();

  if (!mpSections.showReservation) return null;

  const { nextReservation, history } = data;
  const hasHistory = history.length > 0;
  const lastHistory = hasHistory ? history[0] : null;
  const isFirstVisit = !hasHistory;

  const topSectionTitle = nextReservation
    ? mpLabels.reservationTitle
    : hasHistory
    ? "初回診察"
    : mpLabels.reservationTitle;

  // 期限制御
  const canChangeReservation = (() => {
    if (!nextReservation || !reservationSettings) return true;
    const hours = reservationSettings.change_deadline_hours;
    if (hours <= 0) return true;
    const resvTime = new Date(nextReservation.datetime).getTime();
    const now = Date.now();
    return (resvTime - now) >= hours * 60 * 60 * 1000;
  })();

  const canCancelReservation = (() => {
    if (!nextReservation || !reservationSettings) return true;
    const hours = reservationSettings.cancel_deadline_hours;
    if (hours <= 0) return true;
    const resvTime = new Date(nextReservation.datetime).getTime();
    const now = Date.now();
    return (resvTime - now) >= hours * 60 * 60 * 1000;
  })();

  return (
    <section className="bg-white rounded-3xl shadow-sm p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-800">
          {topSectionTitle}
        </h2>
        {nextReservation && (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${reservationStatusBadgeClass(
              nextReservation.status
            )}`}
            style={nextReservation.status === "scheduled" ? { backgroundColor: 'var(--mp-light)', color: 'var(--mp-primary)' } : undefined}
          >
            {reservationStatusLabel(nextReservation.status)}
          </span>
        )}
      </div>

      {nextReservation ? (
        <>
          <div className="text-[15px] font-semibold text-slate-900">
            {formatDateTime(nextReservation.datetime)}
          </div>

          <div className="mt-1 text-sm text-slate-600 flex items-center gap-1.5">
            <span>{nextReservation.title}</span>
            {multiFieldEnabled && nextReservation.fieldName && (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                {nextReservation.fieldName}
              </span>
            )}
          </div>

          <p className="mt-2 text-xs text-slate-600 leading-relaxed whitespace-pre-line">
            {mpLabels.phoneNotice}
          </p>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            {canChangeReservation ? (
              <button
                type="button"
                onClick={handleChangeReservation}
                className="flex-1 inline-flex items-center justify-center rounded-xl border border-[var(--mp-primary)] bg-white px-3 py-2 text-sm text-[var(--mp-primary)] hover:bg-[var(--mp-light)] transition"
              >
                日時を変更する
              </button>
            ) : (
              <div className="flex-1 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400">
                変更期限を過ぎています
              </div>
            )}

            {canCancelReservation ? (
              <button
                type="button"
                onClick={() => setShowCancelConfirm(true)}
                className="flex-1 inline-flex items-center justify-center rounded-xl bg-[var(--mp-primary)] px-3 py-2 text-sm text-white hover:bg-[var(--mp-hover)] transition"
              >
                予約をキャンセルする
              </button>
            ) : (
              <div className="flex-1 inline-flex items-center justify-center rounded-xl bg-slate-100 border border-slate-200 px-3 py-2 text-sm text-slate-400">
                キャンセル期限を過ぎています
              </div>
            )}
          </div>

          <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">
            {mpLabels.cancelNotice}
          </p>
        </>
      ) : lastHistory ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-sm font-semibold text-slate-900">
            {formatVisitSlotRange(lastHistory.date)} 診察ずみ
          </div>
        </div>
      ) : (
        <div className="text-sm text-slate-600">
          {isFirstVisit ? (
            <>
              現在、予約はありません。
              <br />
              まずは「問診に進む」から問診を入力してください。
            </>
          ) : (
            <>
              現在、予約はありません。
              <br />
              再診や再処方のご希望がある場合は、LINEのご案内からお手続きください。
            </>
          )}
        </div>
      )}
    </section>
  );
}
