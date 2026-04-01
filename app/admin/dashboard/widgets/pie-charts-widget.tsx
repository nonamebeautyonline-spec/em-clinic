"use client";

// ダッシュボード円グラフウィジェット
// 1. 患者ファネル 2. 新規/再処方 3. 決済方法内訳

import useSWR from "swr";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ファネルの色（8色すべて明確に区別）
const FUNNEL_COLORS: Record<string, string> = {
  "ブロック": "#EF4444",         // レッド
  "LINE追加のみ": "#94A3B8",    // グレー
  "個人情報入力済み": "#38BDF8", // スカイブルー
  "電話番号認証済み": "#6366F1", // インディゴ
  "問診済み": "#A855F7",         // パープル
  "予約済み": "#F59E0B",         // アンバー
  "診察済み": "#EC4899",         // ピンク
  "決済済み": "#10B981",         // エメラルド
};

// 処方の色
const PRESCRIPTION_COLORS = ["#3B82F6", "#F97316"]; // ブルー, オレンジ

// 決済方法の色
const PAYMENT_COLORS = ["#8B5CF6", "#22C55E"]; // バイオレット（カード）, グリーン（振込）

interface FunnelItem {
  label: string;
  count: number;
}

interface PieChartData {
  funnel: FunnelItem[];
  prescription: { newPrescription: number; rePrescription: number };
  paymentMethod: { creditCard: number; bankTransfer: number; creditCardAmount: number; bankTransferAmount: number };
}

// カスタムツールチップ
function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: { name: string; value: number; color: string; percent?: number } }[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: data.color }} />
        <span className="font-semibold text-slate-900">{data.name}</span>
      </div>
      <div className="mt-1 text-slate-600">
        {data.value.toLocaleString()}人
        {data.percent !== undefined && ` (${(data.percent * 100).toFixed(1)}%)`}
      </div>
    </div>
  );
}

// 決済方法ツールチップ（金額付き）
function PaymentTooltip({ active, payload, creditCardAmount, bankTransferAmount }: {
  active?: boolean;
  payload?: { payload: { name: string; value: number; color: string; percent?: number } }[];
  creditCardAmount: number;
  bankTransferAmount: number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  const amount = data.name === "銀行振込" ? bankTransferAmount : creditCardAmount;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: data.color }} />
        <span className="font-semibold text-slate-900">{data.name}</span>
      </div>
      <div className="mt-1 space-y-0.5 text-slate-600">
        <div>{data.value.toLocaleString()}件{data.percent !== undefined && ` (${(data.percent * 100).toFixed(1)}%)`}</div>
        <div>¥{amount.toLocaleString()}</div>
      </div>
    </div>
  );
}

// 内側ラベル（人数表示）
function renderInnerLabel({ cx, cy, midAngle, innerRadius, outerRadius, value, percent }: {
  cx?: number; cy?: number; midAngle?: number; innerRadius?: number; outerRadius?: number; value?: number; percent?: number;
}) {
  if (!percent || percent < 0.05) return null;
  if (cx == null || cy == null || midAngle == null || innerRadius == null || outerRadius == null) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {value?.toLocaleString()}
    </text>
  );
}

// 凡例コンポーネント
function ChartLegend({ items, unit = "人" }: { items: { name: string; value: number; color: string }[]; unit?: string }) {
  return (
    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs items-start pt-1">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
          <span className="text-slate-600">{item.name}</span>
          <span className="text-slate-400 font-medium">{item.value.toLocaleString()}{unit}</span>
        </div>
      ))}
    </div>
  );
}

// 個別の円グラフカード（高さ統一）
function PieChartCard({ title, subtitle, children, isEmpty }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  isEmpty?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col h-[360px]">
      <div className="mb-1 shrink-0">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {isEmpty ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
          データがありません
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col">{children}</div>
      )}
    </div>
  );
}

export default function PieChartsWidget() {
  const { data, error, isLoading } = useSWR<PieChartData>("/api/admin/dashboard-pie-charts");

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 animate-pulse h-[360px]">
            <div className="h-4 w-32 bg-slate-50 rounded mb-4" />
            <div className="h-52 bg-slate-50 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
        円グラフの読み込みに失敗しました
      </div>
    );
  }

  if (!data) return null;

  // ファネルデータ変換
  const funnelData = data.funnel.map((item) => ({
    name: item.label,
    value: item.count,
    color: FUNNEL_COLORS[item.label] || "#94A3B8",
  }));
  const funnelTotal = funnelData.reduce((sum, d) => sum + d.value, 0);
  const funnelDataWithPercent = funnelData.map(d => ({
    ...d,
    percent: funnelTotal > 0 ? d.value / funnelTotal : 0,
  }));

  // 処方データ変換
  const prescriptionData = [
    { name: "新規処方", value: data.prescription.newPrescription, color: PRESCRIPTION_COLORS[0] },
    { name: "再処方", value: data.prescription.rePrescription, color: PRESCRIPTION_COLORS[1] },
  ];
  const prescriptionTotal = prescriptionData.reduce((sum, d) => sum + d.value, 0);
  const prescriptionDataWithPercent = prescriptionData.map(d => ({
    ...d,
    percent: prescriptionTotal > 0 ? d.value / prescriptionTotal : 0,
  }));

  // 決済方法データ変換
  const paymentData = [
    { name: "クレジットカード", value: data.paymentMethod.creditCard, color: PAYMENT_COLORS[0] },
    { name: "銀行振込", value: data.paymentMethod.bankTransfer, color: PAYMENT_COLORS[1] },
  ];
  const paymentTotal = paymentData.reduce((sum, d) => sum + d.value, 0);
  const paymentDataWithPercent = paymentData.map(d => ({
    ...d,
    percent: paymentTotal > 0 ? d.value / paymentTotal : 0,
  }));
  const totalAmount = data.paymentMethod.creditCardAmount + data.paymentMethod.bankTransferAmount;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 1. 患者ファネル */}
      <PieChartCard
        title="患者ファネル"
        subtitle={`全${funnelTotal.toLocaleString()}人`}
        isEmpty={funnelTotal === 0}
      >
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={funnelDataWithPercent}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                labelLine={false}
                label={renderInnerLabel}
              >
                {funnelDataWithPercent.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="white" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ChartLegend items={funnelData} />
      </PieChartCard>

      {/* 2. 今月の新規処方 vs 再処方 */}
      <PieChartCard
        title="今月の処方内訳"
        subtitle={`合計${prescriptionTotal.toLocaleString()}人`}
        isEmpty={prescriptionTotal === 0}
      >
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={prescriptionDataWithPercent}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                labelLine={false}
                label={renderInnerLabel}
              >
                {prescriptionDataWithPercent.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="white" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ChartLegend items={prescriptionData} />
      </PieChartCard>

      {/* 3. 今月の決済方法内訳 */}
      <PieChartCard
        title="今月の決済方法"
        subtitle={`${paymentTotal.toLocaleString()}件 / ¥${totalAmount.toLocaleString()}`}
        isEmpty={paymentTotal === 0}
      >
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={paymentDataWithPercent}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                labelLine={false}
                label={renderInnerLabel}
              >
                {paymentDataWithPercent.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="white" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip content={<PaymentTooltip creditCardAmount={data.paymentMethod.creditCardAmount} bankTransferAmount={data.paymentMethod.bankTransferAmount} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ChartLegend items={paymentData} unit="件" />
      </PieChartCard>
    </div>
  );
}
