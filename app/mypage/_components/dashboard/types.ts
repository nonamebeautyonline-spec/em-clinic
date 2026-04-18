// 型定義 + ユーティリティ関数

export type ReservationStatus = "scheduled" | "completed" | "canceled";
export type ShippingStatus = "pending" | "preparing" | "shipped" | "delivered";
export type PaymentStatus = "paid" | "pending" | "failed" | "refunded" | "cancelled";
export type RefundStatus = "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED" | "UNKNOWN";
export type Carrier = "japanpost" | "yamato";

export interface PatientInfo {
  id: string; // Patient ID
  pid: string | null; // テナント内表示ID（P0000001形式）
  displayName: string; // 氏名
}

export interface Reservation {
  id: string;
  datetime: string; // ISO string
  title: string;
  status: ReservationStatus;
  fieldName?: string;        // 診療分野名
  fieldColor?: string;       // 診療分野カラーテーマ
}

export interface Order {
  id: string;
  productCode?: string;
  productName: string;
  shippingStatus: ShippingStatus;
  shippingEta?: string;
  trackingNumber?: string;
  paymentStatus: PaymentStatus;
  paymentMethod?: "credit_card" | "bank_transfer";
  refundStatus?: RefundStatus;
  refundedAt?: string;       // ISO（返金日時）
  refundedAmount?: number;   // JPY
  cancelledAt?: string;      // ISO（キャンセル日時：支払い前キャンセル・二重入力等）
  paidAt?: string;           // ISO
  carrier?: Carrier;
  postalCode?: string;
  address?: string;
  shippingName?: string;
  shippingListCreatedAt?: string;
  fieldName?: string;        // 診療分野名（マルチ分野モード時）
  fieldColor?: string;       // 診療分野カラーテーマ
}

export interface PrescriptionHistoryItem {
  id: string;
  date: string; // ISO string
  title: string;
  detail: string;
  fieldName?: string;        // 診療分野名
  fieldColor?: string;       // 診療分野カラーテーマ
}

export interface OrdersFlags {
  canPurchaseCurrentCourse: boolean;
  canApplyReorder: boolean;
  hasAnyPaidOrder: boolean;
}

export interface ReorderItem {
  id: string;
  reorder_number?: number | null;
  timestamp: string; // ISO or "yyyy/MM/dd HH:mm:ss"
  productCode?: string;
  product_code?: string;
  productLabel: string;
  status: "pending" | "confirmed" | "canceled" | "paid";
  note?: string;
  fieldName?: string;        // 診療分野名
  fieldColor?: string;       // 診療分野カラーテーマ
}

export interface RedeliveryItem {
  id: number;
  originalOrderId: string;
  amount: number;
  createdAt: string;
}

export interface PatientDashboardData {
  patient: PatientInfo;
  nextReservation?: Reservation | null;
  activeOrders: Order[];
  orders: Order[];
  history: PrescriptionHistoryItem[];
  ordersFlags?: OrdersFlags;
  redeliveries?: RedeliveryItem[];
}

export interface QueryPatientParams {
  customer_id?: string | null;
  name?: string | null;
  kana?: string | null;
  sex?: string | null;
  birth?: string | null;
  phone?: string | null;
}

// マイページ設定のデフォルト値
export const DEFAULT_MP_COLORS = { primary: "#ec4899", primaryHover: "#db2777", primaryLight: "#fdf2f8", pageBg: "#FFF8FB", primaryText: "#be185d" };
export const DEFAULT_MP_SECTIONS = { showIntake: true, showReserveButton: true, showReservation: true, showOrders: true, showReorder: true, showHistory: true, showSupport: true, showPointCard: true, showExport: false, showFieldSelect: true, showFieldBadges: true };
export const DEFAULT_MP_CONTENT = { clinicName: "", logoUrl: "", supportMessage: "予約やお薬、体調についてご不安な点があれば、LINEからいつでもご相談いただけます。", supportUrl: "", supportButtonLabel: "LINEで問い合わせる", supportNote: "※ 診察中・夜間など、返信までお時間をいただく場合があります。" };
export const DEFAULT_MP_LABELS = {
  intakeButtonLabel: "問診に進む", intakeCompleteText: "問診はすでに完了しています", intakeGuideText: "問診の入力は不要です。このまま予約にお進みください。", intakeNoteText: "※ 問診の入力が終わると、診察予約画面に進みます。",
  reserveButtonLabel: "予約に進む", purchaseButtonLabel: "決済に進む", reorderButtonLabel: "再処方を申請する",
  reservationTitle: "次回のご予約", ordersTitle: "注文／申請・発送状況", historyTitle: "これまでの処方歴", supportTitle: "お困りの方へ",
  noOrdersText: "現在、発送状況の確認が必要なお薬はありません。", noHistoryText: "まだ処方の履歴はありません。",
  phoneNotice: "",
  cancelNotice: "",
};

