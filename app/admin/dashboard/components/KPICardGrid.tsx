import { type ReactNode } from "react";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { SensorDescriptor, SensorOptions } from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import type { WidgetSettings, CardOrder, KpiKey, DashboardStats } from "../types";
import { SortableCard } from "./ui/SortableCard";
import { KPICard } from "./ui/KPICard";
import { ConversionCard } from "./ui/ConversionCard";

// SVGアイコンコンポーネント
function Icon({ d }: { d: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

// アイコンパス定義
const ICONS = {
  calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  box: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  yen: "M12 2v20m-5-14l5 5 5-5m-10 4h10",
  refresh: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
  chat: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  clipboard: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  tag: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z",
  plus: "M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z",
  check: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  building: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
} as const;

interface KPICardGridProps {
  stats: DashboardStats | null;
  dateRange: string;
  widgetSettings: WidgetSettings;
  cardOrder: CardOrder;
  sensors: SensorDescriptor<SensorOptions>[];
  handleDragEnd: (group: keyof CardOrder) => (event: DragEndEvent) => void;
}

export function KPICardGrid({
  stats,
  dateRange,
  widgetSettings,
  cardOrder,
  sensors,
  handleDragEnd,
}: KPICardGridProps) {
  const rangePrefix = dateRange === "today" ? "本日の" : dateRange === "yesterday" ? "昨日の" : "";
  const activeOK = stats?.kpi.todayActiveOK || 0;
  const activeNG = stats?.kpi.todayActiveNG || 0;
  const activeNoAnswer = stats?.kpi.todayNoAnswer || 0;
  const activeTotal = stats?.kpi.todayActiveReservations || 0;

  // 全カードの定義マップ
  const cardMap: Record<KpiKey, ReactNode> = {
    kpi_reservations: (
      <KPICard title="予約件数" value={`${stats?.reservations.total || 0}`}
        subtitle={`診察済み: ${stats?.reservations.completed || 0} / 未診察: ${(stats?.reservations.total || 0) - (stats?.reservations.completed || 0) - (stats?.reservations.cancelled || 0)}`}
        icon={<Icon d={ICONS.calendar} />} color="blue" />
    ),
    kpi_shipping: (
      <KPICard title="配送件数" value={`${stats?.shipping.total || 0}`}
        subtitle={`新規: ${stats?.shipping.first || 0} / 再処方: ${stats?.shipping.reorder || 0}`}
        icon={<Icon d={ICONS.box} />} color="green" />
    ),
    kpi_revenue: (
      <KPICard title="純売上" value={`\u00A5${(stats?.revenue.total || 0).toLocaleString()}`}
        subtitle={`カード: \u00A5${(stats?.revenue.square || 0).toLocaleString()} / 振込: \u00A5${(stats?.revenue.bankTransfer || 0).toLocaleString()} / 返金: -\u00A5${(stats?.revenue.refunded || 0).toLocaleString()}`}
        icon={<Icon d={ICONS.yen} />} color="purple" />
    ),
    kpi_repeat_rate: dateRange !== "today" && dateRange !== "yesterday" ? (
      <KPICard title="リピート率" value={`${stats?.patients.repeatRate || 0}%`}
        subtitle={`総患者: ${stats?.patients.total || 0} / 新規: ${stats?.patients.new || 0}`}
        icon={<Icon d={ICONS.refresh} />} color="orange" />
    ) : null,
    kpi_payment_rate: (
      <ConversionCard title={`${rangePrefix}診療後決済率`}
        rate={stats?.kpi.paymentRateAfterConsultation || 0} description={`${rangePrefix}診察完了後に決済した患者の割合`} />
    ),
    kpi_reservation_rate: (
      <ConversionCard title={`${rangePrefix}問診後予約率`}
        rate={stats?.kpi.reservationRateAfterIntake || 0} description={`${rangePrefix}問診完了後に予約した患者の割合`} />
    ),
    kpi_consultation_rate: (
      <ConversionCard title={`${rangePrefix}予約後受診率`}
        rate={stats?.kpi.consultationCompletionRate || 0} description="予約後に診察を完了した患者の割合" />
    ),
    kpi_line_registered: (
      <KPICard title="LINE登録者" value={`${stats?.kpi.lineRegisteredCount || 0}`}
        subtitle="LINE友だち数" icon={<Icon d={ICONS.chat} />} color="green" />
    ),
    kpi_active_reservations: (
      <KPICard title="本日の予約枠" value={`${activeTotal}`}
        subtitle={`診察済み: ${activeOK + activeNG} / 不通: ${activeNoAnswer} / 未診察: ${activeTotal - activeOK - activeNG - activeNoAnswer}`} icon={<Icon d={ICONS.clipboard} />} color="sky" />
    ),
    kpi_avg_order: (
      <KPICard title="顧客単価" value={`\u00A5${(stats?.revenue.avgOrderAmount || 0).toLocaleString()}`}
        subtitle="平均注文額" icon={<Icon d={ICONS.tag} />} color="rose" />
    ),
    kpi_today_reservations: (
      <KPICard title="本日の新規予約" value={`${stats?.kpi.todayNewReservations || 0}`}
        subtitle="本日新たに入った予約数" icon={<Icon d={ICONS.plus} />} color="purple" />
    ),
    kpi_today_paid: (
      <KPICard title="本日の決済" value={`${stats?.kpi.todayPaidCount || 0}`}
        subtitle="決済完了数" icon={<Icon d={ICONS.check} />} color="orange" />
    ),
    kpi_bank_transfer: (
      <KPICard title="銀行振込状況" value={`${(stats?.bankTransfer.pending || 0) + (stats?.bankTransfer.confirmed || 0)}`}
        subtitle={`入金待ち: ${stats?.bankTransfer.pending || 0} / 確認済み: ${stats?.bankTransfer.confirmed || 0}`}
        icon={<Icon d={ICONS.building} />} color="sky" />
    ),
    // チャート・タブ用（ここでは使わない）
    segmentChart: null, conversionChart: null, kpiTargetChart: null, detailTabs: null,
  };

  // 表示対象のカードをフィルタして並び順に取得
  const getVisibleCards = (keys: KpiKey[]) =>
    keys.filter((k) => widgetSettings[k] && cardMap[k]);

  const mainKeys = getVisibleCards(cardOrder.main);
  const convKeys = getVisibleCards(cardOrder.conv);
  const subKeys = getVisibleCards(cardOrder.sub);

  return (
    <>
      {mainKeys.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd("main")}>
          <SortableContext items={mainKeys} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {mainKeys.map((k) => (
                <SortableCard key={k} id={k}>{cardMap[k]}</SortableCard>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
      {convKeys.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd("conv")}>
          <SortableContext items={convKeys} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {convKeys.map((k) => (
                <SortableCard key={k} id={k}>{cardMap[k]}</SortableCard>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
      {subKeys.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd("sub")}>
          <SortableContext items={subKeys} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {subKeys.map((k) => (
                <SortableCard key={k} id={k}>{cardMap[k]}</SortableCard>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </>
  );
}
