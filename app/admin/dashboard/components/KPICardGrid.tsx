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
        icon="\u{1F4C5}" color="blue" />
    ),
    kpi_shipping: (
      <KPICard title="配送件数" value={`${stats?.shipping.total || 0}`}
        subtitle={`新規: ${stats?.shipping.first || 0} / 再処方: ${stats?.shipping.reorder || 0}`}
        icon="\u{1F4E6}" color="green" />
    ),
    kpi_revenue: (
      <KPICard title="純売上" value={`\u00A5${(stats?.revenue.total || 0).toLocaleString()}`}
        subtitle={`カード: \u00A5${(stats?.revenue.square || 0).toLocaleString()} / 振込: \u00A5${(stats?.revenue.bankTransfer || 0).toLocaleString()} / 返金: -\u00A5${(stats?.revenue.refunded || 0).toLocaleString()}`}
        icon="\u{1F4B0}" color="purple" />
    ),
    kpi_repeat_rate: dateRange !== "today" && dateRange !== "yesterday" ? (
      <KPICard title="リピート率" value={`${stats?.patients.repeatRate || 0}%`}
        subtitle={`総患者: ${stats?.patients.total || 0} / 新規: ${stats?.patients.new || 0}`}
        icon="\u{1F504}" color="orange" />
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
        subtitle="LINE友だち数" icon="\u{1F4AC}" color="green" />
    ),
    kpi_active_reservations: (
      <KPICard title="本日の予約枠" value={`${activeTotal}`}
        subtitle={`診察済み: ${activeOK + activeNG} / 不通: ${activeNoAnswer} / 未診察: ${activeTotal - activeOK - activeNG - activeNoAnswer}`} icon="\u{1F4CB}" color="sky" />
    ),
    kpi_avg_order: (
      <KPICard title="顧客単価" value={`\u00A5${(stats?.revenue.avgOrderAmount || 0).toLocaleString()}`}
        subtitle="平均注文額" icon="\u{1F48E}" color="rose" />
    ),
    kpi_today_reservations: (
      <KPICard title="本日の新規予約" value={`${stats?.kpi.todayNewReservations || 0}`}
        subtitle="本日新たに入った予約数" icon="\u{1F4DD}" color="purple" />
    ),
    kpi_today_paid: (
      <KPICard title="本日の決済" value={`${stats?.kpi.todayPaidCount || 0}`}
        subtitle="決済完了数" icon="\u2705" color="orange" />
    ),
    kpi_bank_transfer: (
      <KPICard title="銀行振込状況" value={`${(stats?.bankTransfer.pending || 0) + (stats?.bankTransfer.confirmed || 0)}`}
        subtitle={`入金待ち: ${stats?.bankTransfer.pending || 0} / 確認済み: ${stats?.bankTransfer.confirmed || 0}`}
        icon="\u{1F3E6}" color="sky" />
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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
