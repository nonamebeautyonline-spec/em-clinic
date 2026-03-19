"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
  type IntakeRow,
  type StatusFilter,
  swrFetcher,
  pick,
  pickReserveId,
  normalizeDateStr,
} from "./types";

export function useDoctorList() {
  const [rows, setRows] = useState<IntakeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const todayIso = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);

  const today = useMemo(() => new Date(), []);
  const [weekOffset, setWeekOffset] = useState(0);
  const weekDates = useMemo(() => {
    const start = new Date(today);
    start.setDate(today.getDate() + weekOffset * 7);

    const res: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      res.push(d.toISOString().slice(0, 10));
    }
    return res;
  }, [today, weekOffset]);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");

  // 取得済みの日付を管理（重複取得を避けるため）
  const [loadedDates, setLoadedDates] = useState<Set<string>>(new Set());

  // LINE通話フォーム送信
  const [callFormSentIds, setCallFormSentIds] = useState<Set<string>>(new Set());
  const [lineCallEnabled, setLineCallEnabled] = useState(true);

  // 一覧取得（関数化）
  const fetchList = useCallback(async (fromIso?: string, toIso?: string) => {
    try {
      if (!fromIso || !toIso) {
        const now = new Date();
        const fromDate = new Date(now);
        fromDate.setDate(now.getDate() - 2);
        const toDate = new Date(now);
        toDate.setDate(now.getDate() + 5);

        fromIso = fromDate.toISOString().slice(0, 10);
        toIso = toDate.toISOString().slice(0, 10);
      }

      const r = await fetch(`/api/intake/list?from=${fromIso}&to=${toIso}`, {
        cache: "no-store",
      });
      const res = await r.json();

      let newRows: IntakeRow[] = [];
      if (Array.isArray(res)) {
        newRows = res;
      } else if (res.ok) {
        newRows = res.rows || [];
      } else {
        setErrorMsg(res.error || "一覧取得に失敗しました");
        setLoading(false);
        return;
      }

      const rangeFrom = fromIso!;
      const rangeTo = toIso!;
      setRows((prevRows) => {
        const outsideRange = prevRows.filter((r) => {
          const date = normalizeDateStr(pick(r, ["reserved_date", "予約日"]));
          if (!date) return true;
          return date < rangeFrom || date > rangeTo;
        });
        const newIds = new Set(newRows.map((r) => pickReserveId(r)));
        const kept = outsideRange.filter((r) => !newIds.has(pickReserveId(r)));
        return [...kept, ...newRows];
      });

      const from = new Date(fromIso);
      const to = new Date(toIso);
      setLoadedDates((prev) => {
        const updated = new Set(prev);
        let current = new Date(from);
        while (current <= to) {
          updated.add(current.toISOString().slice(0, 10));
          current.setDate(current.getDate() + 1);
        }
        return updated;
      });

      setLoading(false);
    } catch (e) {
      console.error(e);
      setErrorMsg("一覧取得に失敗しました");
      setLoading(false);
    }
  }, []);

  // 日付選択時：範囲外なら追加取得
  const handleDateSelect = useCallback(
    async (date: string) => {
      setSelectedDate(date);

      if (loadedDates.has(date)) {
        return;
      }

      const targetDate = new Date(date);
      const fromDate = new Date(targetDate);
      fromDate.setDate(targetDate.getDate() - 1);
      const toDate = new Date(targetDate);
      toDate.setDate(targetDate.getDate() + 1);

      const fromIso = fromDate.toISOString().slice(0, 10);
      const toIso = toDate.toISOString().slice(0, 10);

      await fetchList(fromIso, toIso);
    },
    [loadedDates, fetchList]
  );

  // 初回ロード
  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // 診察モード取得（LINE通話フォームボタン表示制御）
  const { data: consultationData } = useSWR(
    "/api/admin/settings?category=consultation",
    swrFetcher,
    { revalidateOnFocus: false }
  );
  useEffect(() => {
    if (!consultationData) return;
    const t = consultationData.settings?.type || "online_all";
    setLineCallEnabled(t !== "online_phone" && t !== "in_person");
  }, [consultationData]);

  const updateRowLocal = useCallback(
    (reserveId: string, updates: Partial<IntakeRow>) => {
      setRows((prev) =>
        prev.map((r) =>
          pickReserveId(r) === reserveId ? { ...r, ...updates } : r
        )
      );
    },
    []
  );

  const now = new Date();

  const isOverdue = useCallback(
    (row: IntakeRow) => {
      const status = pick(row, ["status"]);
      if (status) return false;
      const rawDate = pick(row, ["reserved_date", "予約日"]);
      const timeStr = pick(row, ["reserved_time", "予約時間"]);
      const dateStr = normalizeDateStr(rawDate);
      if (!dateStr || !timeStr) return false;
      const timeHHMM = timeStr.slice(0, 5);
      const dt = new Date(`${dateStr}T${timeHHMM}:00+09:00`);
      dt.setMinutes(dt.getMinutes() + 15);
      return now > dt;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [now]
  );

  const isCurrentSlot = useCallback(
    (row: IntakeRow) => {
      const rawDate = pick(row, ["reserved_date", "予約日"]);
      const timeStr = pick(row, ["reserved_time", "予約時間"]);
      const dateStr = normalizeDateStr(rawDate);
      if (!dateStr || !timeStr) return false;
      const timeHHMM = timeStr.slice(0, 5);
      const dt = new Date(`${dateStr}T${timeHHMM}:00+09:00`);
      const diff = now.getTime() - dt.getTime();
      return diff >= 0 && diff < 15 * 60 * 1000;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [now]
  );

  const sortedRows = useMemo(() => {
    return rows.slice().sort((a, b) => {
      const ad = `${normalizeDateStr(
        pick(a, ["reserved_date", "予約日"])
      )} ${pick(a, ["reserved_time", "予約時間"])}`;
      const bd = `${normalizeDateStr(
        pick(b, ["reserved_date", "予約日"])
      )} ${pick(b, ["reserved_time", "予約時間"])}`;
      return ad > bd ? 1 : -1;
    });
  }, [rows]);

  const filteredRows = useMemo(() => {
    return sortedRows.filter((row) => {
      const raw = pick(row, ["reserved_date", "予約日"]);
      const dateStr = normalizeDateStr(raw);
      if (!dateStr) return false;
      return dateStr === selectedDate;
    });
  }, [sortedRows, selectedDate]);

  const stats = useMemo(() => {
    let pending = 0;
    let ok = 0;
    let ng = 0;
    filteredRows.forEach((row) => {
      const s = (pick(row, ["status"]) || "").toUpperCase();
      if (!s) pending++;
      else if (s === "OK") ok++;
      else if (s === "NG") ng++;
    });
    return { pending, ok, ng };
  }, [filteredRows]);

  const visibleRows = useMemo(() => {
    return filteredRows.filter((row) => {
      const s = (pick(row, ["status"]) || "").toUpperCase();
      if (statusFilter === "all") return true;
      if (statusFilter === "pending") return !s;
      if (statusFilter === "ok") return s === "OK";
      if (statusFilter === "ng") return s === "NG";
      return true;
    });
  }, [filteredRows, statusFilter]);

  return {
    rows,
    loading,
    errorMsg,
    selectedDate,
    today,
    weekOffset,
    setWeekOffset,
    weekDates,
    statusFilter,
    setStatusFilter,
    callFormSentIds,
    setCallFormSentIds,
    lineCallEnabled,
    fetchList,
    handleDateSelect,
    updateRowLocal,
    isOverdue,
    isCurrentSlot,
    visibleRows,
    stats,
  };
}
