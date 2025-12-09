// app/doctor/reorders/page.tsx
"use client";

import React, { useEffect, useState } from "react";

type ReorderStatus = "pending" | "confirmed" | "canceled";

interface DoctorReorder {
  id: string;        // GAS上の行番号（"2" とか）
  timestamp: string; // 申請日時
  patientId: string;
  productCode: string;
  status: ReorderStatus;
  note?: string;
}

const PRODUCT_LABELS: Record<string, string> = {
  "MJL_2.5mg_1m": "マンジャロ 2.5mg 1ヶ月",
  "MJL_2.5mg_2m": "マンジャロ 2.5mg 2ヶ月",
  "MJL_2.5mg_3m": "マンジャロ 2.5mg 3ヶ月",
  "MJL_5mg_1m": "マンジャロ 5mg 1ヶ月",
  "MJL_5mg_2m": "マンジャロ 5mg 2ヶ月",
  "MJL_5mg_3m": "マンジャロ 5mg 3ヶ月",
  "MJL_7.5mg_1m": "マンジャロ 7.5mg 1ヶ月",
  "MJL_7.5mg_2m": "マンジャロ 7.5mg 2ヶ月",
  "MJL_7.5mg_3m": "マンジャロ 7.5mg 3ヶ月",
};

const formatDateTime = (v: string) => {
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusLabel = (s: ReorderStatus) => {
  switch (s) {
    case "pending":
      return "申請中";
    case "confirmed":
      return "確認済み";
    case "canceled":
      return "キャンセル";
    default:
      return s;
  }
};

const statusBadgeClass = (s: ReorderStatus) => {
  switch (s) {
    case "pending":
      return "bg-amber-50 text-amber-700 border border-amber-100";
    case "confirmed":
      return "bg-emerald-50 text-emerald-700 border border-emerald-100";
    case "canceled":
      return "bg-slate-50 text-slate-500 border border-slate-200";
    default:
      return "bg-slate-50 text-slate-500 border border-slate-100";
  }
};

export default function DoctorReordersPage() {
  const [items, setItems] = useState<DoctorReorder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchList = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/doctor/reorders");
      const json = await res.json();
      if (!res.ok || json.ok === false) {
        throw new Error(json.error || "一覧の取得に失敗しました");
      }
      const mapped: DoctorReorder[] = (json.reorders || []).map((r: any) => ({
        id: String(r.id),
        timestamp: String(r.timestamp),
        patientId: String(r.patient_id),
        productCode: String(r.product_code),
        status: (r.status || "pending") as ReorderStatus,
        note: r.note || "",
      }));
      setItems(mapped);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "一覧の取得に失敗しました");
    } finally {
      setLoading(false);
      setBusyId(null);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleApprove = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch("/api/doctor/reorders/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok || json.ok === false) {
        throw new Error(json.error || "承認に失敗しました");
      }
      await fetchList();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "承認に失敗しました");
      setBusyId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("この再処方申請をキャンセルしますか？")) return;
    setBusyId(id);
    try {
      const res = await fetch("/api/doctor/reorders/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok || json.ok === false) {
        throw new Error(json.error || "キャンセルに失敗しました");
      }
      await fetchList();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "キャンセルに失敗しました");
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              再処方申請一覧（Dr UI）
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              pending の申請のみ表示中。承認すると status=confirmed、キャンセルで status=canceled に更新されます。
            </p>
          </div>
          <button
            onClick={fetchList}
            className="text-sm px-3 py-1.5 rounded-full border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "更新中..." : "再読み込み"}
          </button>
        </div>
      </header>

      {/* 本文 */}
      <main className="max-w-5xl mx-auto px-4 py-4">
        {error && (
          <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {loading && items.length === 0 ? (
          <div className="text-sm text-slate-600">読み込み中です…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-slate-600">
            現在、再処方の申請はありません。
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const label =
                PRODUCT_LABELS[item.productCode] || item.productCode;
              const isPending = item.status === "pending";
              const isBusy = busyId === item.id;

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-xs text-slate-500">
                        申請ID: {item.id}
                      </div>
                      <span
                        className={
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium " +
                          statusBadgeClass(item.status)
                        }
                      >
                        {statusLabel(item.status)}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-900">
                      {label}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 space-y-0.5">
                      <p>Patient ID: {item.patientId}</p>
                      <p>申請日時: {formatDateTime(item.timestamp)}</p>
                      {item.note && <p>メモ: {item.note}</p>}
                    </div>
                  </div>

                  <div className="mt-2 md:mt-0 flex gap-2 md:flex-col md:items-end">
                    {isPending ? (
                      <>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleApprove(item.id)}
                          className={
                            "px-3 py-1.5 rounded-full text-xs font-semibold text-white " +
                            (isBusy
                              ? "bg-emerald-300 cursor-not-allowed"
                              : "bg-emerald-500 hover:bg-emerald-600")
                          }
                        >
                          {isBusy ? "処理中…" : "承認する"}
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleReject(item.id)}
                          className={
                            "px-3 py-1.5 rounded-full text-xs font-semibold " +
                            (isBusy
                              ? "bg-rose-100 text-rose-400 cursor-not-allowed"
                              : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100")
                          }
                        >
                          {isBusy ? "処理中…" : "キャンセルする"}
                        </button>
                      </>
                    ) : (
                      <span className="text-[11px] text-slate-400">
                        この申請は {statusLabel(item.status)} です。
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
