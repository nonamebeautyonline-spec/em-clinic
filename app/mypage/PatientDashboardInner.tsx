"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

// ------------------------- 型定義 -------------------------
type ReservationStatus = "scheduled" | "completed" | "canceled";
type ShippingStatus = "pending" | "preparing" | "shipped" | "delivered";
type PaymentStatus = "paid" | "pending" | "failed" | "refunded";
type RefundStatus = "PENDING" | "COMPLETED" | "FAILED" | "UNKNOWN";
type Carrier = "japanpost" | "yamato";



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
  productCode?: string;
  productName: string;
  shippingStatus: ShippingStatus;
  shippingEta?: string;
  trackingNumber?: string;
  paymentStatus: PaymentStatus;
  paymentMethod?: "credit_card" | "bank_transfer"; // ★追加：決済方法
    // ★追加
  refundStatus?: RefundStatus;
  refundedAt?: string;       // ISO
  refundedAmount?: number;   // JPY
  paidAt?: string;           // ISO（履歴表示に使うならあると便利）
    carrier?: Carrier; // ★追加（APIから来る）
  postalCode?: string;
  address?: string;

  shippingName?: string;
  shippingListCreatedAt?: string;
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
  reorder_number?: number | null; // ★ 再処方番号（決済時に使用）
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
  orders: Order[]; // ★追加：返金済み含む注文一覧
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
  // 返金済みは非表示
  if (order.refundStatus === "COMPLETED") return false;

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
    case "refunded":
      return "返金済み";
    default:
      return "";
  }
};

const normalizeTrackingNumber = (trackingNumber: string) =>
  String(trackingNumber ?? "").replace(/[^\d]/g, "");

const isYamatoCarrier = (carrier?: Carrier) => (carrier ?? "yamato") === "yamato";

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
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
  const searchParams = useSearchParams();

  const [data, setData] = useState<PatientDashboardData | null>(null);
  const [reorders, setReorders] = useState<ReorderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showCancelSuccess, setShowCancelSuccess] = useState(false);
  const [canceling, setCanceling] = useState(false);
const [hasIntake, setHasIntake] = useState<boolean | null>(null);
const [intakeStatus, setIntakeStatus] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);
const [historyLoading, setHistoryLoading] = useState(false);
const [historyError, setHistoryError] = useState<string | null>(null);
const [editingAddressOrderId, setEditingAddressOrderId] = useState<string | null>(null);
const [editPostalCode, setEditPostalCode] = useState("");
const [editAddress, setEditAddress] = useState("");
const [editShippingName, setEditShippingName] = useState("");
const [addressSaving, setAddressSaving] = useState(false);

// マイページ設定（管理者カスタマイズ）
const [mpColors, setMpColors] = useState({ primary: "#ec4899", primaryHover: "#db2777", primaryLight: "#fdf2f8", pageBg: "#FFF8FB", primaryText: "#be185d" });
const [mpSections, setMpSections] = useState({ showIntakeStatus: true, showReservation: true, showOrders: true, showReorder: true, showHistory: true, showSupport: true });
const [mpContent, setMpContent] = useState({ clinicName: "", logoUrl: "", supportMessage: "予約やお薬、体調についてご不安な点があれば、LINEからいつでもご相談いただけます。", supportUrl: "https://lin.ee/BlKX38U", supportButtonLabel: "LINEで問い合わせる", supportNote: "※ 診察中・夜間など、返信までお時間をいただく場合があります。" });
const [mpLabels, setMpLabels] = useState({
  intakeButtonLabel: "問診に進む", intakeCompleteText: "問診はすでに完了しています", intakeGuideText: "問診の入力は不要です。このまま予約にお進みください。", intakeNoteText: "※ 問診の入力が終わると、診察予約画面に進みます。",
  reserveButtonLabel: "予約に進む", purchaseButtonLabel: "マンジャロを購入する（初回）", reorderButtonLabel: "再処方を申請する",
  reservationTitle: "次回のご予約", ordersTitle: "注文／申請・発送状況", historyTitle: "これまでの処方歴", supportTitle: "お困りの方へ",
  noOrdersText: "現在、発送状況の確認が必要なお薬はありません。", noHistoryText: "まだ処方の履歴はありません。",
  phoneNotice: "上記時間内に、090-からはじまる電話番号より携帯電話へお電話いたします。\n必ずしも開始時刻ちょうどではなく、予約枠（例：12:00〜12:15）の間に医師より順次ご連絡します。\n前の診療状況により、前後15分程度お時間が前後する場合があります。あらかじめご了承ください。",
  cancelNotice: "※ 予約の変更・キャンセルは診察予定時刻の1時間前まで可能です。",
});

