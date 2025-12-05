"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

// ------------------------- 型定義 -------------------------
type ReservationStatus = "scheduled" | "completed" | "canceled";
type ShippingStatus = "pending" | "preparing" | "shipped" | "delivered";
type PaymentStatus = "paid" | "pending" | "failed";

interface PatientInfo {
  id: string;          // Patient ID
  displayName: string; // 氏名
}

interface Reservation {
  id: string;
  datetime: string;    // ISO string
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

interface QueryPatientParams {
  customer_id?: string | null;
  name?: string | null;
  kana?: string | null;
  sex?: string | null;
  birth?: string | null;
  phone?: string | null;
}

// ------------------------- util -------------------------
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

// ------------------------- 本体 -------------------------
export default function PatientDashboardInner() {
  const query = useQueryPatientParams();
  const router = useRouter();

  const [data, setData] = useState<PatientDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showCancelSuccess, setShowCancelSuccess] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [hasIntake, setHasIntake] = useState(false); // 問診済みフラグ

  useEffect(() => {
    const init = async () => {
      setLoading(true);

      let finalData: PatientDashboardData = {
        patient: { id: "unknown", displayName: "ゲスト" },
        nextReservation: null,
        activeOrders: [],
        history: [],
      };

      try {
        // ① localStorage
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

        // ② /api/mypage/profile
        let profile: { patientId: string; name: string } | null = null;
        try {
          const profileRes = await fetch("/api/mypage/profile");

          if (profileRes.status === 401) {
            setLoading(false);
            router.push("/mypage/init");
            return;
          }

          if (profileRes.ok) {
            const p = await profileRes.json();
            profile = { patientId: p.patientId, name: p.name };
          }
        } catch (e) {
          console.warn("profile fetch error:", e);
        }

        // ③ 患者情報
        const patient: PatientInfo = {
          id:
            profile?.patientId ||
            query.customer_id ||
            storedBasic.customer_id ||
            "unknown",
          displayName:
            profile?.name || query.name || storedBasic.name || "ゲスト",
        };

        // ④ localStorage予約
        let nextReservation: Reservation | null = null;
        if (
          storedReservation &&
          storedReservation.date &&
          storedReservation.start
        ) {
          const iso = `${storedReservation.date}T${storedReservation.start}:00+09:00`;
          nextReservation = {
            id:
              storedReservation.reserveId ||
              `local-${storedReservation.date}-${storedReservation.start}`,
            datetime: iso,
            title: storedReservation.title || "オンライン診察予約",
            status: "scheduled",
          };
        }

        finalData = {
          patient,
          nextReservation,
          activeOrders: [],
          history: [],
        };

        // ⑤ /api/mypage
        try {
          const res = await fetch("/api/mypage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customer_id: patient.id,
              name: patient.displayName,
            }),
          });

          if (res.ok) {
            const api = (await res.json()) as Partial<PatientDashboardData> & {
              patient?: PatientInfo;
            };

            finalData = {
              patient: {
                id: api.patient?.id || patient.id,
                displayName:
                  api.patient?.displayName || patient.displayName,
              },
              nextReservation: api.nextReservation ?? nextReservation,
              activeOrders: api.activeOrders ?? [],
              history: api.history ?? [],
            };
          } else {
            console.error("api/mypage response not ok:", res.status);
          }
        } catch (err) {
          console.error("api/mypage fetch error:", err);
        }

        setData(finalData);
        setError(null);

        // ★ 問診完了フラグ更新
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            "patient_basic",
            JSON.stringify({
              customer_id:
                profile?.patientId ??
                query.customer_id ??
                storedBasic.customer_id ??
                finalData.patient.id ??
                "",
              name:
                profile?.name ??
                query.name ??
                storedBasic.name ??
                finalData.patient.displayName ??
                "",
              kana: storedBasic.kana ?? "",
              sex: storedBasic.sex ?? "",
              birth: storedBasic.birth ?? "",
              phone: storedBasic.phone ?? "",
            })
          );

          const localHasIntake =
            window.localStorage.getItem("has_intake") === "1";

