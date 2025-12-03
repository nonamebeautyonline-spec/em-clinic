"use client";

import React, { useEffect, useState, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type ReservationStatus = "scheduled" | "completed" | "canceled";
type ShippingStatus = "pending" | "preparing" | "shipped" | "delivered";
type PaymentStatus = "paid" | "pending" | "failed";

interface PatientInfo {
  id: string;
  displayName: string;
}

interface Reservation {
  id: string;
  datetime: string; // ISO string
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
}

interface PrescriptionHistoryItem {
  id: string;
  date: string;
  title: string;
  detail: string;
}

interface PatientDashboardData {
  patient: PatientInfo;
  nextReservation?: Reservation | null;
  activeOrders: Order[];
  history: PrescriptionHistoryItem[];
}

// Lステからクエリで渡ってくる項目
interface QueryPatientParams {
  customer_id?: string | null;
  name?: string | null;
  kana?: string | null;
  sex?: string | null;
  birth?: string | null;
  phone?: string | null;
}

const useQueryPatientParams = (): QueryPatientParams => {
  const sp = useSearchParams();
  return {
    customer_id: sp.get("customer_id"),
    name: sp.get("name"),
    kana: sp.get("kana"),
    sex: sp.get("sex"),
    birth: sp.get("birth"),
    phone: sp.get("phone"),
  };
};

// 仮のダミーデータ（APIができるまでの間用）
const fetchDashboardDataMock = async (): Promise<PatientDashboardData> => {
  return {
    patient: {
      id: "P-20251130-001",
      displayName: "山田 花子",
    },
    nextReservation: {
      id: "R-001",
      datetime: "2025-12-03T21:00:00+09:00",
      title: "GLP-1/GIP減量外来（再診）",
      status: "scheduled",
    },
    activeOrders: [
      {
        id: "O-001",
        productName: "マンジャロ 2.5mg 3ヶ月分",
        shippingStatus: "preparing",
        shippingEta: "2025-12-05",
        trackingNumber: "",
        paymentStatus: "paid",
      },
      {
        id: "O-002",
        productName: "マンジャロ 5mg 1ヶ月分",
        shippingStatus: "shipped",
        shippingEta: "2025-12-02",
        trackingNumber: "1234-5678-9999",
        paymentStatus: "paid",
      },
    ],
    history: [
      {
        id: "H-003",
        date: "2025-11-20",
        title: "再処方",
        detail: "マンジャロ 2.5mg 3ヶ月分",
      },
      {
        id: "H-002",
        date: "2025-10-10",
        title: "再処方",
        detail: "マンジャロ 2.5mg 2ヶ月分",
      },
      {
        id: "H-001",
        date: "2025-09-05",
        title: "初回処方",
        detail: "マンジャロ 2.5mg 1ヶ月分",
      },
    ],
  };
};

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  const date = d.toLocaleDateString("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });
  const time = d.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} ${time}`;
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
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
    default:
      return "";
  }
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

function PatientDashboardInner() {
  const query = useQueryPatientParams();

  const [data, setData] = useState<PatientDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const init = async () => {
    try {
      const mock = await fetchDashboardDataMock();

      // ① localStorage から patient_basic と last_reservation を読む
      let storedBasic: any = {};
      let storedReservation: any = null;

      if (typeof window !== "undefined") {
        const rawBasic = window.localStorage.getItem("patient_basic");
        if (rawBasic) {
          try {
            storedBasic = JSON.parse(rawBasic);
          } catch {
            storedBasic = {};
          }
        }

        const rawResv = window.localStorage.getItem("last_reservation");
        if (rawResv) {
          try {
            storedReservation = JSON.parse(rawResv);
          } catch {
            storedReservation = null;
          }
        }
      }

      // ② 患者情報：クエリ > localStorage > mock の順で優先
      const patient: PatientInfo = {
        id: query.customer_id || storedBasic.customer_id || mock.patient.id,
        displayName: query.name || storedBasic.name || mock.patient.displayName,
      };

      // ③ 予約情報：localStorage にあれば nextReservation を作る
      let nextReservation: Reservation | null = null;
      if (
        storedReservation &&
        storedReservation.date &&
        storedReservation.start
      ) {
        const iso = `${storedReservation.date}T${storedReservation.start}:00+09:00`;
        nextReservation = {
          id: `local-${storedReservation.date}-${storedReservation.start}`,
          datetime: iso,
          title: storedReservation.title || "オンライン診察予約",
          status: "scheduled",
        };
      }

      const merged: PatientDashboardData = {
        ...mock,
        patient,
        nextReservation, // ← ここに今作ったものを入れる
        activeOrders: [],
        history: [],
      };

      setData(merged);
      setError(null);

      // ④ patient_basic は最新情報で上書き保存
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          "patient_basic",
          JSON.stringify({
            customer_id:
              query.customer_id ?? storedBasic.customer_id ?? patient.id ?? "",
            name:
              query.name ??
              storedBasic.name ??
              patient.displayName ??
              "",
            kana: storedBasic.kana ?? "",
            sex: storedBasic.sex ?? "",
            birth: storedBasic.birth ?? "",
            phone: storedBasic.phone ?? "",
          })
        );
      }
    } catch (e) {
      setError("データの取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  init();
}, [
  query.customer_id,
  query.name,
  query.kana,
  query.sex,
  query.birth,
  query.phone,
]);


  const handleChangeReservation = () => {
    alert("予約変更フローをあとで実装します。");
  };

  const handleCancelReservation = () => {
    alert("予約キャンセルフローをあとで実装します。");
  };

  const handleReorder = (historyItem: PrescriptionHistoryItem) => {
    alert(`「${historyItem.detail}」の再注文フローをあとで実装します。`);
  };

  const handleOpenTracking = (trackingNumber: string | undefined) => {
    if (!trackingNumber) return;
    alert(`追跡番号: ${trackingNumber}`);
  };

  const handleContactSupport = () => {
    alert("LINE公式アカウントをあとで紐づけます。");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500 text-sm">読み込み中です…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow px-6 py-4 text-sm text-rose-600">
          {error ?? "データが取得できませんでした。時間をおいて再度お試しください。"}
        </div>
      </div>
    );
  }

  const { patient, nextReservation, activeOrders, history } = data;
  const isFirstVisit = history.length === 0;

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
              <div className="text-[11px] text-slate-500">ID: {patient.id}</div>
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-200" />
          </button>
        </div>
      </header>

      {/* ▼ 上部の「予約する」ボタン（初診のみ表示） */}
      {isFirstVisit && !nextReservation && (
        <div className="mx-auto max-w-4xl px-4 mt-3">
          <Link
            href="/reserve"
            className="block w-full rounded-xl bg-pink-500 text-white text-center py-3 text-base font-semibold shadow-sm hover:bg-pink-600 transition"
          >
            初回診察の予約をする
          </Link>
          <p className="mt-1 text-[11px] text-slate-500">
            ※
            すでに一度でも診察を受けたことがある方は、マイページから新規予約はできません。
            再処方をご希望の方はLINEのご案内からお進みください。
          </p>
        </div>
      )}

      {/* 本文 */}
      <main className="mx-auto max-w-4xl px-4 py-4 space-y-4 md:py-6">
        {/* 次回予約 */}
        <section className="bg-white rounded-3xl shadow-sm p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-800">
              次回のご予約
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

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  className="flex-1 inline-flex items-center justify-center rounded-xl border border-pink-300 bg-white px-3 py-2 text-sm text-pink-600 hover:bg-pink-50 transition"
                >
                  予約の詳細を見る
                </button>

                <button
                  type="button"
                  onClick={handleChangeReservation}
                  className="flex-1 inline-flex items-center justify-center rounded-xl border border-pink-300 bg-white px-3 py-2 text-sm text-pink-600 hover:bg-pink-50 transition"
                >
                  日時を変更する
                </button>

                <button
                  type="button"
                  onClick={handleCancelReservation}
                  className="flex-1 inline-flex items-center justify-center rounded-xl bg-pink-500 px-3 py-2 text-sm text-white hover:bg-pink-600 transition"
                >
                  予約をキャンセルする
                </button>
              </div>
              <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">
                ※ 予約の変更・キャンセルは診察予定時刻の〇時間前まで可能です。
                <br />
                ※ それ以降のキャンセルはキャンセル料が発生する場合があります。
              </p>
            </>
          ) : (
            <div className="text-sm text-slate-600">
              {isFirstVisit ? (
                <>
                  現在、予約はありません。
                  <br />
                  画面上部の「初回診察の予約をする」ボタンから、初診のご予約が可能です。
                </>
              ) : (
                <>
                  現在、予約はありません。
                  <br />
                  再処方をご希望の方は、LINEのご案内からお手続きください。
                </>
              )}
            </div>
          )}
        </section>

        {/* 注文・発送状況 */}
        <section className="bg-white rounded-3xl shadow-sm p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-800">
              注文・発送状況
            </h2>
          </div>

          {activeOrders.length === 0 ? (
            <div className="text-sm text-slate-600">
              処方済みのお薬は現在ありません。
            </div>
          ) : (
            <div className="space-y-3">
              {activeOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl bg-white shadow-[0_4px_18px_rgba(15,23,42,0.06)] px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex-1">
                    {/* 商品名 */}
                    <div className="text-[15px] font-medium text-slate-900">
                      {order.productName}
                    </div>

                    {/* 発送・決済ステータス */}
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                      {/* 発送ステータス */}
                      <div className="flex items-center gap-1">
                        <span className="text-slate-600">発送：</span>
                        <span
                          className={`
                          inline-flex items-center rounded-full px-3 py-1
                          font-medium
                          ${shippingStatusClass(order.shippingStatus)}
                        `}
                        >
                          {shippingStatusLabel(order.shippingStatus)}
                        </span>
                      </div>

                      {/* 決済ステータス */}
                      <div className="flex items-center gap-1">
                        <span className="text-slate-600">決済：</span>
                        <span
                          className={`
                          inline-flex items-center rounded-full px-3 py-1
                          font-medium
                          ${paymentStatusClass(order.paymentStatus)}
                        `}
                        >
                          {paymentStatusLabel(order.paymentStatus)}
                        </span>
                      </div>
                    </div>

                    {/* 発送予定日・追跡番号 */}
                    <div className="mt-2 text-[11px] text-slate-500 space-y-0.5">
                      {order.shippingEta && (
                        <p>発送予定日：{formatDate(order.shippingEta)} まで</p>
                      )}
                      {order.trackingNumber && (
                        <p>追跡番号：{order.trackingNumber}</p>
                      )}
                    </div>
                  </div>

                  {/* ボタンエリア */}
                  <div className="mt-3 md:mt-0 flex w-full md:w-auto gap-2 md:flex-col md:items-end">
                    {order.trackingNumber && (
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenTracking(order.trackingNumber)
                        }
                        className="
                          w-full md:w-[160px] h-11
                          inline-flex items-center justify-center
                          rounded-2xl border border-slate-200 bg-white
                          text-[13px] font-medium text-slate-700
                          active:scale-[0.98]
                        "
                      >
                        配送状況を確認
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 処方・診察履歴 ＋ 再注文 */}
        <section className="bg-white rounded-3xl shadow-sm p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-800">
              これまでの診察・お薬
            </h2>
            {history.length > 0 && (
              <button
                type="button"
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                すべて表示
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="text-sm text-slate-600">
              まだ診察・処方の履歴はありません。
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 border border-slate-100 rounded-xl px-3 py-3"
                >
                  <div>
                    {/* 日付 */}
                    <div className="text-[11px] text-slate-500">
                      {formatDate(item.date)}
                    </div>

                    {/* タイトル＋詳細 */}
                    <div className="text-sm font-medium text-slate-900">
                      {item.detail}
                      {item.title.includes("再処方") && "（再処方）"}
                      {item.title.includes("初回") && "（初回）"}
                    </div>
                  </div>

                  {/* 再注文ボタン（今は未使用なのでコメントアウト）
                  <button
                    type="button"
                    onClick={() => handleReorder(item)}
                    className="text-[11px] text-pink-500 hover:underline"
                  >
                    同じ内容で再注文
                  </button>
                  */}
                </div>
              ))}
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
            onClick={handleContactSupport}
            className="inline-flex items-center justify-center rounded-xl bg-pink-500 px-4 py-2 text-sm font-medium text-white hover:bg-pink-600 transition"
          >
            LINEで問い合わせる
          </button>
          <p className="mt-2 text-[11px] text-slate-500">
            ※ 診察中・夜間など、返信までお時間をいただく場合があります。
          </p>
        </section>
      </main>
    </div>
  );
}

// Suspense でラップした外側コンポーネント（useSearchParamsは内側だけ）
export default function MyPagePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <p className="text-sm text-slate-500">読み込み中です…</p>
        </div>
      }
    >
      <PatientDashboardInner />
    </Suspense>
  );
}