useEffect(() => {
  fetch("/api/mypage/settings").then(r => r.json()).then(d => {
    if (d.config?.colors) setMpColors(d.config.colors);
    if (d.config?.sections) setMpSections(d.config.sections);
    if (d.config?.content) setMpContent(d.config.content);
    if (d.config?.labels) setMpLabels(d.config.labels);
  }).catch(() => {});
}, []);

const showToast = (msg: string) => {
  setToast(msg);
  setTimeout(() => setToast(null), 1200);
};


  const [showReorderCancelConfirm, setShowReorderCancelConfirm] = useState(false);
const [cancelingReorder, setCancelingReorder] = useState(false);
const [showReorderCancelSuccess, setShowReorderCancelSuccess] = useState(false);

useEffect(() => {
  const init = async () => {
    setLoading(true);

    // local state（最終的に setData に入れる）
    let finalData: PatientDashboardData = {
      patient: { id: "unknown", displayName: "ゲスト" },
      nextReservation: null,
      activeOrders: [],
      orders: [], // ★追加
      history: [],
    };

    try {
      // ① localStorage の読み込み（予約だけ）
      let storedReservation: any = null;

      if (typeof window !== "undefined") {
        const rawResv = window.localStorage.getItem("last_reservation");
        if (rawResv) {
          try {
            storedReservation = JSON.parse(rawResv);
          } catch {
            storedReservation = null;
          }
        }
      }

      // ③ Patient 情報（仮。/api/mypage の結果で上書き）
      const patient: PatientInfo = {
        id: "unknown",
        displayName: "ゲスト",
      };

      // ④ localStorage の予約情報（診察前だけ）
      let nextReservation: Reservation | null = null;
      if (storedReservation?.date && storedReservation?.start) {
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

      // 初期データ（仮）
      finalData = {
        patient,
        nextReservation,
        activeOrders: [],
        orders: [],   // ★追加
        history: [],
      };

      // ⑤ /api/mypage を1本だけ叩く
      // ★ refresh=1の場合はキャッシュをスキップ（決済完了後の強制リフレッシュ）
      const forceRefresh = searchParams.get("refresh") === "1";
      const mpRes = await fetch("/api/mypage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ refresh: forceRefresh }),
      });

      // ★ 未連携なら init へ
      if (mpRes.status === 401) {
        router.push("/mypage/init");
        return;
      }

      if (!mpRes.ok) {
        console.error("api/mypage response not ok:", mpRes.status);
        setError("データの取得に失敗しました。");
        return;
      }

      const api = (await mpRes.json()) as {
        ok: boolean;
        patient?: PatientInfo;
        nextReservation?: Reservation | null;
        activeOrders?: Order[];
        orders?: Order[]; // ★追加
        history?: PrescriptionHistoryItem[];
        ordersFlags?: OrdersFlags;
        reorders?: any[];
          hasIntake?: boolean; // ★追加
  intakeId?: string;   // ★任意
  intakeStatus?: string | null; // ★NG判定用
      };
      console.log(
  "[mypage api]",
  "activeOrders=",
  api.activeOrders?.length,
  "orders=",
  api.orders?.length
);
// ★★★ ここに入れる ★★★
const exists = api.hasIntake === true;
setHasIntake(exists);
setIntakeStatus(api.intakeStatus ?? null);

if (typeof window !== "undefined") {
  if (exists) window.localStorage.setItem("has_intake", "1");
  else window.localStorage.removeItem("has_intake");
}
// ★★★ ここまで ★★★

      if (api?.ok === false) {
        console.error("api/mypage returned ok:false");
        setError("データの取得に失敗しました。");
        return;
      }

      // ⑥ 反映
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
        orders: api.orders ?? [], // ★追加
        history: api.history ?? [],
        ordersFlags: api.ordersFlags,
      };

      // 診察履歴が1件でもあれば「次回予約」は消す
      if (finalData.history.length > 0) {
        finalData.nextReservation = null;
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("last_reservation");
          window.localStorage.setItem("has_intake", "1");
        }
      }

      // 再処方（配列が来たときだけ）
      if (Array.isArray(api.reorders)) {
        const mapped: ReorderItem[] = api.reorders.map((r: any) => {
          const code = String(r.product_code ?? r.productCode ?? "").trim();
          const label = PRODUCT_LABELS[code] || code || "マンジャロ";
          return {
            id: String(r.id ?? ""),
            reorder_number: r.reorder_number != null ? Number(r.reorder_number) : null,
timestamp: String(r.timestamp ?? r.createdAt ?? ""),
            product_code: code,
            productCode: code,
            productLabel: label,
            status: (r.status ?? "pending") as ReorderItem["status"],
            note: r.note ? String(r.note) : undefined,
          };
        });
        setReorders(mapped);
      }
      // ★ 問診提出済みチェック（has_pid を真実源にする）

      // 最終反映（成功時のみ）
      setData(finalData);
      setError(null);

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

const buildTrackingUrl = (carrier: Carrier, trackingNumber: string) => {
  const tn = encodeURIComponent(normalizeTrackingNumber(trackingNumber));

  if (carrier === "japanpost") {
    return (
      "https://trackings.post.japanpost.jp/services/srv/search/direct?reqCodeNo1=" +
      tn
    );
  }

  // ヤマト：フォーム（結果直行は不可）
  return `https://member.kms.kuronekoyamato.co.jp/parcel/detail?pno=${tn}`;
};


const handleOpenTracking = (order: Order) => {
  if (!order.trackingNumber) return;
  const carrier = (order.carrier ?? "yamato") as Carrier; // 未設定はヤマト寄せ
  const url = buildTrackingUrl(carrier, order.trackingNumber);
  window.open(url, "_blank", "noopener,noreferrer");
};

const handleCopyTrackingIfYamato = async (order: Order) => {
  if (!order.trackingNumber) return;
  if (!isYamatoCarrier(order.carrier)) return;

  const tn = normalizeTrackingNumber(order.trackingNumber);
  const ok = await copyText(tn);

  if (ok) showToast("追跡番号をコピーしました");
  else showToast("コピーに失敗しました");
};



const handleSaveAddress = async (orderId: string) => {
  setAddressSaving(true);
  try {
    const res = await fetch("/api/mypage/update-address", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        postalCode: editPostalCode,
        address: editAddress,
        shippingName: editShippingName,
      }),
    });
    const json = await res.json().catch(() => ({} as any));
    if (!res.ok || !json.ok) {
      alert(json.message || json.error || "住所の更新に失敗しました");
      return;
    }
    // ローカル state を更新
    setData((prev) => {
      if (!prev) return prev;
      const updateOrder = (o: Order) =>
        o.id === orderId
          ? { ...o, postalCode: editPostalCode.replace(/[^0-9]/g, "").replace(/^(\d{3})(\d{4})$/, "$1-$2"), address: editAddress, ...(editShippingName ? { shippingName: editShippingName } : {}) }
          : o;
      return {
        ...prev,
        activeOrders: prev.activeOrders.map(updateOrder),
        orders: prev.orders.map(updateOrder),
      };
    });
    setEditingAddressOrderId(null);
    showToast("届け先を更新しました");
  } catch {
    alert("住所の更新に失敗しました");
  } finally {
    setAddressSaving(false);
  }
};

  const handleContactSupport = () => {
    alert("LINE公式アカウントをあとで紐づけます。");
  };

  const handleReorderChange = () => {
    // 申請内容変更 → 再処方モードの商品一覧へ
    router.push("/mypage/purchase?flow=reorder");
  };

