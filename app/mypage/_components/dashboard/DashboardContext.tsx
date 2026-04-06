"use client";

import React, { createContext, useContext } from "react";
import type { PatientDashboardData, ReorderItem } from "./types";

export interface DashboardContextValue {
  // データ
  data: PatientDashboardData;
  reorders: ReorderItem[];
  hasIntake: boolean | null;
  intakeStatus: string | null;

  // マイページ設定
  mpColors: { primary: string; primaryHover: string; primaryLight: string; pageBg: string; primaryText: string };
  mpSections: { showIntake: boolean; showReserveButton: boolean; showReservation: boolean; showOrders: boolean; showReorder: boolean; showHistory: boolean; showSupport: boolean; showPointCard: boolean; showExport: boolean; showFieldSelect: boolean; showFieldBadges: boolean };
  mpContent: { clinicName: string; logoUrl: string; supportMessage: string; supportUrl: string; supportButtonLabel: string; supportNote: string };
  mpLabels: {
    intakeButtonLabel: string; intakeCompleteText: string; intakeGuideText: string; intakeNoteText: string;
    reserveButtonLabel: string; purchaseButtonLabel: string; reorderButtonLabel: string;
    reservationTitle: string; ordersTitle: string; historyTitle: string; supportTitle: string;
    noOrdersText: string; noHistoryText: string;
    phoneNotice: string; cancelNotice: string;
  };
  reorderRequiresReservation: boolean;

  // 予約設定
  reservationSettings: { change_deadline_hours: number; cancel_deadline_hours: number } | null;

  // モーダル state
  showCancelConfirm: boolean;
  setShowCancelConfirm: React.Dispatch<React.SetStateAction<boolean>>;
  showCancelSuccess: boolean;
  showReorderCancelConfirm: boolean;
  setShowReorderCancelConfirm: React.Dispatch<React.SetStateAction<boolean>>;
  showReorderCancelSuccess: boolean;
  canceling: boolean;
  cancelingReorder: boolean;
  toast: string | null;

  // 住所編集 state
  editingAddressOrderId: string | null;
  setEditingAddressOrderId: React.Dispatch<React.SetStateAction<string | null>>;
  editPostalCode: string;
  setEditPostalCode: React.Dispatch<React.SetStateAction<string>>;
  editAddress: string;
  setEditAddress: React.Dispatch<React.SetStateAction<string>>;
  editShippingName: string;
  setEditShippingName: React.Dispatch<React.SetStateAction<string>>;
  addressSaving: boolean;

  // 履歴 state
  showAllHistory: boolean;
  historyLoading: boolean;
  historyError: string | null;

  // ハンドラ
  handleChangeReservation: () => void;
  handleCancelReservationConfirm: () => Promise<void>;
  handleOpenTracking: (order: import("./types").Order) => void;
  handleCopyTrackingIfYamato: (order: import("./types").Order) => Promise<void>;
  handleSaveAddress: (orderId: string) => Promise<void>;
  handleReorderChange: () => void;
  handleReorderCancel: () => Promise<void>;
  handleShowAllHistory: () => Promise<void>;
  showToast: (msg: string) => void;

  // 商品名マップ（DB商品マスタ連動）
  productLabels: Record<string, string>;

  // マルチ分野モード
  multiFieldEnabled: boolean;
  selectedFieldId: string | null;
  setSelectedFieldId: (id: string | null) => void;

  // 導出値
  displayReorder: ReorderItem | null;
  displayReorderStatus: "pending" | "confirmed" | undefined;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({
  value,
  children,
}: {
  value: DashboardContextValue;
  children: React.ReactNode;
}) {
  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboardContext(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboardContext は DashboardProvider 内で使用してください");
  }
  return ctx;
}
