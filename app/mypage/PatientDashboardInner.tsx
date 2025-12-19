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
  id: string; // Patient ID
  displayName: string; // 氏名
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
  date: string; // ISO string
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
  timestamp: string; // ISO or "yyyy/MM/dd HH:mm:ss"

  // 互換（GASはsnake_case、フロントはcamelCaseが混在し得る）
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
  history: PrescriptionHistoryItem[];
  ordersFlags?: OrdersFlags;
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
const isActiveOrder = (order: Order) => {
  // 追跡番号がない＝未発送（常にアクティブ表示）
  if (!order.trackingNumber) return true;

  // shippingEta（発送日）が無い場合も一旦アクティブ扱い
  if (!order.shippingEta) return true;

  const shippedAt = new Date(order.shippingEta);
  if (isNaN(shippedAt.getTime())) return true;

  const now = new Date();
  const diffDays = (now.getTime() - shippedAt.getTime()) / (1000 * 60 * 60 * 24);

  // 10日未満ならアクティブ（10日以上はアーカイブ扱い）
  return diffDays < 10;
};


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
  const start = new Date(iso);
  const end = new Date(start.getTime() + 15 * 60 * 1000); // 15分後

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

  // 例）"12/11(木) 15:00〜15:15"
  return `${date} ${startTime}〜${endTime}`;
};


const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
};

// Dr UI 診察済み表示用：YYYY/MM/DD HH:MM-HH:MM
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

// 再処方や処方歴などで使う ProductCode → 表示名マップ
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
export default function PatientDashboardInner() {
  const router = useRouter();

  const [data, setData] = useState<PatientDashboardData | null>(null);
  const [reorders, setReorders] = useState<ReorderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showCancelSuccess, setShowCancelSuccess] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [hasIntake, setHasIntake] = useState(false);

  const [showReorderCancelConfirm, setShowReorderCancelConfirm] = useState(false);
const [cancelingReorder, setCancelingReorder] = useState(false);
const [showReorderCancelSuccess, setShowReorderCancelSuccess] = useState(false);

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
        // ① localStorage の読み込み
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



        // ③ Patient 情報
const patient: PatientInfo = {
  id: "unknown",
  displayName: "ゲスト",
};



        // ④ localStorage の予約情報（診察前だけ）
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

// ⑤ /api/mypage を1本だけ叩く
const mpRes = await fetch("/api/mypage", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  cache: "no-store",
  body: JSON.stringify({}),
});

// ★ ここを追加：未連携なら init へ
if (mpRes.status === 401) {
  setLoading(false);
  router.push("/mypage/init");
  return;
}

// ⑥ /api/mypage（診察情報・履歴・注文・flags・reorders）
if (mpRes.ok) {
  const api = (await mpRes.json()) as {
    ok: boolean;
    patient?: PatientInfo;
    nextReservation?: Reservation | null;
    activeOrders?: Order[];
    history?: PrescriptionHistoryItem[];
    ordersFlags?: OrdersFlags;
    reorders?: any[];
  };

  finalData = {
    patient: {
      id: api.patient?.id || patient.id,
      displayName: api.patient?.displayName || patient.displayName,
    },
    nextReservation:
      typeof api.nextReservation !== "undefined"
        ? api.nextReservation
        : nextReservation,
    activeOrders: api.activeOrders ?? [],
    history: api.history ?? [],
    ordersFlags: api.ordersFlags,
  };

  // 診察履歴が1件でもあれば「次回予約」は消す
  if (finalData.history && finalData.history.length > 0) {
    finalData.nextReservation = null;
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("last_reservation");
    }
  }

  // ★ 再処方申請のローカル state 更新（元々 reRes.ok ブロックでやっていた処理）
