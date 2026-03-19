// ウィジェット表示設定の型（個別KPIカード + チャート/タブ）
export interface WidgetSettings {
  // 主要KPI（4枚）
  kpi_reservations: boolean;
  kpi_shipping: boolean;
  kpi_revenue: boolean;
  kpi_repeat_rate: boolean;
  // 転換率KPI（3枚）
  kpi_payment_rate: boolean;
  kpi_reservation_rate: boolean;
  kpi_consultation_rate: boolean;
  // サブKPI（6枚）
  kpi_line_registered: boolean;
  kpi_active_reservations: boolean;
  kpi_avg_order: boolean;
  kpi_today_reservations: boolean;
  kpi_today_paid: boolean;
  kpi_bank_transfer: boolean;
  // チャート・タブ
  segmentChart: boolean;
  conversionChart: boolean;
  kpiTargetChart: boolean;
  detailTabs: boolean;
}

// カード並び順のデフォルト
export type KpiKey = keyof WidgetSettings;
export const DEFAULT_MAIN_ORDER: KpiKey[] = ["kpi_reservations", "kpi_shipping", "kpi_revenue", "kpi_repeat_rate"];
export const DEFAULT_CONV_ORDER: KpiKey[] = ["kpi_payment_rate", "kpi_reservation_rate", "kpi_consultation_rate"];
export const DEFAULT_SUB_ORDER: KpiKey[] = ["kpi_line_registered", "kpi_active_reservations", "kpi_avg_order", "kpi_today_reservations", "kpi_today_paid", "kpi_bank_transfer"];

export interface CardOrder {
  main: KpiKey[];
  conv: KpiKey[];
  sub: KpiKey[];
}

export const DEFAULT_CARD_ORDER: CardOrder = {
  main: DEFAULT_MAIN_ORDER,
  conv: DEFAULT_CONV_ORDER,
  sub: DEFAULT_SUB_ORDER,
};

export const DEFAULT_WIDGET_SETTINGS: WidgetSettings = {
  kpi_reservations: true,
  kpi_shipping: true,
  kpi_revenue: true,
  kpi_repeat_rate: true,
  kpi_payment_rate: true,
  kpi_reservation_rate: true,
  kpi_consultation_rate: true,
  kpi_line_registered: true,
  kpi_active_reservations: true,
  kpi_avg_order: true,
  kpi_today_reservations: true,
  kpi_today_paid: true,
  kpi_bank_transfer: true,
  segmentChart: true,
  conversionChart: true,
  kpiTargetChart: true,
  detailTabs: true,
};

// 日別売上データの型（API レスポンス）
export interface DailyBreakdown {
  date: string;
  square: number;
  bankTransfer: number;
  firstOrders: number;
  reorders: number;
}

export interface DashboardStats {
  reservations: {
    total: number;
    completed: number;
    cancelled: number;
    cancelRate: number;
    consultationCompletionRate: number;
  };
  shipping: {
    total: number;
    first: number;
    reorder: number;
    pending: number;
    delayed: number;
  };
  revenue: {
    square: number;
    bankTransfer: number;
    gross: number;
    refunded: number;
    refundCount: number;
    total: number;
    avgOrderAmount: number;
  };
  products: {
    code: string;
    name: string;
    count: number;
    revenue: number;
  }[];
  patients: {
    total: number;
    active: number;
    new: number;
    repeatRate: number;
  };
  bankTransfer: {
    pending: number;
    confirmed: number;
  };
  kpi: {
    paymentRateAfterConsultation: number;
    reservationRateAfterIntake: number;
    consultationCompletionRate: number;
    lineRegisteredCount: number;
    todayNewReservations: number;
    todayActiveReservations: number;
    todayActiveOK: number;
    todayActiveNG: number;
    todayNoAnswer: number;
    todayPaidCount: number;
  };
  dailyBreakdown?: DailyBreakdown[];
}

export type TabType = "overview" | "reservations" | "revenue" | "patients";

// SSE接続状態
export type SSEStatus = "connected" | "connecting" | "disconnected";

// トースト通知の型
export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: "reservation" | "payment" | "patient";
  timestamp: Date;
}

// リアルタイム統計
export interface RealtimeStats {
  activeAdminSessions: number;
  todayOutgoingCount: number;
  todayIncomingCount: number;
  todayMessageCount: number;
  todayNewPatients: number;
}

/** API にウィジェット設定を保存する */
export function saveWidgetSettings(settings: WidgetSettings, order?: CardOrder): void {
  const payload = order ? { ...settings, cardOrder: order } : settings;
  fetch("/api/admin/dashboard-layout?scope=enhanced", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enhancedWidgets: payload }),
  }).catch((e) => {
    console.error("[dashboard] ウィジェット設定保存失敗:", e);
  });
}
