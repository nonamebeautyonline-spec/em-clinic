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
    pending: number;
    delayed: number;
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

type TabType = "overview" | "reservations" | "revenue" | "patients";

export default function EnhancedDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateRange, setDateRange] = useState("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("overview");

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

  const getRangeLabelJa = () => {
    const labels: Record<string, string> = {
      today: "今日",
      yesterday: "昨日",
      this_week: "今週",
      last_week: "先週",
      this_month: "今月",
      last_month: "先月",
      custom: `${startDate} 〜 ${endDate}`,
    };
    return labels[dateRange] || "今日";
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">ダッシュボード</h1>
          <p className="text-slate-500 text-sm mt-1">{getRangeLabelJa()}の運営指標</p>
        </div>

        {/* 日付選択 */}
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
          >
            <option value="today">今日</option>
            <option value="yesterday">昨日</option>
            <option value="this_week">今週</option>
            <option value="last_week">先週</option>
            <option value="this_month">今月</option>
            <option value="last_month">先月</option>
            <option value="custom">カスタム</option>
          </select>

          {dateRange === "custom" && (
            <>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-slate-400">〜</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg text-red-700">
          {error}
        </div>
      )}

      {/* メインKPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="総売上"
          value={`¥${(stats?.revenue.total || 0).toLocaleString()}`}
          subtitle={`平均 ¥${(stats?.revenue.avgOrderAmount || 0).toLocaleString()}`}
          icon="💰"
          color="blue"
        />
        <KPICard
          title="LINE登録者"
          value={`${stats?.kpi.lineRegisteredCount || 0}`}
          subtitle="LINE友だち数"
          icon="💬"
          color="green"
        />
        <KPICard
          title="本日の予約"
          value={`${stats?.kpi.todayNewReservations || 0}`}
          subtitle="新規予約数"
          icon="📅"
          color="purple"
        />
        <KPICard
          title="本日の決済"
          value={`${stats?.kpi.todayPaidCount || 0}`}
          subtitle="決済完了数"
          icon="✅"
          color="orange"
        />
      </div>

      {/* 転換率KPI */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-slate-900 mb-4">転換率</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ConversionCard
            title="診療後の決済率"
            rate={stats?.kpi.paymentRateAfterConsultation || 0}
            description="診察完了後に決済した患者の割合"
          />
          <ConversionCard
            title="問診後の予約率"
            rate={stats?.kpi.reservationRateAfterIntake || 0}
            description="問診完了後に予約した患者の割合"
          />
          <ConversionCard
            title="予約後の受診率"
            rate={stats?.kpi.consultationCompletionRate || 0}
            description="予約後に診察を完了した患者の割合"
          />
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="border-b border-slate-200">
          <nav className="flex -mb-px">
            <TabButton
              active={activeTab === "overview"}
              onClick={() => setActiveTab("overview")}
              label="概要"
            />
            <TabButton
              active={activeTab === "reservations"}
              onClick={() => setActiveTab("reservations")}
              label="予約・配送"
            />
            <TabButton
              active={activeTab === "revenue"}
              onClick={() => setActiveTab("revenue")}
              label="売上・商品"
            />
            <TabButton
              active={activeTab === "patients"}
              onClick={() => setActiveTab("patients")}
              label="患者"
            />
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 銀行振込状況 */}
              <div>
                <h3 className="text-md font-bold text-slate-900 mb-4">銀行振込状況</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <span className="text-sm font-medium text-yellow-900">入金待ち</span>
                    <span className="text-2xl font-bold text-yellow-900">
                      {stats?.bankTransfer.pending || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                    <span className="text-sm font-medium text-green-900">確認済み</span>
                    <span className="text-2xl font-bold text-green-900">
                      {stats?.bankTransfer.confirmed || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* クイック統計 */}
              <div>
                <h3 className="text-md font-bold text-slate-900 mb-4">その他統計</h3>
                <div className="space-y-3">
                  <StatRow label="リピート率" value={`${stats?.patients.repeatRate || 0}%`} />
                  <StatRow label="総患者数" value={`${stats?.patients.total || 0}人`} />
                  <StatRow label="新規患者" value={`${stats?.patients.new || 0}人`} />
                  <StatRow label="キャンセル率" value={`${stats?.reservations.cancelRate || 0}%`} />
                </div>
              </div>
            </div>
          )}

          {activeTab === "reservations" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-md font-bold text-slate-900 mb-4">予約</h3>
                <div className="space-y-3">
                  <StatRow label="総予約数" value={`${stats?.reservations.total || 0}件`} />
                  <StatRow label="完了" value={`${stats?.reservations.completed || 0}件`} />
                  <StatRow label="キャンセル" value={`${stats?.reservations.cancelled || 0}件`} />
                  <StatRow
                    label="キャンセル率"
                    value={`${stats?.reservations.cancelRate || 0}%`}
                    highlight="red"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-md font-bold text-slate-900 mb-4">配送</h3>
                <div className="space-y-3">
                  <StatRow label="総配送数" value={`${stats?.shipping.total || 0}件`} />
                  <StatRow label="新規" value={`${stats?.shipping.first || 0}件`} />
                  <StatRow label="再処方" value={`${stats?.shipping.reorder || 0}件`} />
                  <StatRow
                    label="未発送"
                    value={`${stats?.shipping.pending || 0}件`}
                    highlight="orange"
                  />
                  <StatRow
                    label="遅延"
                    value={`${stats?.shipping.delayed || 0}件`}
                    highlight="red"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "revenue" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard label="総売上" value={`¥${(stats?.revenue.total || 0).toLocaleString()}`} />
                <StatCard
                  label="カード決済"
                  value={`¥${(stats?.revenue.square || 0).toLocaleString()}`}
                />
                <StatCard
                  label="銀行振込"
                  value={`¥${(stats?.revenue.bankTransfer || 0).toLocaleString()}`}
                />
              </div>

              <div>
                <h3 className="text-md font-bold text-slate-900 mb-4">商品別売上</h3>
                <div className="space-y-2">
                  {stats?.products.map((product) => (
                    <div
                      key={product.code}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <div>
                        <div className="text-sm font-medium text-slate-900">{product.name}</div>
                        <div className="text-xs text-slate-500">{product.code}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-md font-bold text-slate-900">
                          ¥{product.revenue.toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-500">{product.count}件</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "patients" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-md font-bold text-slate-900 mb-4">患者統計</h3>
                <div className="space-y-3">
                  <StatRow label="総患者数" value={`${stats?.patients.total || 0}人`} />
                  <StatRow label="アクティブ患者" value={`${stats?.patients.active || 0}人`} />
                  <StatRow label="新規患者" value={`${stats?.patients.new || 0}人`} />
                  <StatRow
                    label="リピート率"
                    value={`${stats?.patients.repeatRate || 0}%`}
                    highlight="green"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-md font-bold text-slate-900 mb-4">エンゲージメント</h3>
                <div className="space-y-3">
                  <StatRow label="LINE登録者" value={`${stats?.kpi.lineRegisteredCount || 0}人`} />
                  <StatRow
                    label="問診後の予約率"
                    value={`${stats?.kpi.reservationRateAfterIntake || 0}%`}
                  />
                  <StatRow
                    label="予約後の受診率"
                    value={`${stats?.kpi.consultationCompletionRate || 0}%`}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface KPICardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  color: "blue" | "green" | "purple" | "orange";
}

function KPICard({ title, value, subtitle, icon, color }: KPICardProps) {
  const colorClasses = {
    blue: "border-blue-500 bg-blue-50",
    green: "border-green-500 bg-green-50",
    purple: "border-purple-500 bg-purple-50",
    orange: "border-orange-500 bg-orange-50",
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 border-l-4 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium text-slate-600">{title}</div>
        <div className="text-2xl">{icon}</div>
      </div>
      <div className="text-3xl font-bold text-slate-900 mb-1">{value}</div>
      <div className="text-xs text-slate-500">{subtitle}</div>
    </div>
  );
}

interface ConversionCardProps {
  title: string;
  rate: number;
  description: string;
}

function ConversionCard({ title, rate, description }: ConversionCardProps) {
  const getRateColor = (rate: number) => {
    if (rate >= 80) return "text-green-600";
    if (rate >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="bg-gradient-to-br from-white to-slate-50 rounded-lg shadow-sm p-6 border border-slate-200">
      <div className="text-sm font-medium text-slate-600 mb-3">{title}</div>
      <div className={`text-4xl font-bold mb-2 ${getRateColor(rate)}`}>{rate}%</div>
      <div className="text-xs text-slate-500">{description}</div>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
}

function TabButton({ active, onClick, label }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
        active
          ? "border-blue-500 text-blue-600"
          : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
      }`}
    >
      {label}
    </button>
  );
}

interface StatRowProps {
  label: string;
  value: string;
  highlight?: "red" | "orange" | "green";
}

function StatRow({ label, value, highlight }: StatRowProps) {
  const highlightClasses = {
    red: "text-red-600",
    orange: "text-orange-600",
    green: "text-green-600",
  };

  return (
    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={`text-sm font-bold ${highlight ? highlightClasses[highlight] : "text-slate-900"}`}>
        {value}
      </span>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-6 border border-slate-200">
      <div className="text-xs font-medium text-slate-500 mb-2">{label}</div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}