          setHasIntake(
            localHasIntake ||
              (finalData.history && finalData.history.length > 0)
          );
        }
      } catch (e) {
        console.error(e);
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

  // ▼ 日時変更
  const handleChangeReservation = () => {
    if (!data?.nextReservation) return;

    const d = new Date(data.nextReservation.datetime);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");

    const prevDate = `${yyyy}-${mm}-${dd}`;
    const prevTime = `${hh}:${mi}`;

    const params = new URLSearchParams();
    params.set("edit", "1");
    params.set("reserveId", data.nextReservation.id);
    params.set("customer_id", data.patient.id);
    params.set("name", data.patient.displayName);
    params.set("prevDate", prevDate);
    params.set("prevTime", prevTime);

    router.push(`/reserve?${params.toString()}`);
  };

  // ▼ 予約キャンセル
  const handleCancelReservationConfirm = async () => {
    if (!data?.nextReservation) return;
    if (canceling) return;

    setCanceling(true);

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "cancelReservation",
          reserveId: data.nextReservation.id,
        }),
      });

      const result = await res.json().catch(() => ({} as any));

      if (!res.ok || result.ok === false) {
        alert("キャンセルに失敗しました。時間をおいて再度お試しください。");
        return;
      }

      setData((prev) =>
        prev
          ? {
              ...prev,
              nextReservation: null,
            }
          : prev
      );

      if (typeof window !== "undefined") {
        window.localStorage.removeItem("last_reservation");
      }

      setShowCancelConfirm(false);
      setShowCancelSuccess(true);

      setTimeout(() => {
        setShowCancelSuccess(false);
      }, 1200);
    } catch (e) {
      console.error(e);
      alert("キャンセルに失敗しました。時間をおいて再度お試しください。");
    } finally {
      setCanceling(false);
    }
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
          {error ??
            "データが取得できませんでした。時間をおいて再度お試しください。"}
        </div>
      </div>
    );
  }

  const { patient, nextReservation, activeOrders, history } = data;
  const isFirstVisit = history.length === 0;

  return (
    <div className="min-h-screen bg-[#FFF8FB]">
      {/* ▼ キャンセル成功モーション */}
      {showCancelSuccess && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35">
          <div className="bg-white px-6 py-4 rounded-2xl shadow-lg text-pink-600 text-base font-semibold">
            ✓ 予約をキャンセルしました
          </div>
        </div>
      )}

      {/* ▼ キャンセル確認モーダル */}
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
                    ? "bg-pink-300 cursor-not-allowed"
                    : "bg-pink-500 active:scale-[0.98]")
                }
              >
                {canceling ? "処理中…" : "キャンセルする"}
              </button>
            </div>
          </div>
        </div>
      )}

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
            <div className="text右">
              <div className="text-sm font-semibold text-slate-800">
                {patient.displayName} さん
              </div>
              <div className="text-[11px] text-slate-500">
                Patient ID: {patient.id}
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-200" />
          </button>
        </div>
      </header>

      {/* ▼ 上部の CTA：問診 → 予約 */}
      {!nextReservation && (
        <div className="mx-auto max-w-4xl px-4 mt-3 space-y-2">
          {/* ①問診に進む */}
          <Link
            href="/intake"
            className="block w-full rounded-xl bg-pink-500 text-white text-center py-3 text-base font-semibold shadow-sm hover:bg-pink-600 transition"
          >
            問診に進む
          </Link>
          <p className="mt-1 text-[11px] text-slate-500">
            ※ 問診の入力が終わると、診察予約画面に進みます。
          </p>

          {/* ②予約に進む（問診が終わるまでグレーアウト） */}
          <button
            type="button"
            disabled={!hasIntake}
            onClick={() => {
              if (!hasIntake) return;
              router.push("/reserve");
            }}
            className={
              "block w-full rounded-xl text-center py-3 text-base font-semibold border " +
              (hasIntake
                ? "bg-white text-pink-600 border-pink-300 hover:bg-pink-50 transition"
                : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed")
            }
          >
            予約に進む
          </button>
          {!hasIntake && (
            <p className="text-[11px] text-slate-500">
              ※ 先に「問診に進む」から問診を入力してください。
            </p>
          )}
        </div>
      )}

      {/* 本文 */}
      <main className="mx-auto max-w-4xl px-4 py-4 space-y-4 md:py-6">
        {/* 次回予約 */}
        <section className="bg-white rounded-3xl shadow-sm p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-800">次回のご予約</h2>
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
                  onClick={() => setShowCancelConfirm(true)}
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

        {/* 注文・発送状況 */}
        <section className="bg白 rounded-3xl shadow-sm p-4 md:p-5">
          <div className="flex items馬 justify-between mb-3">
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
                  className="rounded-2xl bg白 shadow-[0_4px_18px_rgba(15,23,42,0.06)] px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
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
                      {order.shippingEta && (
                        <p>発送予定日：{formatDate(order.shippingEta)} まで</p>
                      )}
                      {order.trackingNumber && (
                        <p>追跡番号：{order.trackingNumber}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 md:mt-0 flex w-full md:w-auto gap-2 md:flex-col md:items-end">
                    {order.trackingNumber && (
                      <button
                        type="button"
                        onClick={() => handleOpenTracking(order.trackingNumber)}
                        className="w-full md:w-[160px] h-11 inline-flex items-center justify-center rounded-2xl border border-slate-200 bg白 text-[13px] font-medium text-slate-700 active:scale-[0.98]"
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

        {/* 診察・処方履歴 */}
        <section className="bg白 rounded-3xl shadow-sm p-4 md:p-5">
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
                    <div className="text-[11px] text-slate-500">
                      {formatDate(item.date)}
                    </div>
                    <div className="text-sm font-medium text-slate-900">
                      {item.detail}
                      {item.title.includes("再処方") && "（再処方）"}
                      {item.title.includes("初回") && "（初回）"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* サポート */}
        <section className="bg白 rounded-3xl shadow-sm p-4 md:p-5 mb-4">
          <h2 className="text-sm font-semibold text-slate-800 mb-2">
            お困りの方へ
          </h2>
          <p className="text-sm text-slate-600 mb-3">
            予約やお薬、体調についてご不安な点があれば、LINEからいつでもご相談いただけます。
          </p>
          <button
            type="button"
            onClick={handleContactSupport}
            className="inline-flex items-center justify-center rounded-xl bg-pink-500 px-4 py-2 text-sm font-medium text白 hover:bg-pink-600 transition"
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
