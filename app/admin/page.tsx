"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface DashboardStats {
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
  };
  revenue: {
    square: number;
    bankTransfer: number;
    gross: number;
    refunded: number;
    refundCount: number;
    total: number;
    avgOrderAmount: number;
    totalOrders: number;
    reorderOrders: number;
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
    repeatPatients: number;
    totalOrderPatients: number;
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
    todayActiveReservations: number;
    todayNewReservations: number;
    todayPaidCount: number;
  };
  dailyOrders: {
    date: string;
    first: number;
    reorder: number;
  }[];
}

// ウィジェット定義
type WidgetId =
  | "reservations" | "shipping" | "revenue" | "repeat_rate"
  | "payment_rate" | "reservation_rate" | "consultation_rate"
  | "line_registered" | "active_reservations" | "today_paid" | "avg_order"
  | "daily_chart" | "product_sales" | "bank_transfer";

interface WidgetConfig {
  id: WidgetId;
  visible: boolean;
}

interface DashboardLayout {
  widgets: WidgetConfig[];
}

const WIDGET_LABELS: Record<WidgetId, string> = {
  reservations: "予約件数",
  shipping: "配送件数",
  revenue: "売上",
  repeat_rate: "リピート率",
  payment_rate: "診療後の決済率",
  reservation_rate: "問診後の予約率",
  consultation_rate: "予約後の受診率",
  line_registered: "LINE登録者数",
  active_reservations: "アクティブ予約数",
  today_paid: "本日の決済人数",
  avg_order: "顧客単価",
  daily_chart: "新規処方 vs 再処方グラフ",
  product_sales: "商品別売上",
  bank_transfer: "銀行振込状況",
};

// ウィジェットのグループ分け（レンダリング時のグリッド制御用）
const WIDGET_GROUPS: Record<string, WidgetId[]> = {
  kpi_main: ["reservations", "shipping", "revenue", "repeat_rate"],
  kpi_conversion: ["payment_rate", "reservation_rate", "consultation_rate"],
  kpi_today: ["line_registered", "active_reservations", "today_paid", "avg_order"],
  chart: ["daily_chart"],
  detail: ["product_sales", "bank_transfer"],
};

function getGroupForWidget(id: WidgetId): string {
  for (const [group, ids] of Object.entries(WIDGET_GROUPS)) {
    if (ids.includes(id)) return group;
  }
  return "other";
}