if (Array.isArray(api.reorders)) {
  const mapped: ReorderItem[] = api.reorders.map((r: any) => {
    const code = String(r.product_code ?? r.productCode ?? "").trim();
    const label = PRODUCT_LABELS[code] || code || "マンジャロ";
    return {
      id: String(r.id ?? ""),
      timestamp: String(r.timestamp ?? ""),

      product_code: code,
      productCode: code,

      productLabel: label,
      status: (r.status ?? "pending") as ReorderItem["status"],
      note: r.note ? String(r.note) : undefined,
    };
  });
  setReorders(mapped);
}

} else {
  console.error("api/mypage response not ok:", mpRes.status);
}


        // 最終的なデータを反映
        setData(finalData);
        setError(null);

        // ⑨ 問診済みフラグ
        if (typeof window !== "undefined") {
window.localStorage.setItem(
  "patient_basic",
  JSON.stringify({ customer_id: finalData.patient.id ?? "" })
);


          const localHasIntake =
            window.localStorage.getItem("has_intake") === "1";
          const historyHasIntake =
            finalData.history && finalData.history.length > 0;

          if (historyHasIntake) {
            window.localStorage.setItem("has_intake", "1");
          }

          setHasIntake(localHasIntake || historyHasIntake);
        }
      } catch (e) {
        console.error(e);
        setError("データの取得に失敗しました。");
      } finally {
        setLoading(false);
      }
    };

    init();
}, [router]);




  // ▼ 日時変更
  const handleChangeReservation = () => {
    if (!data?.nextReservation) return;

    const d = new Date(data.nextReservation.datetime);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).toString().padStart(2, "0");

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

  const url =
    "https://trackings.post.japanpost.jp/services/srv/search/direct?reqCodeNo1=" +
    encodeURIComponent(trackingNumber);

  window.open(url, "_blank", "noopener,noreferrer");
};


  const handleContactSupport = () => {
    alert("LINE公式アカウントをあとで紐づけます。");
  };

  const handleReorderChange = () => {
    // 申請内容変更 → 再処方モードの商品一覧へ
    router.push("/mypage/purchase?flow=reorder");
  };

