"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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
    total: number;
    avgOrderAmount: number;
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
    todayNewReservations: number;
    todayPaidCount: number;
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateRange, setDateRange] = useState("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin/login");
      return;
    }

    loadStats(token);
  }, [router, dateRange, startDate, endDate]);

  const loadStats = async (token: string) => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ range: dateRange });
      if (dateRange === "custom" && startDate && endDate) {
        params.append("start", startDate);
        params.append("end", endDate);
      }

      const res = await fetch(`/api/admin/dashboard-stats-enhanced?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("データ取得失敗");
      }

      const data = await res.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-slate-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* ヘッダー */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ダッシュボード</h1>
          <p className="text-slate-600 text-sm mt-1">運営KPIと業績指標</p>
        </div>

        {/* 日付選択 */}
        <div className="flex items-center gap-2">
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
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-slate-600">〜</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}

      {/* KPI カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* 予約件数 */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="text-sm text-slate-600 mb-2">予約</div>
          <div className="text-3xl font-bold text-slate-900">{stats?.reservations.total || 0}</div>
          <div className="text-xs text-slate-500 mt-2">
            完了: {stats?.reservations.completed || 0} / キャンセル: {stats?.reservations.cancelled || 0}
          </div>
          <div className="text-xs text-red-600 mt-1">
            キャンセル率: {stats?.reservations.cancelRate || 0}%
          </div>
        </div>

        {/* 配送件数 */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="text-sm text-slate-600 mb-2">配送</div>
          <div className="text-3xl font-bold text-slate-900">{stats?.shipping.total || 0}</div>
          <div className="text-xs text-slate-500 mt-2">
            新規: {stats?.shipping.first || 0} / 再処方: {stats?.shipping.reorder || 0}
          </div>
        </div>

        {/* 売上 */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <div className="text-sm text-slate-600 mb-2">売上</div>
          <div className="text-3xl font-bold text-slate-900">
            ¥{(stats?.revenue.total || 0).toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            カード: ¥{(stats?.revenue.square || 0).toLocaleString()} / 振込: ¥
            {(stats?.revenue.bankTransfer || 0).toLocaleString()}
          </div>
          <div className="text-xs text-blue-600 mt-1">
            平均注文額: ¥{(stats?.revenue.avgOrderAmount || 0).toLocaleString()}
          </div>
        </div>

        {/* リピート率 */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
          <div className="text-sm text-slate-600 mb-2">リピート率</div>
          <div className="text-3xl font-bold text-slate-900">{stats?.patients.repeatRate || 0}%</div>
          <div className="text-xs text-slate-500 mt-2">
            総患者: {stats?.patients.total || 0} / アクティブ: {stats?.patients.active || 0}
          </div>
          <div className="text-xs text-green-600 mt-1">
            新規患者: {stats?.patients.new || 0}
          </div>
        </div>
      </div>

      {/* 新しいKPI カード（転換率） */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* 診療後の決済率 */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-cyan-500">
          <div className="text-sm text-slate-600 mb-2">診療後の決済率</div>
          <div className="text-3xl font-bold text-slate-900">{stats?.kpi.paymentRateAfterConsultation || 0}%</div>
          <div className="text-xs text-slate-500 mt-2">
            診察完了後に決済した患者の割合
          </div>
        </div>

        {/* 問診後の予約率 */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-500">
          <div className="text-sm text-slate-600 mb-2">問診後の予約率</div>
          <div className="text-3xl font-bold text-slate-900">{stats?.kpi.reservationRateAfterIntake || 0}%</div>
          <div className="text-xs text-slate-500 mt-2">
            問診完了後に予約した患者の割合
          </div>
        </div>

        {/* 予約後の受診率 */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-teal-500">
          <div className="text-sm text-slate-600 mb-2">予約後の受診率</div>
          <div className="text-3xl font-bold text-slate-900">{stats?.kpi.consultationCompletionRate || 0}%</div>
          <div className="text-xs text-slate-500 mt-2">
            予約後に診察を完了した患者の割合
          </div>
        </div>
      </div>

      {/* 本日の活動KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* LINE登録者数 */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-emerald-500">
          <div className="text-sm text-slate-600 mb-2">LINE登録者数</div>
          <div className="text-3xl font-bold text-slate-900">{stats?.kpi.lineRegisteredCount || 0}</div>
          <div className="text-xs text-slate-500 mt-2">
            LINE連携済みの患者数
          </div>
        </div>

        {/* 本日の予約数 */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-sky-500">
          <div className="text-sm text-slate-600 mb-2">本日の予約数</div>
          <div className="text-3xl font-bold text-slate-900">{stats?.kpi.todayNewReservations || 0}</div>
          <div className="text-xs text-slate-500 mt-2">
            今日作成された予約の数
          </div>
        </div>

        {/* 本日の決済人数 */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-violet-500">
          <div className="text-sm text-slate-600 mb-2">本日の決済人数</div>
          <div className="text-3xl font-bold text-slate-900">{stats?.kpi.todayPaidCount || 0}</div>
          <div className="text-xs text-slate-500 mt-2">
            今日決済した患者の数
          </div>
        </div>

        {/* 顧客単価 */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-rose-500">
          <div className="text-sm text-slate-600 mb-2">顧客単価</div>
          <div className="text-3xl font-bold text-slate-900">
            ¥{(stats?.revenue.avgOrderAmount || 0).toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            平均注文額
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 商品別売上 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">商品別売上</h2>
          <div className="space-y-3">
            {stats?.products.map((product) => (
              <div key={product.code} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{product.name}</div>
                  <div className="text-xs text-slate-600">{product.code}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-900">
                    ¥{product.revenue.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-600">{product.count}件</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 銀行振込状況 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">銀行振込状況</h2>
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
        </div>
      </div>
    </div>
  );
}