const handleReorderCancel = async () => {
  // displayReorder が無ければ何もしない
  if (!displayReorder) {
    alert("キャンセル対象の申請がありません。");
    return;
  }

  const targetId = displayReorder.id;

  try {
    setCancelingReorder(true);

    const res = await fetch("/api/reorder/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reorder_id: targetId }),
    });

    const json = await res.json().catch(() => ({} as any));

    if (!res.ok || json.ok === false) {
      alert("申請のキャンセルに失敗しました。時間をおいて再度お試しください。");
      return;
    }

    // 特定IDのみをローカル状態で canceled に更新
    setReorders((prev) =>
      prev.map((r) =>
        r.id === targetId ? { ...r, status: "canceled" } : r
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
const handleShowAllHistory = async () => {
  if (historyLoading) return;
  setHistoryLoading(true);
  setHistoryError(null);

  try {
    const res = await fetch("/api/mypage/orders", { method: "GET", cache: "no-store" });
    const json = await res.json().catch(() => ({} as any));

    if (!res.ok || json?.ok !== true) {
      setHistoryError("履歴の取得に失敗しました。");
      return;
    }

    const orders: Order[] = Array.isArray(json.orders) ? json.orders : [];
    setData((prev) => (prev ? { ...prev, orders } : prev));
    setShowAllHistory(true);
  } catch (e) {
    console.error(e);
    setHistoryError("履歴の取得に失敗しました。");
  } finally {
    setHistoryLoading(false);
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
const getTimeSafe = (v?: string) => {
  if (!v) return 0;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : 0;
};
// 注文：アクティブ分だけ表示（未発送 or 発送から10日未満）
// 並び順：新しい順（paidAt優先、無ければshippingEta）
const visibleOrders = activeOrders
  .filter(isActiveOrder)
  .slice()
  .sort(
    (a, b) =>
      getTimeSafe(b.paidAt || b.shippingEta) - getTimeSafe(a.paidAt || a.shippingEta)
  )
  .slice(0, 5);

// 参考：アーカイブ側（必要なら後で「過去の配送」タブを作れる）
const archivedOrders = activeOrders.filter((o) => !isActiveOrder(o));


  const hasHistory = history.length > 0;
  const lastHistory = hasHistory ? history[0] : null;
  const isFirstVisit = !hasHistory;
  const isNG = intakeStatus === "NG";
    // 予約ボタンの有効条件：
  //  - 問診済み
  //  - 診察履歴がまだない（初回診察前）、またはNG患者（再予約可）
  //  - すでに予約が入っていない
  const canReserve =
  hasIntake === true && (!hasHistory || isNG) && !nextReservation;

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
};

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
  // 1. confirmed があれば confirmed を優先（決済が必要なため）
  // 2. なければ pending を表示
  const displayReorder = latestConfirmedReorder ?? latestPendingReorder;
  const displayReorderStatus = displayReorder?.status; // "pending" | "confirmed" | undefined


  // 初回購入ボタン（診察済み・まだ決済0回・申請も無し・NG以外のときだけ）
  const showInitialPurchase =
    hasHistory &&
    !isNG &&
    !(ordersFlags?.hasAnyPaidOrder ?? false) &&
    !hasPendingReorder;

  const canPurchaseInitial =
    showInitialPurchase && (ordersFlags?.canPurchaseCurrentCourse ?? true);

  const topSectionTitle = nextReservation
    ? mpLabels.reservationTitle
    : hasHistory
    ? "初回診察"
    : mpLabels.reservationTitle;

return (
  <div className="min-h-screen" style={{ backgroundColor: mpColors.pageBg, '--mp-primary': mpColors.primary, '--mp-hover': mpColors.primaryHover, '--mp-light': mpColors.primaryLight, '--mp-text': mpColors.primaryText } as React.CSSProperties}>
    {/* 予約キャンセル完了トースト */}
    {toast && (
  <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20">
    <div className="bg-white px-6 py-3 rounded-2xl shadow-lg text-slate-700 text-sm font-semibold">
      ✓ {toast}
    </div>
  </div>
)}

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

    {/* 再処方キャンセル確認モーダル（pending/confirmed両対応） */}
    {showReorderCancelConfirm && displayReorder && (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35">
        <div className="bg-white rounded-2xl shadow-lg p-5 w-[90%] max-w-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">
            {displayReorderStatus === "confirmed"
              ? "許可済みの再処方をキャンセルしますか？"
              : "この再処方申請をキャンセルしますか？"}
          </h3>
          <p className="text-[13px] text-slate-600 mb-4">
            {displayReorder.productLabel}
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
      {mpSections.showIntakeStatus && (
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
      : "bg-white text-[var(--mp-primary)] border-[var(--mp-primary)] hover:bg-[var(--mp-light)] transition")
  }
>
  {mpLabels.reserveButtonLabel}
</button>

{/* ★ NG患者バナー */}
{isNG && (
  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
    <p className="text-sm font-semibold text-rose-700 mb-1">処方不可</p>
    <p className="text-[12px] text-rose-600 leading-relaxed">
      診察の結果、現在処方ができない状態です。<br />
      再度診察をご希望の場合は「予約に進む」から予約をお取りください。
    </p>
  </div>
)}

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
        {/* 初回診察／次回予約ブロック */}
        {mpSections.showReservation && (
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
    {/* 予約日時（15分レンジ表示） */}
    <div className="text-[15px] font-semibold text-slate-900">
      {formatDateTime(nextReservation.datetime)}
    </div>

    {/* タイトル（オンライン診察予約） */}
    <div className="mt-1 text-sm text-slate-600">
      {nextReservation.title}
    </div>

    {/* ★ 電話案内文言 */}
<p className="mt-2 text-xs text-slate-600 leading-relaxed whitespace-pre-line">
  {mpLabels.phoneNotice}
</p>


    {/* ボタン群：詳細ボタンは削除 */}
    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
      {/* 日時変更ボタン */}
      <button
        type="button"
        onClick={handleChangeReservation}
        className="flex-1 inline-flex items-center justify-center rounded-xl border border-[var(--mp-primary)] bg-white px-3 py-2 text-sm text-[var(--mp-primary)] hover:bg-[var(--mp-light)] transition"
      >
        日時を変更する
      </button>

      {/* キャンセルボタン */}
      <button
        type="button"
        onClick={() => setShowCancelConfirm(true)}
        className="flex-1 inline-flex items-center justify-center rounded-xl bg-[var(--mp-primary)] px-3 py-2 text-sm text-white hover:bg-[var(--mp-hover)] transition"
      >
        予約をキャンセルする
      </button>
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
        )}

        {/* 注文／申請・発送状況 */}
        {mpSections.showOrders && (
        <section className="bg-white rounded-3xl shadow-sm p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-800">
              {mpLabels.ordersTitle}
            </h2>
          </div>

          {/* 再処方申請カード（pending or confirmed を表示、NG患者は非表示） */}
          {displayReorder && !isNG && (
            <div className="mb-3 rounded-2xl border border-[var(--mp-primary)] bg-[var(--mp-light)] px-4 py-3">
              <div className="text-xs font-semibold text-[var(--mp-text)] mb-1">
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
        // ★ reorder_number を使用（webhookがreorder_numberで更新するため）
        // フォールバック: reorder_number がない場合は id を使用（キャッシュ対応）
        const reorderNum = displayReorder.reorder_number ?? displayReorder.id;
        if (!reorderNum) {
          alert("再処方の識別子が見つかりません。管理者にお問い合わせください。");
          return;
        }
        const code = encodeURIComponent(raw);
        const reorderId = encodeURIComponent(String(reorderNum));
        router.push(`/mypage/purchase/confirm?code=${code}&mode=reorder&reorder_id=${reorderId}`);
      }}
      className="px-4 py-1.5 rounded-full bg-emerald-500 text-white font-semibold shadow-sm"
    >
      決済へ進む
    </button>
    <button
      type="button"
      onClick={() => setShowReorderCancelConfirm(true)}
      className="px-3 py-1 rounded-full border border-rose-200 bg-rose-50 text-rose-700"
    >
      キャンセルする
    </button>
  </div>
)}



            </div>
          )}


          {/* 通常の注文・発送状況 */}
          {activeOrders.length === 0 ? (
            <div className="text-sm text-slate-600">
              {mpLabels.noOrdersText}
            </div>
          ) : (
            <div className="space-y-3">
              {visibleOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl bg-white shadow-[0_4px_18px_rgba(15,23,42,0.06)] px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex-1">
                    {order.paidAt && (
                      <div className="text-[11px] text-slate-500 mb-0.5">
                        {formatDateSafe(order.paidAt)}
                      </div>
                    )}
                    <div className="text-[15px] font-medium text-slate-900">
                      {PRODUCT_LABELS[order.productCode] || order.productName || order.productCode}
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

                    {/* ★ 銀行振込の場合の説明 */}
                    {order.paymentMethod === "bank_transfer" && (
                      <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2">
                        <p className="text-[10px] text-blue-900 leading-relaxed">
                          <strong>銀行振込について</strong>
                          <br />
                          金曜15時〜月曜9時のお振込みはご利用の銀行次第で反映が翌営業日となる場合があります。振込確認後の発送となります。
                        </p>
                      </div>
                    )}

<div className="mt-2 text-[11px] text-slate-500 space-y-0.5">
  {order.trackingNumber ? (
    <p className="flex flex-wrap items-center gap-2">
      <span>追跡番号：</span>

      {order.carrier === "japanpost" ? (
        // 日本郵便：今まで通りリンク（結果へ直行）
        <a
          href={buildTrackingUrl("japanpost", order.trackingNumber)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--mp-primary)] underline"
        >
          {order.trackingNumber}
        </a>
      ) : (
        // ヤマト：リンクにせずクリックでコピー（文言は出さない）＋トースト
<button
  type="button"
  onClick={() => handleCopyTrackingIfYamato(order)}
  className="inline-flex items-center gap-1 text-[var(--mp-primary)] underline"
  title="タップでコピー"
>
  <span>{order.trackingNumber}</span>
  <span className="text-[11px] text-slate-400 no-underline">⧉</span>
</button>

      )}

      <span className="text-[10px] text-slate-400">
        （{order.carrier === "japanpost" ? "日本郵便" : "ヤマト"}）
      </span>
    </p>
  ) : order.shippingEta ? (
    <p>発送予定日：{formatDateSafe(order.shippingEta)} まで</p>
  ) : null}
</div>

{/* ★ 配送先情報 */}
  <div className="mt-2">
    {editingAddressOrderId === order.id ? (
      /* 編集フォーム */
      <div className="rounded-xl border border-[var(--mp-primary)] bg-[var(--mp-light)] px-3 py-2.5 space-y-2">
        <label className="block">
          <span className="text-[13px] text-slate-600">配送先名義</span>
          <input
            type="text"
            value={editShippingName}
            onChange={(e) => setEditShippingName(e.target.value)}
            placeholder="氏名"
            className="mt-0.5 block w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-[13px] text-slate-600">郵便番号</span>
          <input
            type="text"
            value={editPostalCode}
            onChange={(e) => setEditPostalCode(e.target.value)}
            placeholder="1234567"
            className="mt-0.5 block w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-[13px] text-slate-600">住所</span>
          <textarea
            value={editAddress}
            onChange={(e) => setEditAddress(e.target.value)}
            rows={2}
            className="mt-0.5 block w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={addressSaving}
            onClick={() => handleSaveAddress(order.id)}
            className="px-5 py-2 rounded-full bg-[var(--mp-primary)] text-white text-[13px] font-semibold disabled:opacity-50"
          >
            {addressSaving ? "保存中…" : "保存"}
          </button>
          <button
            type="button"
            disabled={addressSaving}
            onClick={() => setEditingAddressOrderId(null)}
            className="px-5 py-2 rounded-full border border-slate-200 bg-white text-slate-600 text-[13px]"
          >
            キャンセル
          </button>
        </div>
      </div>
    ) : (
      /* 表示 */
      <div className="space-y-2">
        <div className="rounded-xl bg-sky-50 px-3 py-2.5 text-[13px] text-blue-900 space-y-1">
          <p>配送先名義：{order.shippingName || "―"}</p>
          {order.postalCode && <p>郵便番号：{order.postalCode}</p>}
          {order.address && <p>住所：{order.address}</p>}
        </div>

        {order.shippingStatus === "shipped" || order.trackingNumber ? (
          /* 発送済み: ヤマトで変更・営業所留め案内 */
          <p className="text-xs text-slate-500 leading-relaxed mt-1">
            ※ 届け先の変更・営業所留めをご希望の場合は、追跡番号からヤマト運輸のサイトでお手続きください。
          </p>
        ) : (
          <>
            {/* 未発送: 営業所留め案内（常時表示） */}
            <p className="text-xs text-slate-500 leading-relaxed mt-1">
              ※ 営業所留めをご希望の場合は、発送後に追跡番号からヤマト運輸のサイトでお手続きください。
            </p>
            {!order.shippingListCreatedAt ? (
              /* 発送リスト未作成: 編集ボタン */
              <button
                type="button"
                onClick={() => {
                  setEditShippingName(order.shippingName || "");
                  setEditPostalCode(order.postalCode || "");
                  setEditAddress(order.address || "");
                  setEditingAddressOrderId(order.id);
                }}
                className="mt-1.5 px-5 py-2 rounded-full border border-[var(--mp-primary)] bg-white text-[var(--mp-primary)] text-[13px] font-semibold"
              >
                届け先を変更
              </button>
            ) : (
              /* 発送リスト作成済み: LINE案内 */
              <p className="text-xs text-slate-500 leading-relaxed">
                ※ 発送準備に入ったため、届け先の変更はLINEからお問い合わせください。
              </p>
            )}
          </>
        )}
      </div>
    )}
  </div>

                  </div>
                  <div className="mt-3 md:mt-0 flex w-full md:w-auto gap-2 md:flex-col md:items-end">
                    {order.trackingNumber && (
                      <button
                        type="button"
onClick={() => handleOpenTracking(order)}
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

{/* 再処方申請ボタン（初回分決済後・申請中/許可済みがなければ有効・NG以外） */}
{ordersFlags?.hasAnyPaidOrder && !isNG && (
  <div className="mt-4">
    <button
      type="button"
      disabled={!ordersFlags?.canApplyReorder || !!displayReorder}
      onClick={() => {
        if (!ordersFlags?.canApplyReorder || displayReorder) return;
        router.push("/mypage/purchase?flow=reorder");
      }}
      className={
        "w-full rounded-xl text-center py-3 text-base font-semibold border " +
        (ordersFlags?.canApplyReorder && !displayReorder
          ? "bg-white text-[var(--mp-primary)] border-[var(--mp-primary)] hover:bg-[var(--mp-light)] transition"
          : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed")
      }
    >
      {mpLabels.reorderButtonLabel}
    </button>

    {displayReorder ? (
      <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">
        ※ 申請中または許可済みの再処方があります。キャンセルまたは決済完了後に再度お申し込みください。
      </p>
    ) : (
      <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">
        ① 再処方内容を医師に申請します。<br />
        ② 医師が内容を確認し、問題なければ処方となります。
        <br />
        （平日10〜19時は申請後1時間以内、祝休日は当日中に反映されます）<br />
        ③ マイページを更新すると、再処方の情報が反映されます。
      </p>
    )}
  </div>
)}

        </section>
        )}

        {/* 処方歴 */}
        {mpSections.showHistory && (
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
                        {PRODUCT_LABELS[o.productCode] || o.productName || o.productCode}
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
        )}

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
  );
}