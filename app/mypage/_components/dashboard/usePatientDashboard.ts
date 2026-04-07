"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useSearchParams, useRouter } from "next/navigation";
import type {
  PatientDashboardData,
  PatientInfo,
  Reservation,
  ReorderItem,
  Order,
  Carrier,
} from "./types";
import {
  DEFAULT_MP_COLORS,
  DEFAULT_MP_SECTIONS,
  DEFAULT_MP_CONTENT,
  DEFAULT_MP_LABELS,
  PRODUCT_LABELS,
  formatDateTime,
  normalizeTrackingNumber,
  isYamatoCarrier,
  copyText,
  buildTrackingUrl,
} from "./types";
import type { DashboardContextValue } from "./DashboardContext";

// SWRProviderのスコープ外（患者向けページ）なのでfetcherを明示指定
const swrFetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((r) => {
    if (!r.ok) throw new Error("API error");
    return r.json();
  });

export function usePatientDashboard(): {
  loading: boolean;
  error: string | null;
  contextValue: DashboardContextValue | null;
} {
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
  const [showReorderCancelConfirm, setShowReorderCancelConfirm] = useState(false);
  const [cancelingReorder, setCancelingReorder] = useState(false);
  const [showReorderCancelSuccess, setShowReorderCancelSuccess] = useState(false);
  const [multiFieldEnabled, setMultiFieldEnabled] = useState(false);
  const [intakeByField, setIntakeByField] = useState<Record<string, boolean>>({});
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("lope_selected_field") || null;
  });
  // localStorageに選択分野を記憶
  const handleSetSelectedFieldId = useCallback((id: string | null) => {
    setSelectedFieldId(id);
    if (typeof window !== "undefined") {
      if (id) localStorage.setItem("lope_selected_field", id);
      else localStorage.removeItem("lope_selected_field");
    }
  }, []);

  // マイページ設定をSWRで取得
  const { data: settingsData } = useSWR("/api/mypage/settings", swrFetcher, {
    revalidateOnFocus: false,
  });

  // 商品マスタから動的に商品名マップを生成（DBに追加した商品も表示される）
  const { data: productsData } = useSWR<{ products: { code: string; title: string }[] }>(
    "/api/mypage/products",
    swrFetcher,
    { revalidateOnFocus: false }
  );
  const productLabels = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = { ...PRODUCT_LABELS };
    if (productsData?.products) {
      for (const p of productsData.products) {
        map[p.code] = p.title;
      }
    }
    return map;
  }, [productsData]);

  // SWRデータから直接導出
  const mpColors = useMemo(() => settingsData?.config?.colors ?? DEFAULT_MP_COLORS, [settingsData]);
  const mpSections = useMemo(() => settingsData?.config?.sections ?? DEFAULT_MP_SECTIONS, [settingsData]);
  const mpContent = useMemo(() => settingsData?.config?.content ?? DEFAULT_MP_CONTENT, [settingsData]);
  const mpLabels = useMemo(() => settingsData?.config?.labels ?? DEFAULT_MP_LABELS, [settingsData]);
  const reorderRequiresReservation = settingsData?.consultation?.reorderRequiresReservation ?? false;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1200);
  }, []);

  // 再処方の表示用（displayReorder）
  const hasPendingReorder = reorders.some((r) => r.status === "pending");
  const hasConfirmedReorder = reorders.some((r) => r.status === "confirmed");

  const latestPendingReorder = hasPendingReorder
    ? [...reorders]
        .filter((r) => r.status === "pending")
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
    : null;

  const latestConfirmedReorder = hasConfirmedReorder
    ? [...reorders]
        .filter((r) => r.status === "confirmed")
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
    : null;

  const displayReorder = latestConfirmedReorder ?? latestPendingReorder;
  const displayReorderStatus = displayReorder?.status as "pending" | "confirmed" | undefined;

  const initDashboard = useCallback(async () => {
    setLoading(true);

    let finalData: PatientDashboardData = {
      patient: { id: "unknown", displayName: "ゲスト" },
      nextReservation: null,
      activeOrders: [],
      orders: [],
      history: [],
    };

    try {
      let storedReservation: { date?: string; start?: string; reserveId?: string; title?: string } | null = null;

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

      const patient: PatientInfo = {
        id: "unknown",
        displayName: "ゲスト",
      };

      let nextReservation: Reservation | null = null;
      if (storedReservation?.date && storedReservation?.start) {
        const iso = `${storedReservation.date}T${storedReservation.start}:00+09:00`;
        nextReservation = {
          id: storedReservation.reserveId || `local-${storedReservation.date}-${storedReservation.start}`,
          datetime: iso,
          title: storedReservation.title || "オンライン診察予約",
          status: "scheduled",
        };
      }

      finalData = {
        patient,
        nextReservation,
        activeOrders: [],
        orders: [],
        history: [],
      };

      const forceRefresh = searchParams.get("refresh") === "1";
      const mpRes = await fetch("/api/mypage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ refresh: forceRefresh }),
      });

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
        multiFieldEnabled?: boolean;
        patient?: PatientInfo;
        nextReservation?: Reservation | null;
        activeOrders?: Order[];
        orders?: Order[];
        history?: import("./types").PrescriptionHistoryItem[];
        ordersFlags?: import("./types").OrdersFlags;
        reorders?: { id?: unknown; reorder_number?: unknown; timestamp?: unknown; createdAt?: unknown; product_code?: unknown; productCode?: unknown; status?: unknown; note?: unknown; fieldName?: string; fieldColor?: string }[];
        hasIntake?: boolean;
        intakeByField?: Record<string, boolean>;
        intakeId?: string;
        intakeStatus?: string | null;
      };
      console.log("[mypage api]", "activeOrders=", api.activeOrders?.length, "orders=", api.orders?.length);

      const exists = api.hasIntake === true;
      setHasIntake(exists);
      setIntakeStatus(api.intakeStatus ?? null);
      setMultiFieldEnabled(api.multiFieldEnabled === true);
      if (api.intakeByField) setIntakeByField(api.intakeByField as Record<string, boolean>);

      if (typeof window !== "undefined") {
        if (exists) window.localStorage.setItem("has_intake", "1");
        else window.localStorage.removeItem("has_intake");
      }

      if (api?.ok === false) {
        console.error("api/mypage returned ok:false");
        setError("データの取得に失敗しました。");
        return;
      }

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
        orders: api.orders ?? [],
        history: api.history ?? [],
        ordersFlags: api.ordersFlags,
      };

      if (finalData.history.length > 0) {
        finalData.nextReservation = null;
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("last_reservation");
          window.localStorage.setItem("has_intake", "1");
        }
      }

      if (Array.isArray(api.reorders)) {
        const mapped: ReorderItem[] = api.reorders.map((r) => {
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
            fieldName: r.fieldName,
            fieldColor: r.fieldColor,
          };
        });
        setReorders(mapped);
      }

      setData(finalData);
      setError(null);
    } catch (e) {
      console.error(e);
      setError("データの取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }, [router, searchParams]);

  useEffect(() => {
    initDashboard();
  }, [initDashboard]);

  // 予約設定をSWRで取得（期限制御用、予約がある場合のみ）
  const reservationSettingsKey = data?.nextReservation
    ? `/api/reservations?date=${new Date().toISOString().slice(0, 10)}`
    : null;
  const { data: resvSettingsData } = useSWR(reservationSettingsKey, swrFetcher, {
    revalidateOnFocus: false,
  });
  const reservationSettings = resvSettingsData?.settings ?? null;

  // ▼ 日時変更
  const handleChangeReservation = useCallback(() => {
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
  }, [data, router]);

  // ▼ 予約キャンセル
  const handleCancelReservationConfirm = useCallback(async () => {
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

      const result = await res.json().catch(() => ({} as Record<string, unknown>));

      if (!res.ok || result.ok === false) {
        const msg = result.error === "cancel_deadline_passed"
          ? String(result.message || "キャンセルの受付期限を過ぎています。")
          : "キャンセルに失敗しました。時間をおいて再度お試しください。";
        alert(msg);
        return;
      }

      setData((prev) =>
        prev ? { ...prev, nextReservation: null } : prev
      );

      if (typeof window !== "undefined") {
        window.localStorage.removeItem("last_reservation");
      }

      setShowCancelConfirm(false);
      setShowCancelSuccess(true);
      setTimeout(() => setShowCancelSuccess(false), 1200);
    } catch (e) {
      console.error(e);
      alert("キャンセルに失敗しました。時間をおいて再度お試しください。");
    } finally {
      setCanceling(false);
    }
  }, [data, canceling]);

  const handleOpenTracking = useCallback((order: Order) => {
    if (!order.trackingNumber) return;
    const carrier = (order.carrier ?? "yamato") as Carrier;
    const url = buildTrackingUrl(carrier, order.trackingNumber);
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const handleCopyTrackingIfYamato = useCallback(async (order: Order) => {
    if (!order.trackingNumber) return;
    if (!isYamatoCarrier(order.carrier)) return;

    const tn = normalizeTrackingNumber(order.trackingNumber);
    const ok = await copyText(tn);

    if (ok) showToast("追跡番号をコピーしました");
    else showToast("コピーに失敗しました");
  }, [showToast]);

  const handleSaveAddress = useCallback(async (orderId: string) => {
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
      const json = await res.json().catch(() => ({} as Record<string, unknown>));
      if (!res.ok || !json.ok) {
        alert(json.message || json.error || "住所の更新に失敗しました");
        return;
      }
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
  }, [editPostalCode, editAddress, editShippingName, showToast]);

  const handleReorderChange = useCallback(() => {
    router.push("/mypage/purchase?flow=reorder");
  }, [router]);

  const handleReorderCancel = useCallback(async () => {
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

      const json = await res.json().catch(() => ({} as Record<string, unknown>));

      if (!res.ok || json.ok === false) {
        alert("申請のキャンセルに失敗しました。時間をおいて再度お試しください。");
        return;
      }

      setReorders((prev) =>
        prev.map((r) => (r.id === targetId ? { ...r, status: "canceled" } : r))
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
  }, [displayReorder]);

  const handleShowAllHistory = useCallback(async () => {
    if (historyLoading) return;
    setHistoryLoading(true);
    setHistoryError(null);

    try {
      const res = await fetch("/api/mypage/orders", { method: "GET", cache: "no-store" });
      const json = await res.json().catch(() => ({} as Record<string, unknown>));

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
  }, [historyLoading]);

  // Context value の構築
  const contextValue: DashboardContextValue | null = data
    ? {
        data,
        reorders,
        hasIntake,
        intakeStatus,
        mpColors,
        mpSections,
        mpContent,
        mpLabels,
        reorderRequiresReservation,
        reservationSettings,
        showCancelConfirm,
        setShowCancelConfirm,
        showCancelSuccess,
        showReorderCancelConfirm,
        setShowReorderCancelConfirm,
        showReorderCancelSuccess,
        canceling,
        cancelingReorder,
        toast,
        editingAddressOrderId,
        setEditingAddressOrderId,
        editPostalCode,
        setEditPostalCode,
        editAddress,
        setEditAddress,
        editShippingName,
        setEditShippingName,
        addressSaving,
        showAllHistory,
        historyLoading,
        historyError,
        handleChangeReservation,
        handleCancelReservationConfirm,
        handleOpenTracking,
        handleCopyTrackingIfYamato,
        handleSaveAddress,
        handleReorderChange,
        handleReorderCancel,
        handleShowAllHistory,
        showToast,
        productLabels,
        multiFieldEnabled,
        selectedFieldId,
        setSelectedFieldId: handleSetSelectedFieldId,
        intakeByField,
        displayReorder,
        displayReorderStatus,
      }
    : null;

  return { loading, error, contextValue };
}