const handleReorderCancel = async () => {
  try {
    setCancelingReorder(true);

    const res = await fetch("/api/reorder/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const json = await res.json().catch(() => ({} as any));

    if (!res.ok || json.ok === false) {
      alert("申請のキャンセルに失敗しました。時間をおいて再度お試しください。");
      return;
    }

    // pending をローカル状態から消す
    setReorders((prev) =>
      prev.map((r) =>
        r.status === "pending" ? { ...r, status: "canceled" } : r
      )
    );

    setShowReorderCancelConfirm(false);
    setShowReorderCancelSuccess(true);
    setTimeout(() => setShowReorderCancelSuccess(false), 1200);
  } catch (e) {
    console.error(e);
    alert("申請のキャンセルに失敗しました。時間をおいて再度お試しください。");
  } finally {
    setCancelingReorder(false);
  }
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

  const { patient, nextReservation, activeOrders, history, ordersFlags } = data;

  // 注文：アクティブ分だけ表示（未発送 or 発送から10日未満）
  const visibleOrders = activeOrders.filter(isActiveOrder);

  // 参考：アーカイブ側（必要なら後で「過去の配送」タブを作れる）
  const archivedOrders = activeOrders.filter((o) => !isActiveOrder(o));


  const hasHistory = history.length > 0;
  const lastHistory = hasHistory ? history[0] : null;
  const isFirstVisit = !hasHistory;
    // 予約ボタンの有効条件：
  //  - 問診済み
  //  - 診察履歴がまだない（初回診察前）
  //  - すでに予約が入っていない
  const canReserve =
    hasIntake && !hasHistory && !nextReservation;

  const orderHistory = history.filter((item) => item.title === "処方");

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

  // 表示に使う1件：
  // 1. pending があれば pending を優先
  // 2. なければ confirmed を表示
  const displayReorder = latestPendingReorder ?? latestConfirmedReorder;
  const displayReorderStatus = displayReorder?.status; // "pending" | "confirmed" | undefined


  // 初回購入ボタン（診察済み・まだ決済0回・申請も無しのときだけ）
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
    {/* 予約キャンセル完了トースト */}
    {showCancelSuccess && (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35">
        <div className="bg-white px-6 py-4 rounded-2xl shadow-lg text-pink-600 text-base font-semibold">
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

    {/* 再処方キャンセル完了トースト */}
    {showReorderCancelSuccess && (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35">
        <div className="bg-white px-6 py-4 rounded-2xl shadow-lg text-pink-600 text-base font-semibold">
          ✓ 再処方申請をキャンセルしました
        </div>
      </div>
    )}

    {/* 再処方キャンセル確認モーダル */}
    {showReorderCancelConfirm && latestPendingReorder && (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35">
        <div className="bg-white rounded-2xl shadow-lg p-5 w-[90%] max-w-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">
            この再処方申請をキャンセルしますか？
          </h3>
          <p className="text-[13px] text-slate-600 mb-4">
            {latestPendingReorder.productLabel}
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
                  ? "bg-pink-300 cursor-not-allowed"
                  : "bg-pink-500 active:scale-[0.98]")
              }
            >
              {cancelingReorder ? "処理中…" : "キャンセルする"}
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
        {hasIntake ? (
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
            <Link
              href="/intake"
              className="block w-full rounded-xl bg-pink-500 text-white text-center py-3 text-base font-semibold shadow-sm hover:bg-pink-600 transition"
            >
              問診に進む
            </Link>
            <p className="mt-1 text-[11px] text-slate-500">
              ※ 問診の入力が終わると、診察予約画面に進みます。
            </p>
          </>
        )}

{/* 予約（診察前だけ & 1件も予約が入っていないときだけ有効） */}
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
      : "bg-white text-pink-600 border-pink-300 hover:bg-pink-50 transition")
  }
>
  予約に進む
</button>


        {/* 初回決済ボタン（条件付き） */}
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
                ? "bg-pink-500 text-white border border-pink-500 hover:bg-pink-600 transition"
                : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed")
            }
          >
            マンジャロを購入する（初回）
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
    {/* 予約日時（15分レンジ表示） */}
    <div className="text-[15px] font-semibold text-slate-900">
      {formatDateTime(nextReservation.datetime)}
    </div>

    {/* タイトル（オンライン診察予約） */}
    <div className="mt-1 text-sm text-slate-600">
      {nextReservation.title}
    </div>

    {/* ★ 電話案内文言 */}
<p className="mt-2 text-xs text-slate-600 leading-relaxed">
  上記時間内に、<b>090-からはじまる電話番号</b>より携帯電話へお電話いたします。<br />
  必ずしも開始時刻ちょうどではなく、予約枠（例：12:00〜12:15）の間に医師より順次ご連絡します。<br />
  前の診療状況により、前後15分程度お時間が前後する場合があります。あらかじめご了承ください。
</p>


    {/* ボタン群：詳細ボタンは削除 */}
    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
      {/* 日時変更ボタン */}
      <button
        type="button"
        onClick={handleChangeReservation}
        className="flex-1 inline-flex items-center justify-center rounded-xl border border-pink-300 bg-white px-3 py-2 text-sm text-pink-600 hover:bg-pink-50 transition"
      >
        日時を変更する
      </button>

      {/* キャンセルボタン */}
      <button
        type="button"
        onClick={() => setShowCancelConfirm(true)}
        className="flex-1 inline-flex items-center justify-center rounded-xl bg-pink-500 px-3 py-2 text-sm text-white hover:bg-pink-600 transition"
      >
        予約をキャンセルする
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

          {/* 再処方申請カード（pending or confirmed を表示） */}
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

              {/* ステータス別のボタン表示 */}
              {displayReorderStatus === "pending" && (
                <div className="mt-2 flex gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={handleReorderChange}
                    className="px-3 py-1 rounded-full border border-slate-200 bg-white text-slate-700"
                  >
                    申請内容を変更する
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReorderCancelConfirm(true)}
                    className="px-3 py-1 rounded-full border border-rose-200 bg-rose-50 text-rose-700"
                  >
                    申請をキャンセルする
                  </button>
                </div>
              )}

