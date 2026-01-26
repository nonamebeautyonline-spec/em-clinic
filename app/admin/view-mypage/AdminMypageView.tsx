"use client";

import React from "react";
import Image from "next/image";

// ------------------------- 型定義 -------------------------
type ReservationStatus = "scheduled" | "completed" | "canceled";
type ShippingStatus = "pending" | "preparing" | "shipped" | "delivered";
type PaymentStatus = "paid" | "pending" | "failed" | "refunded";
type RefundStatus = "PENDING" | "COMPLETED" | "FAILED" | "UNKNOWN";
type Carrier = "japanpost" | "yamato";

interface PatientInfo {
  id: string;
  displayName: string;
}

interface Reservation {
  id: string;
  datetime: string;
  title: string;
  status: ReservationStatus;
}

interface Order {
  id: string;
  productName: string;
  shippingStatus: ShippingStatus;
  shippingEta?: string;
  trackingNumber?: string;
  paymentStatus: PaymentStatus;
  refundStatus?: RefundStatus;
  refundedAt?: string;
  refundedAmount?: number;
  paidAt?: string;
  carrier?: Carrier;
}

interface PrescriptionHistoryItem {
  id: string;
  date: string;
  title: string;
  detail: string;
}

interface OrdersFlags {
  canPurchaseCurrentCourse: boolean;
  canApplyReorder: boolean;
  hasAnyPaidOrder: boolean;
}

interface ReorderItem {
  id: string;
  timestamp: string;
  productCode?: string;
  product_code?: string;
  productLabel: string;
  status: "pending" | "confirmed" | "canceled" | "paid";
  note?: string;
}

interface PatientDashboardData {
  patient: PatientInfo;
  nextReservation?: Reservation | null;
  activeOrders: Order[];
  orders: Order[];
  history: PrescriptionHistoryItem[];
  ordersFlags?: OrdersFlags;
  reorders?: ReorderItem[];
  hasIntake?: boolean;
}

// ------------------------- util -------------------------
const isActiveOrder = (order: Order) => {
  if (!order.trackingNumber) return true;
  if (!order.shippingEta) return true;

  const shippedAt = new Date(order.shippingEta);
  if (isNaN(shippedAt.getTime())) return true;

  const now = new Date();
  const diffDays = (now.getTime() - shippedAt.getTime()) / (1000 * 60 * 60 * 24);

  return diffDays < 10;
};

const formatDateTime = (iso: string) => {
  const start = new Date(iso);
  const end = new Date(start.getTime() + 15 * 60 * 1000);

  const date = start.toLocaleDateString("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });

  const startTime = start.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const endTime = end.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${date} ${startTime}〜${endTime}`;
};

const formatDateSafe = (v?: string) => {
  const s = (v ?? "").trim();
  if (!s) return "";

  const d = new Date(s);
  if (isNaN(d.getTime())) return "";

  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
};

const formatVisitSlotRange = (iso: string) => {
  if (!iso) return "";
  const start = new Date(iso);
  if (isNaN(start.getTime())) return "";

  const end = new Date(start.getTime() + 15 * 60 * 1000);

  const pad = (n: number) => n.toString().padStart(2, "0");

  const datePart = start.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const startH = pad(start.getHours());
  const startM = pad(start.getMinutes());
  const endH = pad(end.getHours());
  const endM = pad(end.getMinutes());

  return `${datePart} ${startH}:${startM}-${endH}:${endM}`;
};

const reservationStatusLabel = (s: ReservationStatus) => {
  switch (s) {
    case "scheduled":
      return "予約済み";
    case "completed":
      return "診察完了";
    case "canceled":
      return "キャンセル済み";
    default:
      return "";
  }
};

const shippingStatusLabel = (s: ShippingStatus) => {
  switch (s) {
    case "pending":
      return "受付済み";
    case "preparing":
      return "準備中";
    case "shipped":
      return "発送済み";
    case "delivered":
      return "配達完了";
    default:
      return "";
  }
};

const paymentStatusLabel = (s: PaymentStatus) => {
  switch (s) {
    case "paid":
      return "決済済み";
    case "pending":
      return "確認中";
    case "failed":
      return "エラー";
    case "refunded":
      return "返金済み";
    default:
      return "";
  }
};

const normalizeTrackingNumber = (trackingNumber: string) =>
  String(trackingNumber ?? "").replace(/[^\d]/g, "");

const buildTrackingUrl = (carrier: Carrier, trackingNumber: string) => {
  const tn = encodeURIComponent(normalizeTrackingNumber(trackingNumber));

  if (carrier === "japanpost") {
    return (
      "https://trackings.post.japanpost.jp/services/srv/search/direct?reqCodeNo1=" +
      tn
    );
  }

  return `https://member.kms.kuronekoyamato.co.jp/parcel/detail?pno=${tn}`;
};

const reservationStatusBadgeClass = (s: ReservationStatus) => {
  switch (s) {
    case "scheduled":
      return "bg-pink-50 text-pink-600";
    case "completed":
      return "bg-emerald-50 text-emerald-700";
    case "canceled":
      return "bg-rose-50 text-rose-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
};

const shippingStatusClass = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-rose-50 text-rose-700 border border-rose-100";
    case "preparing":
      return "bg-amber-50 text-amber-700 border border-amber-100";
    case "shipped":
      return "bg-sky-50 text-sky-700 border border-sky-100";
    case "delivered":
      return "bg-emerald-50 text-emerald-700 border border-emerald-100";
    case "on_hold":
      return "bg-slate-50 text-rose-700 border border-rose-200";
    default:
      return "bg-slate-50 text-slate-600 border border-slate-100";
  }
};

