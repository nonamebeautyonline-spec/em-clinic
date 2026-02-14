"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { formatFullDateTimeJST, calcAge } from "@/lib/patient-utils";

type KarteItem = {
  id: number;
  patientId: string;
  patientName: string;
  tel: string;
  sex: string;
  birthday: string;
  reservedDate: string;
  reservedTime: string;
  createdAt: string;
  updatedAt: string;
  status: string | null;
  prescriptionMenu: string;
  hasNote: boolean;
};

// JST今日の日付をYYYY-MM-DD形式で取得
function getTodayJST() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

export default function KarteListPage() {
  const router = useRouter();
  const [items, setItems] = useState<KarteItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDate, setFilterDate] = useState<string>(getTodayJST()); // 当日デフォルト
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchData = useCallback(async (p: number, l: number, q: string, date: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(l) });
      if (q) params.set("q", q);
      if (date) params.set("date", date);
      const res = await fetch(`/api/admin/kartelist?${params}`);
      const json = await res.json();
      if (json.ok) {
        setItems(json.items || []);
        setTotal(json.total || 0);
      }
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(page, limit, searchQuery, filterDate);
  }, [page, limit, filterDate, fetchData]); // searchQuery handled by debounce

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchData(1, limit, val, filterDate);
    }, 300);
  };

  const totalPages = Math.ceil(total / limit);
  const fromItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const toItem = Math.min(page * limit, total);

  // ページネーション番号生成
  const pageNumbers: number[] = [];
  const maxVisible = 5;
  let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
  const endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage + 1 < maxVisible) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }
  for (let i = startPage; i <= endPage; i++) pageNumbers.push(i);

  const formatReserved = (date: string, time: string) => {
    if (!date) return "-";
    const d = date.replace(/-/g, "/");
    // 年を除いた短い日付
    const parts = d.split("/");
    const short = parts.length >= 3 ? `${parts[1]}/${parts[2]}` : d;
    return time ? `${date} ${time}` : date;
  };

  const formatTel = (tel: string) => {
    if (!tel) return "-";
    // 11桁なら xxx-xxxx-xxxx 形式
    const digits = tel.replace(/\D/g, "");
    if (digits.length === 11) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    }
    return tel;
  };

  return (
    <div className="min-h-full bg-gray-50 p-6">
      {/* ヘッダー */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">カルテ一覧</h1>
      </div>

      {/* 検索 + テーブル カード */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {/* 検索バー + 日付フィルター */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-xl">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="カルテ検索(カルテ本文・カルテ執筆者名・施術名・薬剤名・物品名で検索)"
                className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none transition"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => handleSearchChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => { setFilterDate(e.target.value); setPage(1); }}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none transition"
              />
              <button
                onClick={() => { setFilterDate(getTodayJST()); setPage(1); }}
                className={`px-3 py-2 text-xs rounded-lg border transition ${filterDate === getTodayJST() ? "bg-red-50 border-red-300 text-red-700" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
              >
                今日
              </button>
              <button
                onClick={() => { setFilterDate(""); setPage(1); }}
                className={`px-3 py-2 text-xs rounded-lg border transition ${!filterDate ? "bg-red-50 border-red-300 text-red-700" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
              >
                全件
              </button>
            </div>
          </div>
        </div>

        {/* テーブル */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">カルテ番号</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">来院者名</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">予約日時</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">
                  <span className="flex items-center gap-1">
                    作成日時
                    <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">更新日時</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">ステータス</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">電話番号</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      読み込み中...
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    {searchQuery ? "検索結果がありません" : filterDate ? `${filterDate} のカルテはありません` : "カルテデータがありません"}
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const age = calcAge(item.birthday);
                  return (
                    <tr
                      key={item.id}
                      onClick={() => router.push(`/admin/patients/${item.patientId}`)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs whitespace-nowrap">
                        {item.patientId || "-"}
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-medium whitespace-nowrap">
                        {item.patientName || "-"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                        {formatReserved(item.reservedDate, item.reservedTime)}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                        {formatFullDateTimeJST(item.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                        {formatFullDateTimeJST(item.updatedAt)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {item.status === "OK" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">OK</span>
                        ) : item.status === "NG" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">NG</span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                        {formatTel(item.tel)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ページネーション */}
        {total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">ページあたりの行数:</span>
              <select
                value={limit}
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-red-400 outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">
                {fromItem}〜{toItem} / {total}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