{displayReorderStatus === "confirmed" && displayReorder && (
  <div className="mt-2 flex gap-2 text-[11px]">
    <button
      type="button"
onClick={() => {
const raw = String((displayReorder.product_code ?? displayReorder.productCode ?? "")).trim();
  if (!raw) {
    alert("再処方の決済情報（product_code）が見つかりません。管理者にお問い合わせください。");
    return;
  }
  const code = encodeURIComponent(raw);
  const reorderId = encodeURIComponent(String(displayReorder.id || ""));
  router.push(`/mypage/purchase/confirm?code=${code}&mode=reorder&reorder_id=${reorderId}`);
}}

      className="px-3 py-1 rounded-full bg-pink-500 text-white"
    >
      再処方を決済する
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
                        <p>
  追跡番号：
  <a
    href={
      "https://trackings.post.japanpost.jp/services/srv/search/direct?reqCodeNo1=" +
      encodeURIComponent(order.trackingNumber)
    }
    target="_blank"
    rel="noopener noreferrer"
    className="ml-1 text-pink-600 underline"
  >
    {order.trackingNumber}
  </a>
</p>

                      ) : order.shippingEta ? (
                        <p>発送予定日：{formatDate(order.shippingEta)} まで</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 md:mt-0 flex w-full md:w-auto gap-2 md:flex-col md:items-end">
                    {order.trackingNumber && (
                      <button
                        type="button"
                        onClick={() => handleOpenTracking(order.trackingNumber)}
                        className="w-full md:w-[160px] h-11 inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white text-[13px] font-medium text-slate-700 active:scale-[0.98]"
                      >
                        配送状況を確認
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

{/* 再処方申請ボタン（初回分決済後） */}
{ordersFlags?.hasAnyPaidOrder && (
  <div className="mt-4">
    <button
      type="button"
      disabled={!ordersFlags?.canApplyReorder}
      onClick={() => {
        if (!ordersFlags?.canApplyReorder) return;
        router.push("/mypage/purchase?flow=reorder");
      }}
      className={
        "w-full rounded-xl text-center py-3 text-base font-semibold border " +
        (ordersFlags?.canApplyReorder
          ? "bg-white text-pink-600 border-pink-300 hover:bg-pink-50 transition"
          : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed")
      }
    >
      再処方を申請する
    </button>

    <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">
      ① 再処方内容を医師に申請します。<br />
      ② 医師が内容を確認し、問題なければ処方となります。
      <br />
      （平日10〜19時は申請後1時間以内、祝休日は当日中に反映されます）<br />
      ③ マイページを更新すると、再処方の情報が反映されます。
      {/* ※「申請が許可されました」のお知らせは、Lステップメッセージで送る運用も可能です。 */}
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
            {orderHistory.length > 0 && (
              <button
                type="button"
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                すべて表示
              </button>
            )}
          </div>

          {orderHistory.length === 0 ? (
            <div className="text-sm text-slate-600">
              まだ処方の履歴はありません。
            </div>
          ) : (
            <div className="space-y-3">
              {orderHistory.map((item) => {
                const dateLabel = formatDate(item.date);
                const mainText = item.detail || item.title || "処方";

                return (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 border border-slate-100 rounded-xl px-3 py-3"
                  >
                    <div>
                      <div className="text-[11px] text-slate-500">
                        {dateLabel}
                      </div>
                      <div className="text-sm font-medium text-slate-900">
                        {mainText}
                      </div>
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

  <a
    href="https://lin.ee/BlKX38U"
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center justify-center rounded-xl bg-pink-500 px-4 py-2 text-sm font-medium text-white hover:bg-pink-600 transition"
  >
    LINEで問い合わせる
  </a>

  <p className="mt-2 text-[11px] text-slate-500">
    ※ 診察中・夜間など、返信までお時間をいただく場合があります。
  </p>
</section>

      </main>
    </div>
  );
}