const paymentStatusClass = (status: string) => {
  switch (status) {
    case "unpaid":
      return "bg-rose-50 text-rose-700 border border-rose-100";
    case "paid":
      return "bg-emerald-50 text-emerald-700 border border-emerald-100";
    case "refunded":
      return "bg-slate-50 text-slate-600 border border-slate-200";
    case "failed":
      return "bg-red-50 text-red-700 border border-red-100";
    default:
      return "bg-slate-50 text-slate-600 border border-slate-100";
  }
};

const PRODUCT_LABELS: Record<string, string> = {
  "MJL_2.5mg_1m": "マンジャロ 2.5mg 1ヶ月 x 1",
  "MJL_2.5mg_2m": "マンジャロ 2.5mg 2ヶ月 x 1",
  "MJL_2.5mg_3m": "マンジャロ 2.5mg 3ヶ月 x 1",
  "MJL_5mg_1m":   "マンジャロ 5mg 1ヶ月 x 1",
  "MJL_5mg_2m":   "マンジャロ 5mg 2ヶ月 x 1",
  "MJL_5mg_3m":   "マンジャロ 5mg 3ヶ月 x 1",
  "MJL_7.5mg_1m": "マンジャロ 7.5mg 1ヶ月 x 1",
  "MJL_7.5mg_2m": "マンジャロ 7.5mg 2ヶ月 x 1",
  "MJL_7.5mg_3m": "マンジャロ 7.5mg 3ヶ月 x 1",
};