// 再処方や処方歴などで使う ProductCode → 表示名マップ
export const PRODUCT_LABELS: Record<string, string> = {
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

// ------------------------- ユーティリティ関数 -------------------------

export const isActiveOrder = (order: Order) => {
  if (order.refundStatus === "COMPLETED" || order.refundStatus === "CANCELLED") return false;
  if (!order.trackingNumber) return true;
  if (!order.shippingEta) return true;

  const shippedAt = new Date(order.shippingEta);
  if (isNaN(shippedAt.getTime())) return true;

  const now = new Date();
  const diffDays = (now.getTime() - shippedAt.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays < 10;
};

export const formatDateTime = (iso: string) => {
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

export const formatDateSafe = (v?: string) => {
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

export const formatVisitSlotRange = (iso: string) => {
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

export const reservationStatusLabel = (s: ReservationStatus) => {
  switch (s) {
    case "scheduled": return "予約済み";
    case "completed": return "診察完了";
    case "canceled": return "キャンセル済み";
    default: return "";
  }
};

export const shippingStatusLabel = (s: ShippingStatus) => {
  switch (s) {
    case "pending": return "受付済み";
    case "preparing": return "準備中";
    case "shipped": return "発送済み";
    case "delivered": return "配達完了";
    default: return "";
  }
};

export const paymentStatusLabel = (s: PaymentStatus) => {
  switch (s) {
    case "paid": return "決済済み";
    case "pending": return "確認中";
    case "failed": return "エラー";
    case "refunded": return "返金済み";
    case "cancelled": return "キャンセル済み";
    default: return "";
  }
};

export const normalizeTrackingNumber = (trackingNumber: string) =>
  String(trackingNumber ?? "").replace(/[^\d]/g, "");

export const isYamatoCarrier = (carrier?: Carrier) => (carrier ?? "yamato") === "yamato";

export const copyText = async (text: string) => {
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

export const reservationStatusBadgeClass = (s: ReservationStatus) => {
  switch (s) {
    case "scheduled": return "bg-pink-50 text-pink-600";
    case "completed": return "bg-emerald-50 text-emerald-700";
    case "canceled": return "bg-rose-50 text-rose-700";
    default: return "bg-slate-100 text-slate-600";
  }
};

export const shippingStatusClass = (status: string) => {
  switch (status) {
    case "pending": return "bg-rose-50 text-rose-700 border border-rose-100";
    case "preparing": return "bg-amber-50 text-amber-700 border border-amber-100";
    case "shipped": return "bg-sky-50 text-sky-700 border border-sky-100";
    case "delivered": return "bg-emerald-50 text-emerald-700 border border-emerald-100";
    case "on_hold": return "bg-slate-50 text-rose-700 border border-rose-200";
    default: return "bg-slate-50 text-slate-600 border border-slate-100";
  }
};

export const paymentStatusClass = (status: string) => {
  switch (status) {
    case "unpaid": return "bg-rose-50 text-rose-700 border border-rose-100";
    case "paid": return "bg-emerald-50 text-emerald-700 border border-emerald-100";
    case "refunded": return "bg-amber-50 text-amber-700 border border-amber-100";
    case "cancelled": return "bg-slate-50 text-slate-600 border border-slate-200";
    case "failed": return "bg-red-50 text-red-700 border border-red-100";
    default: return "bg-slate-50 text-slate-600 border border-slate-100";
  }
};

export const buildTrackingUrl = (carrier: Carrier, trackingNumber: string) => {
  const tn = encodeURIComponent(normalizeTrackingNumber(trackingNumber));
  if (carrier === "japanpost") {
    return "https://trackings.post.japanpost.jp/services/srv/search/direct?reqCodeNo1=" + tn;
  }
  return `https://member.kms.kuronekoyamato.co.jp/parcel/detail?pno=${tn}`;
};

export const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
};

export const getTimeSafe = (v?: string) => {
  if (!v) return 0;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : 0;
};