// スケルトン
function Skeleton({ w = "w-16", h = "h-4" }: { w?: string; h?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded ${w} ${h}`} />;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateRange, setDateRange] = useState("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // ウィジェットレイアウト
  const [layout, setLayout] = useState<DashboardLayout | null>(null);
  const [showCustomize, setShowCustomize] = useState(false);
  const [savingLayout, setSavingLayout] = useState(false);

  // ドラッグ&ドロップ（@dnd-kit）
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // レイアウト読み込み
  useEffect(() => {
    fetch("/api/admin/dashboard-layout", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.widgets) setLayout(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadStats();
  }, [dateRange, startDate, endDate]);

  const loadStats = async () => {
    setLoading(true);
    setStats(null);
    setError("");
    try {
      const params = new URLSearchParams({ range: dateRange });
      if (dateRange === "custom" && startDate && endDate) {
        params.append("start", startDate);
        params.append("end", endDate);
      }
      const res = await fetch(`/api/admin/dashboard-stats-enhanced?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("データ取得失敗");
      setStats(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const isVisible = useCallback((id: WidgetId) => {
    if (!layout) return true; // レイアウト未取得時は全表示
    const w = layout.widgets.find((w) => w.id === id);
    return w ? w.visible : true;
  }, [layout]);

  // ウィジェットの表示順を返す
  const orderedWidgets = useCallback((group: string): WidgetId[] => {
    const groupWidgets = WIDGET_GROUPS[group] || [];
    if (!layout) return groupWidgets;
    // layout.widgets の順序でグループ内ウィジェットをフィルタ
    const ordered = layout.widgets
      .filter((w) => groupWidgets.includes(w.id) && w.visible)
      .map((w) => w.id);
    // レイアウトに含まれないウィジェットを末尾に追加
    for (const id of groupWidgets) {
      if (!ordered.includes(id) && isVisible(id)) ordered.push(id);
    }
    return ordered;
  }, [layout, isVisible]);

  // レイアウト保存
  const saveLayout = async (newLayout: DashboardLayout) => {
    setLayout(newLayout);
    setSavingLayout(true);
    try {
      await fetch("/api/admin/dashboard-layout", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLayout),
      });
    } catch {
      // 保存失敗はサイレント（次回ロード時にリセットされる）
    } finally {
      setSavingLayout(false);
    }
  };

  // カスタマイズパネルのトグル
  const toggleWidget = (id: WidgetId) => {
    if (!layout) return;
    const newWidgets = layout.widgets.map((w) =>
      w.id === id ? { ...w, visible: !w.visible } : w
    );
    saveLayout({ widgets: newWidgets });
  };

  // ドラッグ&ドロップハンドラ（@dnd-kit）
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !layout) return;
    const oldIndex = layout.widgets.findIndex((w) => w.id === active.id);
    const newIndex = layout.widgets.findIndex((w) => w.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newWidgets = arrayMove(layout.widgets, oldIndex, newIndex);
    saveLayout({ widgets: newWidgets });
  };

  // 全ウィジェットの表示順（レイアウト準拠）
  const allOrderedWidgets: WidgetId[] = layout
    ? layout.widgets.map((w) => w.id)
    : (Object.values(WIDGET_GROUPS).flat() as WidgetId[]);

  // ウィジェットのレンダリング関数群
  const renderWidget = (id: WidgetId) => {
    if (!isVisible(id)) return null;
    switch (id) {
      case "reservations": return renderReservations();
      case "shipping": return renderShipping();
      case "revenue": return renderRevenue();
      case "repeat_rate": return renderRepeatRate();
      case "payment_rate": return renderPaymentRate();
      case "reservation_rate": return renderReservationRate();
      case "consultation_rate": return renderConsultationRate();
      case "line_registered": return renderLineRegistered();
      case "active_reservations": return renderActiveReservations();
      case "today_paid": return renderTodayPaid();
      case "avg_order": return renderAvgOrder();
      case "daily_chart": return renderDailyChart();
      case "product_sales": return renderProductSales();
      case "bank_transfer": return renderBankTransfer();
      default: return null;
    }
  };

  // ===== KPIカードウィジェット =====
  function renderReservations() {
    return (
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
        {loading ? (
          <div className="space-y-3">
            <Skeleton /><Skeleton h="h-8" w="w-20" /><Skeleton w="w-full" h="h-3" /><Skeleton w="w-24" h="h-3" />
          </div>
        ) : (
          <>
            <div className="text-sm text-slate-600 mb-2">予約</div>
            <div className="text-3xl font-bold text-slate-900">{stats?.reservations.total || 0}</div>
            <div className="text-xs text-slate-500 mt-2">キャンセル: {stats?.reservations.cancelled || 0}</div>
            <div className="text-xs text-green-600 mt-1">診察済み: {stats?.reservations.completed || 0}</div>
          </>
        )}
      </div>
    );
  }

  function renderShipping() {
    return (
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
        {loading ? (
          <div className="space-y-3">
            <Skeleton /><Skeleton h="h-8" w="w-20" /><Skeleton w="w-full" h="h-3" />
          </div>
        ) : (
          <>
            <div className="text-sm text-slate-600 mb-2">配送</div>
            <div className="text-3xl font-bold text-slate-900">{stats?.shipping.total || 0}</div>
            <div className="text-xs text-slate-500 mt-2">
              新規: {stats?.shipping.first || 0} / 再処方: {stats?.shipping.reorder || 0}
            </div>
          </>
        )}
      </div>
    );
  }

  function renderRevenue() {
    return (
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
        {loading ? (
          <div className="space-y-3">
            <Skeleton /><Skeleton h="h-8" w="w-24" /><Skeleton w="w-full" h="h-3" /><Skeleton w="w-32" h="h-3" />
          </div>
        ) : (
          <>
            <div className="text-sm text-slate-600 mb-2">純売上（返金後）</div>
            <div className="text-3xl font-bold text-slate-900">
              ¥{(stats?.revenue.total || 0).toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 mt-2">
              総売上: ¥{(stats?.revenue.gross || 0).toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              カード: ¥{(stats?.revenue.square || 0).toLocaleString()} / 振込: ¥{(stats?.revenue.bankTransfer || 0).toLocaleString()}
            </div>
            {(stats?.revenue.refunded || 0) > 0 && (
              <div className="text-xs text-red-600 mt-1">
                返金: -¥{(stats?.revenue.refunded || 0).toLocaleString()} ({stats?.revenue.refundCount || 0}件)
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  function renderRepeatRate() {
    return (
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
        {loading ? (
          <div className="space-y-3">
            <Skeleton w="w-20" /><Skeleton h="h-8" w="w-16" /><Skeleton w="w-full" h="h-3" /><Skeleton w="w-24" h="h-3" />
          </div>
        ) : (
          <>
            <div className="text-sm text-slate-600 mb-2">リピート率</div>
            <div className="text-3xl font-bold text-slate-900">{stats?.patients.repeatRate || 0}%</div>
            <div className="text-xs text-slate-500 mt-2">
              注文患者: {stats?.patients.totalOrderPatients || 0} / リピーター: {stats?.patients.repeatPatients || 0}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              総患者: {stats?.patients.total || 0} / 新規: {stats?.patients.new || 0}
            </div>
          </>
        )}
      </div>
    );
  }

  function renderPaymentRate() {
    return (
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-cyan-500">
        {loading ? (
          <div className="space-y-3">
            <Skeleton w="w-24" /><Skeleton h="h-8" w="w-16" /><Skeleton w="w-full" h="h-3" />
          </div>
        ) : (
          <>
            <div className="text-sm text-slate-600 mb-2">診療後の決済率</div>
            <div className="text-3xl font-bold text-slate-900">{stats?.kpi.paymentRateAfterConsultation || 0}%</div>
            <div className="text-xs text-slate-500 mt-2">診察完了後に決済した患者の割合</div>
          </>
        )}
      </div>
    );
  }

  function renderReservationRate() {
    return (
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-500">
        {loading ? (
          <div className="space-y-3">
            <Skeleton w="w-24" /><Skeleton h="h-8" w="w-16" /><Skeleton w="w-full" h="h-3" />
          </div>
        ) : (
          <>
            <div className="text-sm text-slate-600 mb-2">問診後の予約率</div>
            <div className="text-3xl font-bold text-slate-900">{stats?.kpi.reservationRateAfterIntake || 0}%</div>
            <div className="text-xs text-slate-500 mt-2">問診完了後に予約した患者の割合</div>
          </>
        )}
      </div>
    );
  }

  function renderConsultationRate() {
    return (
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-teal-500">
        {loading ? (
          <div className="space-y-3">
            <Skeleton w="w-24" /><Skeleton h="h-8" w="w-16" /><Skeleton w="w-full" h="h-3" />
          </div>
        ) : (
          <>
            <div className="text-sm text-slate-600 mb-2">予約後の受診率</div>
            <div className="text-3xl font-bold text-slate-900">{stats?.kpi.consultationCompletionRate || 0}%</div>
            <div className="text-xs text-slate-500 mt-2">予約後に診察を完了した患者の割合</div>
          </>
        )}
      </div>
    );
  }

  function renderLineRegistered() {
    return (
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-emerald-500">
        {loading ? (
          <div className="space-y-3">
            <Skeleton w="w-24" /><Skeleton h="h-8" w="w-16" /><Skeleton w="w-full" h="h-3" />
          </div>
        ) : (
          <>
            <div className="text-sm text-slate-600 mb-2">LINE登録者数</div>
            <div className="text-3xl font-bold text-slate-900">{stats?.kpi.lineRegisteredCount || 0}</div>
            <div className="text-xs text-slate-500 mt-2">LINE連携済みの患者数</div>
          </>
        )}
      </div>
    );
  }

  function renderActiveReservations() {
    return (
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-sky-500">
        {loading ? (
          <div className="space-y-3">
            <Skeleton w="w-24" /><Skeleton h="h-8" w="w-16" /><Skeleton w="w-full" h="h-3" />
          </div>
        ) : (
          <>
            <div className="text-sm text-slate-600 mb-2">アクティブ予約数</div>
            <div className="text-3xl font-bold text-slate-900">{stats?.kpi.todayActiveReservations || 0}</div>
            <div className="text-xs text-slate-500 mt-2">キャンセル除く有効な予約数</div>
            <div className="text-xs text-slate-400 mt-1">作成: {stats?.kpi.todayNewReservations || 0}件</div>
          </>
        )}
      </div>
    );
  }

  function renderTodayPaid() {
    return (
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-violet-500">
        {loading ? (
          <div className="space-y-3">
            <Skeleton w="w-24" /><Skeleton h="h-8" w="w-16" /><Skeleton w="w-full" h="h-3" />
          </div>
        ) : (
          <>
            <div className="text-sm text-slate-600 mb-2">本日の決済人数</div>
            <div className="text-3xl font-bold text-slate-900">{stats?.kpi.todayPaidCount || 0}</div>
            <div className="text-xs text-slate-500 mt-2">今日決済した患者の数</div>
          </>
        )}
      </div>
    );
  }

  function renderAvgOrder() {
    return (
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-rose-500">
        {loading ? (
          <div className="space-y-3">
            <Skeleton w="w-20" /><Skeleton h="h-8" w="w-24" /><Skeleton w="w-20" h="h-3" />
          </div>
        ) : (
          <>
            <div className="text-sm text-slate-600 mb-2">顧客単価</div>
            <div className="text-3xl font-bold text-slate-900">
              ¥{(stats?.revenue.avgOrderAmount || 0).toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 mt-2">平均注文額</div>
          </>
        )}
      </div>
    );
  }

  function renderDailyChart() {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">新規処方 vs 再処方（日別）</h2>
        {loading ? (
          <div className="animate-pulse h-48 bg-slate-100 rounded" />
        ) : stats?.dailyOrders && stats.dailyOrders.length > 0 ? (
          <>
            <div className="flex items-center gap-4 mb-4 text-xs">
              <div className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded bg-blue-500" />
                <span className="text-slate-600">新規処方</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded bg-orange-500" />
                <span className="text-slate-600">再処方</span>
              </div>
            </div>
            {(() => {
              const maxTotal = Math.max(...stats.dailyOrders.map(d => d.first + d.reorder), 1);
              const barMaxH = 180;
              return (
                <div className="flex items-end gap-1" style={{ height: barMaxH + 32 }}>
                  {stats.dailyOrders.map((day) => {
                    const total = day.first + day.reorder;
                    const totalH = (total / maxTotal) * barMaxH;
                    const firstH = total > 0 ? (day.first / total) * totalH : 0;
                    const reorderH = total > 0 ? (day.reorder / total) * totalH : 0;
                    return (
                      <div key={day.date} className="flex flex-col items-center flex-1 min-w-0">
                        <div className="text-xs text-slate-600 mb-1 font-medium">{total}</div>
                        <div className="w-full flex flex-col justify-end" style={{ height: barMaxH }}>
                          <div
                            className="bg-orange-500 rounded-t-sm w-full"
                            style={{ height: reorderH }}
                            title={`再処方: ${day.reorder}`}
                          />
                          <div
                            className="bg-blue-500 w-full"
                            style={{ height: firstH, borderRadius: reorderH === 0 ? '2px 2px 0 0' : 0 }}
                            title={`新規: ${day.first}`}
                          />
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 truncate w-full text-center">
                          {day.date.slice(5)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </>
        ) : (
          <div className="text-sm text-slate-400 text-center py-8">データがありません</div>
        )}
      </div>
    );
  }

  function renderProductSales() {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">商品別売上</h2>
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3 bg-slate-50 rounded-lg">
                <div className="flex justify-between">
                  <div className="space-y-2"><Skeleton w="w-32" /><Skeleton w="w-24" h="h-3" /></div>
                  <div className="space-y-2 text-right"><Skeleton w="w-20" /><Skeleton w="w-12" h="h-3" /></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {stats?.products.map((product) => (
              <div key={product.code} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{product.name}</div>
                  <div className="text-xs text-slate-600">{product.code}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-900">¥{product.revenue.toLocaleString()}</div>
                  <div className="text-xs text-slate-600">{product.count}件</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderBankTransfer() {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">銀行振込状況</h2>
        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <Skeleton w="w-16" /><Skeleton h="h-8" w="w-12" /><Skeleton w="w-8" h="h-3" />
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <Skeleton w="w-16" /><Skeleton h="h-8" w="w-12" /><Skeleton w="w-8" h="h-3" />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-sm text-yellow-800 mb-2">入金待ち</div>
              <div className="text-3xl font-bold text-yellow-900">{stats?.bankTransfer.pending || 0}</div>
              <div className="text-xs text-yellow-700 mt-1">件</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-sm text-green-800 mb-2">確認済み</div>
              <div className="text-3xl font-bold text-green-900">{stats?.bankTransfer.confirmed || 0}</div>
              <div className="text-xs text-green-700 mt-1">件</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===== グループ単位でウィジェットをレンダリング =====
  // レイアウト順に従いつつ、同じグループのウィジェットは同じグリッドにまとめる
  function renderWidgetGroups() {
    const rendered = new Set<WidgetId>();
    const sections: React.ReactNode[] = [];

    for (const wid of allOrderedWidgets) {
      if (rendered.has(wid)) continue;
      if (!isVisible(wid)) { rendered.add(wid); continue; }

      const group = getGroupForWidget(wid);
      // 同グループの連続ウィジェットをまとめて取得
      const groupWidgets: WidgetId[] = [];
      for (const w of allOrderedWidgets) {
        if (rendered.has(w) || !isVisible(w)) continue;
        if (getGroupForWidget(w) === group) groupWidgets.push(w);
      }
      groupWidgets.forEach((w) => rendered.add(w));

      if (groupWidgets.length === 0) continue;

      // グリッド設定
      let gridClass = "grid grid-cols-1 gap-6 mb-8";
      if (group === "kpi_main" || group === "kpi_today") {
        const cols = Math.min(groupWidgets.length, 4);
        gridClass = `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${cols} gap-6 mb-8`;
      } else if (group === "kpi_conversion") {
        const cols = Math.min(groupWidgets.length, 3);
        gridClass = `grid grid-cols-1 md:grid-cols-${cols} gap-6 mb-8`;
      } else if (group === "detail") {
        gridClass = "grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8";
      }

      sections.push(
        <div key={group} className={gridClass}>
          {groupWidgets.map((id) => (
            <div key={id}>{renderWidget(id)}</div>
          ))}
        </div>
      );
    }

    return sections;
  }

  return (
    <div className="p-6">
      {/* ヘッダー */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ダッシュボード</h1>
          <p className="text-slate-600 text-sm mt-1">運営KPIと業績指標</p>
        </div>

        <div className="flex items-center gap-2">
          {/* カスタマイズボタン */}
          <button
            onClick={() => setShowCustomize(!showCustomize)}
            className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
              showCustomize
                ? "bg-blue-50 border-blue-300 text-blue-700"
                : "border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            カスタマイズ
          </button>

          {/* 日付選択 */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="today">今日</option>
            <option value="yesterday">昨日</option>
            <option value="this_week">今週</option>
            <option value="last_week">先週</option>
            <option value="this_month">今月</option>
            <option value="last_month">先月</option>
            <option value="custom">カスタム範囲</option>
          </select>
          {dateRange === "custom" && (
            <>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <span className="text-slate-600">〜</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </>
          )}
        </div>
      </div>

      {/* カスタマイズパネル */}
      {showCustomize && layout && (
        <div className="mb-8 bg-white rounded-lg shadow p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">ウィジェット配置</h2>
            <div className="flex items-center gap-2">
              {savingLayout && <span className="text-xs text-slate-400">保存中...</span>}
              <button
                onClick={() => {
                  const defaultWidgets = Object.values(WIDGET_GROUPS).flat().map((id) => ({
                    id: id as WidgetId,
                    visible: true,
                  }));
                  saveLayout({ widgets: defaultWidgets });
                }}
                className="text-xs text-blue-600 hover:underline"
              >
                初期状態に戻す
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            ドラッグ&ドロップで並び替え、チェックで表示/非表示を切り替え
          </p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={layout.widgets.map((w) => w.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1">
                {layout.widgets.map((w) => (
                  <SortableWidgetItem key={w.id} widget={w} onToggle={() => toggleWidget(w.id)} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}

      {/* ウィジェット描画 */}
      {renderWidgetGroups()}
    </div>
  );
}

// ドラッグ&ドロップ対応ウィジェット行
function SortableWidgetItem({ widget, onToggle }: { widget: WidgetConfig; onToggle: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widget.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 select-none ${
        isDragging ? "opacity-50 shadow-lg bg-blue-50" : ""
      }`}
    >
      <span
        {...attributes}
        {...listeners}
        className="text-slate-400 text-sm cursor-grab active:cursor-grabbing"
      >
        &#x2630;
      </span>
      <label className="flex items-center gap-2 flex-1 cursor-pointer">
        <input
          type="checkbox"
          checked={widget.visible}
          onChange={onToggle}
          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <span className={`text-sm ${widget.visible ? "text-slate-900" : "text-slate-400 line-through"}`}>
          {WIDGET_LABELS[widget.id]}
        </span>
      </label>
      <span className="text-xs text-slate-400">
        {getGroupForWidget(widget.id) === "kpi_main" && "主要KPI"}
        {getGroupForWidget(widget.id) === "kpi_conversion" && "転換率"}
        {getGroupForWidget(widget.id) === "kpi_today" && "本日"}
        {getGroupForWidget(widget.id) === "chart" && "グラフ"}
        {getGroupForWidget(widget.id) === "detail" && "詳細"}
      </span>
    </div>
  );
}