// ------------------------- Component -------------------------
export default function AdminMypageView({ data }: { data: PatientDashboardData }) {
  const patient = data.patient || { id: "unknown", displayName: "ゲスト" };
  const nextReservation = data.nextReservation;
  const activeOrders = data.activeOrders || [];
  const orders = data.orders || [];
  const history = data.history || [];
  const ordersFlags = data.ordersFlags;
  const hasIntake = data.hasIntake;

  // Reorders
  const reorders: ReorderItem[] = Array.isArray(data.reorders)
    ? data.reorders.map((r: any) => {
        const code = String(r.product_code ?? r.productCode ?? "").trim();
        const label = PRODUCT_LABELS[code] || code || "マンジャロ";
        return {
          id: String(r.id ?? ""),
          timestamp: String(r.timestamp ?? r.createdAt ?? ""),
          product_code: code,
          productCode: code,
          productLabel: label,
          status: (r.status ?? "pending") as ReorderItem["status"],
          note: r.note ? String(r.note) : undefined,
        };
      })
    : [];

  const getTimeSafe = (v?: string) => {
    if (!v) return 0;
    const t = new Date(v).getTime();
    return Number.isFinite(t) ? t : 0;
  };

  const visibleOrders = activeOrders
    .filter(isActiveOrder)
    .slice()
    .sort(
      (a, b) =>
        getTimeSafe(b.paidAt || b.shippingEta) - getTimeSafe(a.paidAt || a.shippingEta)
    )
    .slice(0, 5);

  const hasHistory = history.length > 0;
  const lastHistory = hasHistory ? history[0] : null;
  const isFirstVisit = !hasHistory;

  const canReserve = hasIntake === true && !hasHistory && !nextReservation;

  const orderHistoryAll = (orders ?? [])
    .slice()
    .sort((a, b) => getTimeSafe(b.paidAt) - getTimeSafe(a.paidAt));

  const orderHistoryPreview = orderHistoryAll.slice(0, 5);

  const hasPendingReorder = reorders.some((r) => r.status === "pending");
  const hasConfirmedReorder = reorders.some((r) => r.status === "confirmed");

  const latestPendingReorder = hasPendingReorder
    ? [...reorders]
        .filter((r) => r.status === "pending")
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )[0]
    : null;

  const latestConfirmedReorder = hasConfirmedReorder
    ? [...reorders]
        .filter((r) => r.status === "confirmed")
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )[0]
    : null;

  const displayReorder = latestPendingReorder ?? latestConfirmedReorder;
  const displayReorderStatus = displayReorder?.status;

  const showInitialPurchase =
    hasHistory &&
    !(ordersFlags?.hasAnyPaidOrder ?? false) &&
    !hasPendingReorder;

  const canPurchaseInitial =
    showInitialPurchase && (ordersFlags?.canPurchaseCurrentCourse ?? true);

  const topSectionTitle = nextReservation
    ? "次回のご予約"
    : hasHistory
    ? "初回診察"
    : "次回のご予約";

  return (
    <div className="min-h-screen bg-[#FFF8FB]">
      {/* ヘッダー */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/images/company-name-v2.png"
              alt="clinic logo"
              width={150}
              height={40}
              className="object-contain"
            />
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
      <div className="mx-auto max-w-4xl px-4 mt-3 space-y-2">
        {/* 問診 */}
        {hasIntake === null ? (
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
              問診はすでに完了しています
            </button>
            <p className="mt-1 text-[11px] text-slate-500">
              問診の入力は不要です。このまま予約にお進みください。
            </p>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled
              className="block w-full rounded-xl bg-pink-500 text-white text-center py-3 text-base font-semibold shadow-sm opacity-50 cursor-not-allowed"
            >
              問診に進む（管理者ビュー）
            </button>
            <p className="mt-1 text-[11px] text-slate-500">
              ※ 問診の入力が終わると、診察予約画面に進みます。
            </p>
          </>
        )}

        {/* 予約 */}
        <button
          type="button"
          disabled={!canReserve}
          className={
            "block w-full rounded-xl text-center py-3 text-base font-semibold border " +
            (!canReserve
              ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
              : "bg-white text-pink-600 border-pink-300 opacity-50 cursor-not-allowed")
          }
        >
          予約に進む（管理者ビュー）
        </button>

        {/* 初回決済ボタン（条件付き） */}
        {showInitialPurchase && (
          <button
            type="button"
            disabled
            className={
              "mt-3 block w-full rounded-xl text-center py-3 text-base font-semibold opacity-50 cursor-not-allowed " +
              (canPurchaseInitial
                ? "bg-pink-500 text-white border border-pink-500"
                : "bg-slate-100 text-slate-400 border border-slate-200")
            }
          >
            マンジャロを購入する（初回）（管理者ビュー）
          </button>
        )}
      </div>

      {/* 本文 */}
      <main className="mx-auto max-w-4xl px-4 py-4 space-y-4 md:py-6">
        {/* 初回診察／次回予約ブロック */}
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

              <div className="mt-1 text-sm text-slate-600">
                {nextReservation.title}
              </div>

              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                上記時間内に、<b>090-からはじまる電話番号</b>より携帯電話へお電話いたします。<br />
                必ずしも開始時刻ちょうどではなく、予約枠（例：12:00〜12:15）の間に医師より順次ご連絡します。<br />
                前の診療状況により、前後15分程度お時間が前後する場合があります。あらかじめご了承ください。
              </p>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled
                  className="flex-1 inline-flex items-center justify-center rounded-xl border border-pink-300 bg-white px-3 py-2 text-sm text-pink-600 opacity-50 cursor-not-allowed"
                >
                  日時を変更する（管理者ビュー）
                </button>

                <button
                  type="button"
                  disabled
                  className="flex-1 inline-flex items-center justify-center rounded-xl bg-pink-500 px-3 py-2 text-sm text-white opacity-50 cursor-not-allowed"
                >
                  予約をキャンセルする（管理者ビュー）
                </button>
              </div>

              <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">
                ※ 予約の変更・キャンセルは診察予定時刻の1時間前まで可能です。
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

        {/* 注文／申請・発送状況 */}
        <section className="bg-white rounded-3xl shadow-sm p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-800">
              注文／申請・発送状況
            </h2>
          </div>

          {/* 再処方申請カード */}
          {displayReorder && (
            <div className="mb-3 rounded-2xl border border-pink-200 bg-pink-50 px-4 py-3">
              <div className="text-xs font-semibold text-pink-700 mb-1">
                {displayReorderStatus === "pending"
                  ? "再処方申請中"
                  : "再処方申請が許可されました"}
              </div>

              <div className="text-sm font-medium text-slate-900">
                {displayReorder.productLabel}
              </div>

              {displayReorderStatus === "pending" && (
                <div className="mt-2 flex gap-2 text-[11px]">
                  <button
                    type="button"
                    disabled
                    className="px-3 py-1 rounded-full border border-slate-200 bg-white text-slate-700 opacity-50 cursor-not-allowed"
                  >
                    申請内容を変更する（管理者ビュー）
                  </button>
                  <button
                    type="button"
                    disabled
                    className="px-3 py-1 rounded-full border border-rose-200 bg-rose-50 text-rose-700 opacity-50 cursor-not-allowed"
                  >
                    申請をキャンセルする（管理者ビュー）
                  </button>
                </div>
              )}

              {displayReorderStatus === "confirmed" && (
                <div className="mt-2 flex gap-2 text-[11px]">
                  <button
                    type="button"
                    disabled
                    className="px-3 py-1 rounded-full bg-pink-500 text-white opacity-50 cursor-not-allowed"
                  >
                    再処方を決済する（管理者ビュー）
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 通常の注文・発送状況 */}
          {activeOrders.length === 0 ? (
            <div className="text-sm text-slate-600">
              現在、発送状況の確認が必要なお薬はありません。
            </div>
          ) : (
            <div className="space-y-3">
              {visibleOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl bg-white shadow-[0_4px_18px_rgba(15,23,42,0.06)] px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex-1">
                    <div className="text-[15px] font-medium text-slate-900">
                      {order.productName}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-600">発送：</span>
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 font-medium ${shippingStatusClass(
                            order.shippingStatus
                          )}`}
                        >
                          {shippingStatusLabel(order.shippingStatus)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-600">決済：</span>
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 font-medium ${paymentStatusClass(
                            order.paymentStatus
                          )}`}
                        >
                          {paymentStatusLabel(order.paymentStatus)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 text-[11px] text-slate-500 space-y-0.5">
                      {order.trackingNumber ? (
                        <p className="flex flex-wrap items-center gap-2">
                          <span>追跡番号：</span>

                          {order.carrier === "japanpost" ? (
                            <a
                              href={buildTrackingUrl("japanpost", order.trackingNumber)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-pink-600 underline"
                            >
                              {order.trackingNumber}
                            </a>
                          ) : (
                            <span className="text-pink-600">
                              {order.trackingNumber}
                            </span>
                          )}

                          <span className="text-[10px] text-slate-400">
                            （{order.carrier === "japanpost" ? "日本郵便" : "ヤマト"}）
                          </span>
                        </p>
                      ) : order.shippingEta ? (
                        <p>発送予定日：{formatDateSafe(order.shippingEta)} まで</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 md:mt-0 flex w-full md:w-auto gap-2 md:flex-col md:items-end">
                    {order.trackingNumber && (
                      <button
                        type="button"
                        disabled
                        className="w-full md:w-[160px] h-11 inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white text-[13px] font-medium text-slate-700 opacity-50 cursor-not-allowed"
                      >
                        配送状況を確認（管理者ビュー）
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 再処方申請ボタン */}
          {ordersFlags?.hasAnyPaidOrder && (
            <div className="mt-4">
              <button
                type="button"
                disabled
                className={
                  "w-full rounded-xl text-center py-3 text-base font-semibold border opacity-50 cursor-not-allowed " +
                  (ordersFlags?.canApplyReorder
                    ? "bg-white text-pink-600 border-pink-300"
                    : "bg-slate-100 text-slate-400 border-slate-200")
                }
              >
                再処方を申請する（管理者ビュー）
              </button>

              <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">
                ① 再処方内容を医師に申請します。<br />
                ② 医師が内容を確認し、問題なければ処方となります。
                <br />
                （平日10〜19時は申請後1時間以内、祝休日は当日中に反映されます）<br />
                ③ マイページを更新すると、再処方の情報が反映されます。
              </p>
            </div>
          )}
        </section>

        {/* 処方歴 */}
        <section className="bg-white rounded-3xl shadow-sm p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-800">
              これまでの処方歴
            </h2>
          </div>

          {orderHistoryPreview.length === 0 ? (
            <div className="text-sm text-slate-600">
              まだ処方の履歴はありません。
            </div>
          ) : (
            <div className="space-y-3">
              {orderHistoryPreview.map((o) => {
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
                        {o.productName}
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
        </section>

        {/* サポート */}
        <section className="bg-white rounded-3xl shadow-sm p-4 md:p-5 mb-4">
          <h2 className="text-sm font-semibold text-slate-800 mb-2">
            お困りの方へ
          </h2>

          <p className="text-sm text-slate-600 mb-3">
            予約やお薬、体調についてご不安な点があれば、LINEからいつでもご相談いただけます。
          </p>

          <button
            type="button"
            disabled
            className="inline-flex items-center justify-center rounded-xl bg-pink-500 px-4 py-2 text-sm font-medium text-white opacity-50 cursor-not-allowed"
          >
            LINEで問い合わせる（管理者ビュー）
          </button>

          <p className="mt-2 text-[11px] text-slate-500">
            ※ 診察中・夜間など、返信までお時間をいただく場合があります。
          </p>
        </section>
      </main>
    </div>
  );
}
