"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import useSWR from "swr";
import {
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import {
  type WidgetSettings,
  type CardOrder,
  type KpiKey,
  DEFAULT_WIDGET_SETTINGS,
  DEFAULT_CARD_ORDER,
  saveWidgetSettings,
} from "../types";

export function useWidgetSettings() {
  const [widgetSettings, setWidgetSettings] = useState<WidgetSettings>(DEFAULT_WIDGET_SETTINGS);
  const [cardOrder, setCardOrder] = useState<CardOrder>(DEFAULT_CARD_ORDER);
  const [showWidgetMenu, setShowWidgetMenu] = useState(false);
  const widgetMenuRef = useRef<HTMLDivElement>(null);

  // dnd-kit センサー
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // ウィジェット設定をSWRで取得
  const { data: widgetData } = useSWR<{ enhancedWidgets?: WidgetSettings & { cardOrder?: CardOrder } }>(
    "/api/admin/dashboard-layout?scope=enhanced",
    { revalidateOnFocus: false },
  );

  useEffect(() => {
    if (!widgetData) return;
    const settings = widgetData.enhancedWidgets
      ? { ...DEFAULT_WIDGET_SETTINGS, ...widgetData.enhancedWidgets }
      : DEFAULT_WIDGET_SETTINGS;
    const order = widgetData.enhancedWidgets?.cardOrder
      ? { ...DEFAULT_CARD_ORDER, ...widgetData.enhancedWidgets.cardOrder }
      : DEFAULT_CARD_ORDER;
    setWidgetSettings(settings);
    setCardOrder(order);
  }, [widgetData]);

  // ウィジェット設定の変更ハンドラ
  const toggleWidget = useCallback((key: keyof WidgetSettings) => {
    setWidgetSettings((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      setCardOrder((currentOrder) => {
        saveWidgetSettings(next, currentOrder);
        return currentOrder;
      });
      return next;
    });
  }, []);

  // ドラッグ終了ハンドラ
  const handleDragEnd = useCallback((group: keyof CardOrder) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setCardOrder((prev) => {
      const oldIndex = prev[group].indexOf(active.id as KpiKey);
      const newIndex = prev[group].indexOf(over.id as KpiKey);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const next = { ...prev, [group]: arrayMove(prev[group], oldIndex, newIndex) };
      setWidgetSettings((currentSettings) => {
        saveWidgetSettings(currentSettings, next);
        return currentSettings;
      });
      return next;
    });
  }, []);

  // メニュー外クリックで閉じるハンドラ
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (widgetMenuRef.current && !widgetMenuRef.current.contains(e.target as Node)) {
      setShowWidgetMenu(false);
    }
  }, []);

  useEffect(() => {
    if (showWidgetMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showWidgetMenu, handleClickOutside]);

  return {
    widgetSettings,
    cardOrder,
    showWidgetMenu,
    setShowWidgetMenu,
    widgetMenuRef,
    sensors,
    toggleWidget,
    handleDragEnd,
  };
}
