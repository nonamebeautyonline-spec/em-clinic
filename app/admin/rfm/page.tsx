"use client";
// RFM分析ページ — 顧客セグメント分析

import { useState, useEffect, useCallback, useMemo } from "react";

/** 顧客RFMデータの型 */
type RfmCustomer = {
  patient_id: number;
  recency: number;
  frequency: number;
  monetary: number;
  rScore: number;
  fScore: number;
  mScore: number;
  segment: string;
};

/** セグメント定義 */
const SEGMENTS = [
  { key: "VIP", label: "VIP", color: "bg-amber-100 text-amber-800 border-amber-300", barColor: "bg-amber-500" },
  { key: "ロイヤル", label: "ロイヤル", color: "bg-purple-100 text-purple-800 border-purple-300", barColor: "bg-purple-500" },
  { key: "育成中", label: "育成中", color: "bg-blue-100 text-blue-800 border-blue-300", barColor: "bg-blue-500" },
  { key: "新規", label: "新規", color: "bg-emerald-100 text-emerald-800 border-emerald-300", barColor: "bg-emerald-500" },
  { key: "休眠", label: "休眠", color: "bg-yellow-100 text-yellow-800 border-yellow-300", barColor: "bg-yellow-500" },
  { key: "離反", label: "離反", color: "bg-red-100 text-red-800 border-red-300", barColor: "bg-red-500" },
  { key: "その他", label: "その他", color: "bg-slate-100 text-slate-600 border-slate-300", barColor: "bg-slate-400" },
] as const;

function getSegmentStyle(segment: string) {
  return SEGMENTS.find((s) => s.key === segment) ?? SEGMENTS[SEGMENTS.length - 1];
}

/** ページサイズ */
const PAGE_SIZE = 20;

export default function RfmPage() {
  const [customers, setCustomers] = useState<RfmCustomer[]>([]);
  const [segmentCounts, setSegmentCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // フィルタ・ページネーション
  const [filterSegment, setFilterSegment] = useState("all");
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/rfm");
      const json = await res.json();
      if (json.ok) {
        setCustomers(json.customers ?? []);
        setSegmentCounts(json.segmentCounts ?? {});
        setTotal(json.total ?? 0);
      } else {
        setError(json.message || "データの取得に失敗しました");
      }
    } catch {
      setError("データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // フィルタ適用後の顧客リスト
  const filteredCustomers = useMemo(() => {
    if (filterSegment === "all") return customers;
    return customers.filter((c) => c.segment === filterSegment);
  }, [customers, filterSegment]);

  // ページネーション計算
  const totalPages = Math.ceil(filteredCustomers.length / PAGE_SIZE);
  const pagedCustomers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredCustomers.slice(start, start + PAGE_SIZE);
  }, [filteredCustomers, page]);

  // フィルタ変更時にページリセット
  useEffect(() => {
    setPage(1);
  }, [filterSegment]);

  const fmt = new Intl.NumberFormat("ja-JP");

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">RFM分析</h1>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <p className="text-slate-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">RFM分析</h1>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <p className="text-4xl mb-4">📊</p>
          <h2 className="text-lg font-semibold text-slate-700 mb-2">データがありません</h2>
          <p className="text-slate-500 text-sm">
            直近1年間の注文データが存在しないため、RFM分析を実行できません。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">RFM分析</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* セグメント分布カード */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {SEGMENTS.map((seg) => {
          const count = segmentCounts[seg.key] ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <button
              key={seg.key}
              onClick={() => setFilterSegment(filterSegment === seg.key ? "all" : seg.key)}
              className={`bg-white rounded-xl shadow-sm border p-4 text-center transition-all hover:shadow-md ${
                filterSegment === seg.key ? "ring-2 ring-emerald-500" : "border-slate-200"
              }`}
            >
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${seg.color}`}
              >
                {seg.label}
              </span>
              <p className="text-xl font-bold text-slate-900">{fmt.format(count)}</p>
              <p className="text-xs text-slate-400">{pct}%</p>
            </button>
          );
        })}
      </div>

      {/* セグメント分布バー */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
        <h2 className="text-sm font-medium text-slate-700 mb-3">セグメント分布</h2>
        <div className="flex rounded-full overflow-hidden h-6">
          {SEGMENTS.map((seg) => {
            const count = segmentCounts[seg.key] ?? 0;
            const pct = total > 0 ? (count / total) * 100 : 0;
            if (pct === 0) return null;
            return (
              <div
                key={seg.key}
                className={`${seg.barColor} relative group`}
                style={{ width: `${pct}%` }}
                title={`${seg.label}: ${count}人 (${Math.round(pct)}%)`}
              >
                {pct > 8 && (
                  <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium">
                    {seg.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {/* 凡例 */}
        <div className="flex flex-wrap gap-3 mt-3">
          {SEGMENTS.map((seg) => {
            const count = segmentCounts[seg.key] ?? 0;
            if (count === 0) return null;
            return (
              <div key={seg.key} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className={`w-3 h-3 rounded-sm ${seg.barColor}`} />
                {seg.label}: {fmt.format(count)}人
              </div>
            );
          })}
        </div>
      </div>

      {/* 顧客テーブル */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* テーブルヘッダー */}
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-700">
            顧客一覧
            <span className="text-slate-400 ml-2">
              ({fmt.format(filteredCustomers.length)}件)
            </span>
          </h2>
          <select
            value={filterSegment}
            onChange={(e) => setFilterSegment(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">全セグメント</option>
            {SEGMENTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* テーブル */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">顧客ID</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-600">R (日数)</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-600">F (回数)</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-600">M (金額)</th>
                <th className="px-4 py-2.5 text-center font-medium text-slate-600">Rスコア</th>
                <th className="px-4 py-2.5 text-center font-medium text-slate-600">Fスコア</th>
                <th className="px-4 py-2.5 text-center font-medium text-slate-600">Mスコア</th>
                <th className="px-4 py-2.5 text-center font-medium text-slate-600">セグメント</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedCustomers.map((c) => {
                const seg = getSegmentStyle(c.segment);
                return (
                  <tr key={c.patient_id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-800 font-mono text-xs">
                      {c.patient_id}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-700">
                      {fmt.format(c.recency)}日
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-700">
                      {fmt.format(c.frequency)}回
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-700">
                      ¥{fmt.format(c.monetary)}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <ScoreBadge score={c.rScore} />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <ScoreBadge score={c.fScore} />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <ScoreBadge score={c.mScore} />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${seg.color}`}
                      >
                        {c.segment}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ページネーション */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {fmt.format((page - 1) * PAGE_SIZE + 1)} -{" "}
              {fmt.format(Math.min(page * PAGE_SIZE, filteredCustomers.length))} /{" "}
              {fmt.format(filteredCustomers.length)}件
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                前へ
              </button>
              {/* ページ番号（最大5つ表示） */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      page === pageNum
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                次へ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** スコアバッジ（1-5をカラーで表示） */
function ScoreBadge({ score }: { score: number }) {
  const colors: Record<number, string> = {
    1: "bg-red-100 text-red-700",
    2: "bg-orange-100 text-orange-700",
    3: "bg-yellow-100 text-yellow-700",
    4: "bg-blue-100 text-blue-700",
    5: "bg-emerald-100 text-emerald-700",
  };
  return (
    <span
      className={`inline-block w-6 h-6 rounded-full text-xs font-bold leading-6 ${colors[score] ?? "bg-slate-100 text-slate-600"}`}
    >
      {score}
    </span>
  );
}
